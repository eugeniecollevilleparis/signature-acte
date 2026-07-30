import type { APIRoute } from "astro";
import { verifyExportKey } from "../../lib/booking";
import { buildWorkbook } from "../../lib/spreadsheet";
import { listBookings, storeConfigured } from "../../lib/store";

export const prerender = false;

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

  // The check above only proves a store could exist. Reading is what proves it
  // is connected and authorised.
  let bookings;
  try {
    bookings = await listBookings();
  } catch (err) {
    console.error("[export] store unreachable:", err instanceof Error ? err.message : err);
    return plain(
      "Le magasin de réservations est injoignable.\n" +
        "Vérifiez que le store Blob est bien connecté au projet dans Vercel → Storage → Projects,\n" +
        "puis redéployez.",
      503,
    );
  }

  const body = await buildWorkbook(bookings).xlsx.writeBuffer();
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
