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
