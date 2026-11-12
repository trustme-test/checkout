import type { Currency } from "./types";

export const CURRENCY: Currency = "EUR";

const LOCALE = "en-IE";

const formatters = new Map<Currency, Intl.NumberFormat>();

/**
 * Formats an amount in minor units (cents) for display, e.g. 1490 -> "€14.90".
 * Always use this instead of formatting numbers by hand.
 */
export function formatMoney(amount: number, currency: Currency = CURRENCY): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency });
    formatters.set(currency, formatter);
  }
  return formatter.format(amount / 100);
}
