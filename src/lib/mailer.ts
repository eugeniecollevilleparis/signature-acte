import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { fullName, qrPayload, type Booking } from "./booking";
import { env } from "./env";
import { TICKET_PRICE, TICKET_PRICE_FR, WINE_PRICE } from "./event";

// Guest-facing copy is English, like the site. Only the emails to Eugénie and
// Tanguy — and the terms of sale, a French legal document — are in French.
const EVENT = "SIGNATURE No. 01";
const EVENT_DATES = "26 – 27 September 2026";
const EVENT_VENUE = "Château Laffitte Carcasset · Saint-Estèphe";

export function siteUrl(): string {
  return (env("PUBLIC_SITE_URL") || "https://signatureacte.com").replace(/\/$/, "");
}

/** Everyone who should be told about a booking or a new subscriber. */
export function adminRecipients(): string[] {
  const raw = env("ADMIN_EMAILS") || "signatureacte@gmail.com";
  return raw.split(",").map((e) => e.trim()).filter(Boolean);
}

function transport() {
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  if (!user || !pass) {
    throw new Error("SMTP_USER / SMTP_PASS are not configured.");
  }
  const port = Number(env("SMTP_PORT") || 465);
  return nodemailer.createTransport({
    host: env("SMTP_HOST") || "smtp.gmail.com",
    port,
    // 465 is implicit TLS; 587 and friends negotiate it with STARTTLS.
    secure: port === 465,
    auth: { user, pass },
  });
}

function from(): string {
  return `"SIGNATURE" <${env("SMTP_USER")}>`;
}

/** Escapes text before it goes into an HTML email body. */
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Shared shell. Table-based and fully inline-styled, because that is the only
 * thing every mail client agrees on.
 */
