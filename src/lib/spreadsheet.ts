import ExcelJS from "exceljs";
import { TICKET_PRICE_EUR } from "./event";
import type { BookingRecord } from "./store";

function frenchDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The guest list, as a workbook. Shared so a sample cannot drift from the real export. */
export function buildWorkbook(bookings: BookingRecord[]): ExcelJS.Workbook {
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
    { header: "Envoi", key: "mode", width: 16 },
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

  // A total line, so the expected takings are visible without writing a formula.
  if (bookings.length > 0) {
    const total = sheet.addRow({
      ref: `${bookings.length} billet${bookings.length > 1 ? "s" : ""}`,
      amount: bookings.length * TICKET_PRICE_EUR,
    });
    total.font = { bold: true };
  }

  return workbook;
}
