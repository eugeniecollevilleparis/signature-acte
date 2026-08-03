/**
 * Event facts that appear in several places at once — the invitation card, the
 * booking dialog, the emails, the terms of sale and the spreadsheet.
 *
 * The site quotes euros. The Revolut checkout debits pounds — the link behind
 * `REVOLUT_CHECKOUT_URL` is a fixed £174 — so the amount actually taken has to
 * appear next to the euro price, or the guest is quoted one figure and charged
 * another. `TICKET_CHARGED` exists for that line.
 *
 * Changing a price here without changing the matching Revolut link leaves the
 * site advertising one amount and the guest paying another.
 */

/** Symbol of the currency the site quotes in. */
export const CURRENCY = "€";

export const TICKET_PRICE_AMOUNT = 200;

/** Guest-facing, English, like the site. */
export const TICKET_PRICE = `${CURRENCY}${TICKET_PRICE_AMOUNT} per person`;

/** French, for the plaquette, the terms of sale and the emails. */
export const TICKET_PRICE_FR = `${TICKET_PRICE_AMOUNT} ${CURRENCY} par personne`;

/** What the Revolut link actually debits, for the small print beside the price. */
export const TICKET_CHARGED = "£174";

/**
 * The estate wines are a separate ticket, sold later by newsletter — they are
 * NOT part of the entry price. Unlimited from arrival through dinner; the bar
 * after dinner is not covered. The menu names a wine against several courses,
 * so anywhere a wine is named has to say so, or guests will assume it is
 * included.
 */
export const WINE_PRICE_AMOUNT = 50;
export const WINE_PRICE = `${CURRENCY}${WINE_PRICE_AMOUNT} per person`;
export const WINE_PRICE_FR = `${WINE_PRICE_AMOUNT} ${CURRENCY} par personne`;