function shell(inner: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<!-- The site's typefaces. Gmail ignores web fonts and falls back to Georgia /
     Arial, which is why every stack below still names them. -->
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#0a0707;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0707;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#12100e;border:1px solid rgba(240,233,221,0.16);">
        <tr><td style="padding:34px 34px 0;text-align:center;">
          <p style="margin:0;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:6px;color:#f0e9dd;">SIGNATURE</p>
          <p style="margin:8px 0 0;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,233,221,0.55);">No. 01 &nbsp;·&nbsp; By invitation only</p>
        </td></tr>
        <tr><td style="padding:28px 34px 34px;">${inner}</td></tr>
        <tr><td style="padding:0 34px 30px;border-top:1px solid rgba(240,233,221,0.12);">
          <p style="margin:18px 0 0;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:rgba(240,233,221,0.45);">
            ${esc(EVENT_VENUE)}<br>${esc(EVENT_DATES)}<br>
            <a href="${siteUrl()}/conditions-generales" style="color:rgba(240,233,221,0.75);">Terms of sale</a>
            &nbsp;·&nbsp;
            <a href="${siteUrl()}" style="color:rgba(240,233,221,0.75);">signatureacte.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const h1 = `margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:#f0e9dd;font-weight:normal;`;
const p = `margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:15px;line-height:1.65;color:rgba(240,233,221,0.86);`;
const label = `margin:0 0 6px;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(240,233,221,0.5);`;
const btn = `display:inline-block;padding:14px 26px;border:1px solid rgba(240,233,221,0.55);color:#f0e9dd;text-decoration:none;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;`;

/* ------------------------------------------------------------------ guests */

/**
 * Sent the moment the form is submitted — before any money has moved.
 * Doubles as the welcome email for ticket buyers.
 */
export async function sendBookingReceived(booking: Booking): Promise<void> {
  const html = shell(`
    <h1 style="${h1}">Welcome, ${esc(booking.firstName)}.</h1>
    <p style="${p}">Your request for a place at <em>${esc(EVENT)}</em> has reached us.</p>
    <p style="${p}">One step remains: your payment of <strong style="color:#f0e9dd;">${esc(TICKET_PRICE)}</strong>. As soon as it is confirmed, we will send your ticket and its QR code, to be presented at the gates of the château.</p>
    <p style="${label}">Your reference</p>
    <p style="margin:0 0 22px;font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;letter-spacing:2px;color:#f0e9dd;">${esc(booking.ref)}</p>
    <p style="${p}">An allergy, a particular diet, a question about your stay? Simply reply to this email.</p>
    <p style="${p}">We look forward to welcoming you to the Médoc.</p>`);

  await transport().sendMail({
    from: from(),
    to: booking.email,
    subject: `Welcome — your request for ${EVENT}`,
    html,
    text:
      `Welcome, ${booking.firstName}.\n\n` +
      `Your request for a place at ${EVENT} has reached us.\n` +
      `One step remains: your payment of ${TICKET_PRICE}. As soon as it is confirmed, we will send your ticket and its QR code.\n\n` +
      `Reference: ${booking.ref}\n\n` +
      `${EVENT_VENUE}\n${EVENT_DATES}\n\n` +
      `Terms of sale: ${siteUrl()}/conditions-generales`,
  });
}

/**
 * The actual ticket.
 *
 * `welcome` is set when it goes out on booking rather than after a payment
 * check — it then has to greet the guest and carry the practical lines that
 * would otherwise live in the separate welcome email.
 */
export async function sendTicket(booking: Booking, welcome = false): Promise<void> {
  const png = await QRCode.toBuffer(qrPayload(booking), {
    type: "png",
    width: 640,
    margin: 2,
    color: { dark: "#0a0707", light: "#f0e9dd" },
    errorCorrectionLevel: "M",
  });

  const html = shell(`
    <h1 style="${h1}">${welcome ? `Welcome, ${esc(booking.firstName)}.` : "Your ticket"}</h1>
    <p style="${p}">${
      welcome
        ? `Your place at <em>${esc(EVENT)}</em> is reserved, and your ticket is below.`
        : `It is confirmed, ${esc(booking.firstName)}: your place at <em>${esc(EVENT)}</em> is reserved.`
    }</p>
    <p style="${p}">Present this QR code on arrival, on your phone or printed.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:22px 0;">
      <tr><td align="center" style="background:#f0e9dd;padding:22px;">
        <img src="cid:ticket-qr" width="240" height="240" alt="Ticket QR code ${esc(booking.ref)}" style="display:block;width:240px;height:240px;">
        <p style="margin:14px 0 0;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#0a0707;">${esc(booking.ref)}</p>
      </td></tr>
    </table>
    <p style="${label}">In the name of</p>
    <p style="margin:0 0 18px;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:#f0e9dd;">${esc(fullName(booking))}</p>
    <p style="${label}">When</p>
    <p style="margin:0 0 18px;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:rgba(240,233,221,0.86);">${esc(EVENT_DATES)}, from 6 PM</p>
    <p style="${label}">Where</p>
    <p style="margin:0 0 22px;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:rgba(240,233,221,0.86);">${esc(EVENT_VENUE)}</p>
    <p style="${p}">This ticket is personal. It admits one guest and may only be passed on after letting us know.</p>
    <p style="${p}">It covers admission, the tasting menu, the DJ set and the performances. The estate wine pairing (${esc(WINE_PRICE)}) and the brunch are separate tickets — we will write to you about both.</p>
    <p style="${p}">By reserving, you accepted our <a href="${siteUrl()}/conditions-generales" style="color:#f0e9dd;">terms of sale</a>. Do read them again before you travel — they set out the cancellation terms.</p>
    ${welcome ? `<p style="${p}">An allergy, a particular diet, a question about your stay? Simply reply to this email.</p><p style="${p}">We look forward to welcoming you to the Médoc.</p>` : ""}`);

  await transport().sendMail({
    from: from(),
    to: booking.email,
    subject: welcome ? `Welcome — your ticket for ${EVENT}` : `Your ticket — ${EVENT} · ${booking.ref}`,
    html,
    text:
      `It is confirmed, ${booking.firstName}.\n\n` +
      `Ticket ${booking.ref} in the name of ${fullName(booking)}.\n` +
      `${EVENT_DATES}, from 6 PM\n${EVENT_VENUE}\n\n` +
      `The QR code is in the HTML version of this email.\n\n` +
      `Covers admission, the tasting menu, the DJ set and the performances. The estate wine pairing (${WINE_PRICE}) and the brunch are separate tickets.\n\n` +
      `Terms of sale: ${siteUrl()}/conditions-generales`,
    attachments: [{ filename: `ticket-${booking.ref}.png`, content: png, cid: "ticket-qr" }],
  });
}

/** Welcome email for someone who only subscribed to the newsletter. */
export async function sendSubscriberWelcome(email: string): Promise<void> {
  const html = shell(`
    <h1 style="${h1}">Welcome.</h1>
    <p style="${p}">You are on our list. We write rarely: the dates, the editions to come, and what is taking shape behind them.</p>
    <p style="${p}"><em>${esc(EVENT)}</em> takes place on ${esc(EVENT_DATES)} at ${esc(EVENT_VENUE)}.</p>
    <p style="margin:26px 0 0;"><a href="${siteUrl()}" style="${btn}">Discover the evening</a></p>`);

  await transport().sendMail({
    from: from(),
    to: email,
    subject: "Welcome to SIGNATURE",
    html,
    text:
      `Welcome.\n\nYou are on our list.\n\n` +
      `${EVENT} — ${EVENT_DATES}\n${EVENT_VENUE}\n\n${siteUrl()}`,
  });
}

/* ------------------------------------------------------------------ admins */

/** Booking alert to signatureacte@gmail.com, with the one-click confirm link. */
export async function sendAdminNewBooking(
  booking: Booking,
  confirmUrl: string,
  ticketAlreadySent = false,
): Promise<void> {
  const row = (k: string, v: string) =>
    `<tr>
       <td style="padding:7px 0;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,233,221,0.5);width:130px;vertical-align:top;">${esc(k)}</td>
       <td style="padding:7px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#f0e9dd;">${v}</td>
     </tr>`;

  const html = shell(`
    <h1 style="${h1}">Nouvelle réservation</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
      ${row("Nom", esc(fullName(booking)))}
      ${row("Email", `<a href="mailto:${esc(booking.email)}" style="color:#f0e9dd;">${esc(booking.email)}</a>`)}
      ${row("Téléphone", `<a href="tel:${esc(booking.phone.replace(/[^0-9+]/g, ""))}" style="color:#f0e9dd;">${esc(booking.phone)}</a>`)}
      ${row("Référence", esc(booking.ref))}
      ${row("Montant dû", esc(TICKET_PRICE_FR))}
      ${row("CGV", `Acceptées le ${new Date(booking.createdAt * 1000).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} — réservation ferme et non remboursable`)}
    </table>
    ${
      ticketAlreadySent
        ? `<p style="${p}"><strong>Son billet et son QR code lui ont déjà été envoyés automatiquement.</strong> Rien à faire de votre côté.</p>
    <p style="${p}">Pensez tout de même à vérifier que les ${esc(TICKET_PRICE_FR)} sont bien arrivés sur le compte Revolut : l'envoi n'attend pas le paiement.</p>
    <p style="margin:22px 0 0;"><a href="${confirmUrl}" style="${btn}">Renvoyer le billet</a></p>
    <p style="margin:16px 0 0;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:rgba(240,233,221,0.45);">À utiliser seulement si l'email s'est perdu. Le lien reste valable 120 jours.</p>`
        : `<p style="${p}">Cette personne a été redirigée vers le paiement Revolut. <strong>Elle n'a pas encore reçu son billet.</strong></p>
    <p style="${p}">Vérifiez que le règlement est bien arrivé sur le compte, puis envoyez le billet :</p>
    <p style="margin:22px 0 0;"><a href="${confirmUrl}" style="${btn}">Paiement reçu — envoyer le billet</a></p>
    <p style="margin:16px 0 0;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:rgba(240,233,221,0.45);">Ne cliquez qu'après avoir vu le paiement. Le lien reste valable 120 jours.</p>`
    }`);

  await transport().sendMail({
    from: from(),
    to: adminRecipients(),
    replyTo: booking.email,
    subject: `Réservation — ${fullName(booking)} · ${booking.ref}`,
    html,
    text:
      `Nouvelle réservation\n\n` +
      `Nom : ${fullName(booking)}\nEmail : ${booking.email}\nTéléphone : ${booking.phone}\n` +
      `Référence : ${booking.ref}\nMontant dû : ${TICKET_PRICE_FR}\n` +
      `CGV acceptées (réservation ferme et non remboursable)\n\n` +
      (ticketAlreadySent
        ? `Le billet a déjà été envoyé automatiquement. Vérifiez que les ${TICKET_PRICE_FR} sont bien arrivés sur Revolut.\nPour le renvoyer si besoin :\n${confirmUrl}`
        : `Le billet n'a PAS encore été envoyé. Après vérification du paiement Revolut :\n${confirmUrl}`),
  });
}

export async function sendAdminNewSubscriber(email: string): Promise<void> {
  const html = shell(`
    <h1 style="${h1}">Nouvel abonné</h1>
    <p style="${p}"><a href="mailto:${esc(email)}" style="color:#f0e9dd;">${esc(email)}</a> s'est inscrit·e à la newsletter.</p>
    <p style="${p}">L'email de bienvenue lui a été envoyé automatiquement.</p>`);

  await transport().sendMail({
    from: from(),
    to: adminRecipients(),
    replyTo: email,
    subject: `Newsletter — ${email}`,
    html,
    text: `Nouvel abonné newsletter : ${email}\nL'email de bienvenue lui a été envoyé automatiquement.`,
  });
}
