import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/** A guest's booking request, exactly the fields the form collects. */
export interface Booking {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Booking reference shown to the guest and printed on the ticket. */
  ref: string;
  /** Unix seconds. */
  createdAt: number;
}

export interface FieldErrors {
  [field: string]: string;
}

const MAX_LEN = 120;
// Deliberately permissive: the email is validated properly by actually sending
// to it, and over-strict patterns reject real addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Digits, spaces and the usual separators; 8–20 digits once stripped.
const PHONE_RE = /^[0-9+\s().-]{8,25}$/;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/**
 * Validates and normalises raw form input.
 * Returns the booking, or the per-field errors to show back on the form.
 */
export function parseBooking(
  raw: Record<string, unknown>,
): { ok: true; booking: Booking } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const firstName = clean(raw.firstName);
  const lastName = clean(raw.lastName);
  const email = clean(raw.email).toLowerCase();
  const phone = clean(raw.phone);

  if (firstName.length < 2 || firstName.length > MAX_LEN) {
    errors.firstName = "Please enter your first name.";
  }
  if (lastName.length < 2 || lastName.length > MAX_LEN) {
    errors.lastName = "Please enter your last name.";
  }
  if (!EMAIL_RE.test(email) || email.length > MAX_LEN) {
    errors.email = "This email address does not look valid.";
  }
  if (!PHONE_RE.test(phone) || (phone.match(/\d/g) || []).length < 8) {
    errors.phone = "Please enter a phone number we can reach you on.";
  }
  if (raw.terms !== "on" && raw.terms !== true && raw.terms !== "true") {
    errors.terms = "Please accept the terms of sale.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    booking: { firstName, lastName, email, phone, ref: newRef(), createdAt: Math.floor(Date.now() / 1000) },
  };
}

/** Human-friendly, unambiguous reference — no O/0/I/1 confusion when read aloud. */
export function newRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `SIG01-${out.slice(0, 3)}-${out.slice(3)}`;
}

export function fullName(b: Pick<Booking, "firstName" | "lastName">): string {
  return `${b.firstName} ${b.lastName}`;
}

function secret(): string {
  const s = env("BOOKING_SECRET");
  // Fail closed. A missing secret must never degrade to unsigned tokens.
  if (!s || s.length < 24) {
    throw new Error("BOOKING_SECRET is missing or too short (needs 24+ characters).");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Packs a booking into a signed, self-contained token.
 *
 * This is what lets the whole flow run without a database: the token in the
 * "confirm payment" link carries the booking, and its signature proves we
 * issued it. Tokens expire so an old link can't mint a ticket months later.
 */
export function encodeToken(booking: Booking): string {
  const body = Buffer.from(JSON.stringify(booking)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeToken(token: string, maxAgeDays = 120): Booking | null {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  if (!safeEqual(sig, sign(body))) return null;

  let booking: Booking;
  try {
    booking = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!booking?.ref || !booking?.email) return null;

  const ageDays = (Date.now() / 1000 - booking.createdAt) / 86400;
  if (!Number.isFinite(ageDays) || ageDays > maxAgeDays || ageDays < -1) return null;

  return booking;
}

/**
 * The string embedded in the ticket QR code.
 * Signed, so a scanned code can be told apart from one someone made up.
 */
export function qrPayload(booking: Booking): string {
  const base = `SIGNATURE01|${booking.ref}|${fullName(booking)}`;
  return `${base}|${sign(base).slice(0, 16)}`;
}

/**
 * The key that unlocks the spreadsheet export.
 *
 * Derived from BOOKING_SECRET so there is no extra variable to configure, and
 * so rotating the secret revokes any link that was shared around.
 */
export function exportKey(): string {
  return sign("export-v1").slice(0, 32);
}

export function verifyExportKey(candidate: string): boolean {
  return safeEqual(String(candidate || ""), exportKey());
}

export function verifyQrPayload(scanned: string): { valid: boolean; ref?: string; name?: string } {
  const parts = String(scanned || "").split("|");
  if (parts.length !== 4) return { valid: false };
  const [tag, ref, name, sig] = parts;
  if (tag !== "SIGNATURE01") return { valid: false };
  if (!safeEqual(sig, sign(`${tag}|${ref}|${name}`).slice(0, 16))) return { valid: false };
  return { valid: true, ref, name };
}
