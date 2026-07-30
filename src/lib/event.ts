/**
 * Event facts that appear in several places at once — the invitation card, the
 * booking dialog, the emails and the terms of sale.
 *
 * The price also lives inside the Revolut payment link. Changing it here does
 * NOT change what a guest is actually charged: update the Revolut link too.
 */
export const TICKET_PRICE_EUR = 200;

/** Guest-facing, English, like the site. */
export const TICKET_PRICE = `€${TICKET_PRICE_EUR} per person`;

/** French, for the terms of sale and the emails to Eugénie and Tanguy. */
export const TICKET_PRICE_FR = `${TICKET_PRICE_EUR} € TTC par personne`;

/**
 * The estate wine pairing is a separate ticket, sold later by newsletter — it
 * is NOT part of the €200. The menu lists the pairing for each course, so
 * anywhere a wine is named has to say so, or guests will assume it is covered.
 */
export const WINE_PRICE_EUR = 50;
export const WINE_PRICE = `€${WINE_PRICE_EUR} per person`;
export const WINE_PRICE_FR = `${WINE_PRICE_EUR} € TTC par personne`;
