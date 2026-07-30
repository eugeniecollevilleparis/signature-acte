/**
 * Event facts that appear in several places at once — the invitation card, the
 * booking dialog, the emails, the terms of sale and the spreadsheet.
 *
 * These figures describe what the Revolut links charge; they do not set it.
 * Changing a price here without changing the matching Revolut link leaves the
 * site advertising one amount and the guest paying another.
 */

/** Symbol of the currency the Revolut links actually charge in. */
export const CURRENCY = "£";

export const TICKET_PRICE_AMOUNT = 174;

/** Guest-facing, English, like the site. */
export const TICKET_PRICE = `${CURRENCY}${TICKET_PRICE_AMOUNT} per person`;

/** French, for the terms of sale and the emails to Eugénie and Tanguy. */
export const TICKET_PRICE_FR = `${TICKET_PRICE_AMOUNT} ${CURRENCY} par personne`;

/**
 * The estate wine pairing is a separate ticket, sold later by newsletter — it
 * is NOT part of the entry price. The menu lists the pairing for each course,
 * so anywhere a wine is named has to say so, or guests will assume it is
 * covered.
 */
export const WINE_PRICE_AMOUNT = 45;
export const WINE_PRICE = `${CURRENCY}${WINE_PRICE_AMOUNT} per person`;
export const WINE_PRICE_FR = `${WINE_PRICE_AMOUNT} ${CURRENCY} par personne`;
