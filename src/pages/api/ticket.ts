import type { APIRoute } from "astro";
import { decodeToken, fullName } from "../../lib/booking";
import { sendTicket } from "../../lib/mailer";

export const prerender = false;

/** Minimal styled page — this is only ever seen by Eugénie and Tanguy. */
function page(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · SIGNATURE</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#0a0707;color:#f0e9dd;font-family:Georgia,'Times New Roman',serif;padding:24px;}
  .card{max-width:32rem;text-align:center;border:1px solid rgba(240,233,221,.18);padding:40px 32px;}
  h1{font-weight:400;font-size:1.6rem;margin:0 0 14px;}
  p{font-size:1rem;line-height:1.6;color:rgba(240,233,221,.82);margin:0 0 10px;}
  .k{font-family:Arial,Helvetica,sans-serif;font-size:.62rem;letter-spacing:.3em;
     text-transform:uppercase;color:rgba(240,233,221,.5);margin-bottom:18px;}
</style></head><body><div class="card"><p class="k">Signature No. 01</p>${body}</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const GET: APIRoute = async ({ url }) => {
  const booking = decodeToken(url.searchParams.get("t") || "");
  if (!booking) {
    return page(
      "Lien invalide",
      `<h1>Lien invalide ou expiré</h1><p>Ce lien de confirmation n'est pas valable. Vérifiez que vous avez ouvert le lien le plus récent, ou renvoyez le billet à la main.</p>`,
      400,
    );
  }

  try {
    await sendTicket(booking);
    return page(
      "Billet envoyé",
      `<h1>Billet envoyé</h1>
       <p><strong>${fullName(booking)}</strong> vient de recevoir son billet et son QR code à l'adresse ${booking.email}.</p>
       <p>Référence ${booking.ref}.</p>
       <p style="margin-top:18px;font-size:.85rem;color:rgba(240,233,221,.55);">Rouvrir ce lien renverra le même billet — pratique si l'email s'est perdu.</p>`,
    );
  } catch (err) {
    console.error("[ticket] failed to send:", err instanceof Error ? err.message : err);
    return page(
      "Envoi impossible",
      `<h1>L'envoi a échoué</h1><p>Le billet de ${fullName(booking)} n'a pas pu partir. Réessayez dans un instant en rouvrant ce lien.</p>`,
      500,
    );
  }
};
