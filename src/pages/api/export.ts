import type { APIRoute } from "astro";
import ExcelJS from "exceljs";
import { verifyExportKey } from "../../lib/booking";
import { TICKET_PRICE_EUR } from "../../lib/event";
import { listBookings, storeConfigured } from "../../lib/store";

export const prerender = false;

const PARIS = "Europe/Paris";

function frenchDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString("fr-FR", {
    timeZone: PARIS,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function plain(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export const GET: APIRoute = async ({ url }) => {
  if (!verifyExportKey(url.searchParams.get("k") || "")) {
    return plain("Lien invalide.", 403);
  }
  if (!storeConfigured()) {
    return plain(
      "Aucun espace de stockage n'est connecté au projet.\n" +
        "Vercel → Storage → Create Database → Blob → Connect Project, puis redéployer.",
      503,
    );
  }

  const bookings = await listBookings();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIGNATURE";
  const sheet = workbook.addWorksheet("Réservations", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Date du billet", key: "confirmedAt", width: 18 },
    { header: "Référence", key: "ref", width: 16 },
    { header: "Prénom", key: "firstName", width: 16 },
    { header: "Nom", key: "lastName", width: 18 },
    { header: "Email", key: "email", width: 32 },
    { header: "Téléphone", key: "phone", width: 18 },
    { header: "Montant (€)", key: "amount", width: 12 },
    { header: "CGV acceptées le", key: "createdAt", width: 18 },
    { header: "Envoi", key: "mode", width: 12 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: "A1", to: "I1" };

  for (const b of bookings) {
    sheet.addRow({
      confirmedAt: frenchDateTime(b.confirmedAt),
      ref: b.ref,
      firstName: b.firstName,
      lastName: b.lastName,
      email: b.email,
      phone: b.phone,
      amount: TICKET_PRICE_EUR,
      createdAt: frenchDateTime(b.createdAt),
      mode: b.mode === "auto" ? "automatique" : "après paiement",
    });
  }

  // A total line, so the expected takings are visible without a formula.
  if (bookings.length > 0) {
    const total = sheet.addRow({
      ref: `${bookings.length} billet${bookings.length > 1 ? "s" : ""}`,
      amount: bookings.length * TICKET_PRICE_EUR,
    });
    total.font = { bold: true };
  }

  const body = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="signature-reservations-${stamp}.xlsx"`,
      // Customer data: never cached by a proxy or the browser.
      "cache-control": "no-store, private",
    },
  });
};
