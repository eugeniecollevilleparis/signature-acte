import type { APIRoute } from "astro";
import { encodeToken, parseBooking } from "../../lib/booking";
import { env } from "../../lib/env";
import { sendAdminNewBooking, sendBookingReceived, sendTicket, siteUrl } from "../../lib/mailer";
import { recordBooking } from "../../lib/store";

export const prerender = false;

const CHECKOUT_URL =
  env("REVOLUT_CHECKOUT_URL") ||
  "https://checkout.revolut.com/pay/21c1321f-7a6c-4bdc-b428-009a7880dfe8";

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

    // TICKET_ON_BOOKING trades the payment check for zero manual work: the
    // ticket goes out on submission, so nobody has to click for each guest.
    // The ticket email then doubles as the welcome — sending both would just
    // put two emails in the guest's inbox at once.
    const immediate = env("TICKET_ON_BOOKING") === "true";

    // The alert to signatureacte@gmail.com is the one that must not be lost —
    // it is the only record of the booking. Send it first.
    await sendAdminNewBooking(booking, confirmUrl, immediate);

    if (immediate) {
      await sendTicket(booking, true);
      // The ticket is out, so the booking counts as confirmed — file it.
      await recordBooking(booking, "auto");
    } else {
      // Not yet confirmed: it is filed by /api/ticket, once the payment has
      // been checked and the ticket actually sent.
      await sendBookingReceived(booking);
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
