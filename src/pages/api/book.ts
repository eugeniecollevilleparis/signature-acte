import type { APIRoute } from "astro";
import { encodeToken, parseBooking } from "../../lib/booking";
import { env } from "../../lib/env";
import { sendAdminNewBooking, sendBookingReceived, sendTicket, siteUrl } from "../../lib/mailer";

export const prerender = false;

const CHECKOUT_URL =
  env("REVOLUT_CHECKOUT_URL") ||
  "https://checkout.revolut.com/pay/17f7aafa-d660-4d70-a061-4509a5d6298d";

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

  // Honeypot: a real guest never fills a field they cannot see.
  // Answer 200 so a bot has nothing to learn from the response.
  if (typeof raw.company === "string" && raw.company.trim() !== "") {
    return json({ ok: true, ref: "", checkoutUrl: CHECKOUT_URL });
  }

  const parsed = parseBooking(raw);
  if (!parsed.ok) {
    return json({ ok: false, errors: parsed.errors }, 422);
  }
  const { booking } = parsed;

  try {
    const confirmUrl = `${siteUrl()}/api/ticket?t=${encodeURIComponent(encodeToken(booking))}`;

    // The alert to signatureacte@gmail.com is the one that must not be lost —
    // it is the only record of the booking. Send it first.
    await sendAdminNewBooking(booking, confirmUrl);
    await sendBookingReceived(booking);

    // Opt-in escape hatch: issue the ticket without waiting for the payment
    // to be checked. Off by default — see README.
    if (env("TICKET_ON_BOOKING") === "true") {
      await sendTicket(booking);
    }

    return json({ ok: true, ref: booking.ref, checkoutUrl: CHECKOUT_URL });
  } catch (err) {
    // Never log the guest's details, only the failure itself.
    console.error("[book] failed to send booking emails:", err instanceof Error ? err.message : err);
    return json(
      {
        ok: false,
        message:
          "We could not record your request. Please try again, or write to us at signatureacte@gmail.com.",
      },
      500,
    );
  }
};
