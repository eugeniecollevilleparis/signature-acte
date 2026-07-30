import { get, list, put } from "@vercel/blob";
import type { Booking } from "./booking";

/**
 * Where confirmed bookings are kept.
 *
 * One file per booking rather than a single growing list: two guests booking
 * at the same moment would otherwise read the same list, each append their own
 * row, and the second write would erase the first.
 *
 * Blobs are private — the store token is the only way in. Customer names,
 * emails and phone numbers must never sit behind a merely unguessable URL.
 */
const PREFIX = "bookings/";

export interface BookingRecord extends Booking {
  /** Unix seconds — when the ticket was actually issued. */
  confirmedAt: number;
  /** "auto" = issued on booking; "manual" = issued after a payment check. */
  mode: "auto" | "manual";
}

/**
 * Whether a store is reachable at all.
 *
 * A connected project authenticates through OIDC, so BLOB_READ_WRITE_TOKEN is
 * often absent on Vercel even though the store works perfectly. Requiring the
 * token would silently drop every booking. Off Vercel — local development —
 * the token is the only way in, so it is still what we look for there.
 */
export function storeConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL === "1";
}

/**
 * Files a confirmed booking.
 *
 * Never throws: losing the spreadsheet row is regrettable, failing to send
 * someone the ticket they paid for is not. Callers stay unaware.
 */
export async function recordBooking(booking: Booking, mode: BookingRecord["mode"]): Promise<void> {
  if (!storeConfigured()) return;

  const record: BookingRecord = { ...booking, confirmedAt: Math.floor(Date.now() / 1000), mode };
  try {
    await put(`${PREFIX}${booking.ref}.json`, JSON.stringify(record), {
      access: "private",
      addRandomSuffix: false,
      // Re-sending a ticket rewrites the same row rather than erroring.
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch (err) {
    console.error("[store] could not record booking:", err instanceof Error ? err.message : err);
  }
}

/** Every confirmed booking, oldest first. */
export async function listBookings(): Promise<BookingRecord[]> {
  if (!storeConfigured()) return [];

  const records: BookingRecord[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const found = await get(blob.pathname, { access: "private" });
      if (!found?.stream) continue;
      try {
        records.push(JSON.parse(await new Response(found.stream).text()));
      } catch {
        // A single unreadable file must not sink the whole export.
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return records.sort((a, b) => a.confirmedAt - b.confirmedAt);
}
