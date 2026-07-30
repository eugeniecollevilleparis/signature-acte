import type { APIRoute } from "astro";
import { sendAdminNewSubscriber, sendSubscriberWelcome } from "../../lib/mailer";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, message: "Invalid request." }, 400);
  }

  // Honeypot — see /api/book.
  if (typeof raw.company === "string" && raw.company.trim() !== "") {
    return json({ ok: true });
  }

  const email = String(raw.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 120) {
    return json({ ok: false, message: "This email address does not look valid." }, 422);
  }

  try {
    await sendAdminNewSubscriber(email);
    await sendSubscriberWelcome(email);
    return json({ ok: true });
  } catch (err) {
    console.error("[subscribe] failed:", err instanceof Error ? err.message : err);
    return json({ ok: false, message: "Subscription failed. Please try again." }, 500);
  }
};
