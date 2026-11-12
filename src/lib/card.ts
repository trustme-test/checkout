import type { CardBrand } from "./types";

/**
 * Card details validation, shared by the checkout form (instant feedback) and
 * the orders API (authoritative check). Pure functions only: no I/O.
 *
 * Never log or persist card numbers or CVCs.
 */

export type CardInput = {
  name: string;
  number: string;
  expiry: string;
  cvc: string;
};

export type CardField = keyof CardInput;

export type CardErrors = Partial<Record<CardField, string>>;

export type ValidCard = {
  name: string;
  /** Digits only. */
  number: string;
  brand: CardBrand;
  last4: string;
  expiryMonth: number;
  /** Four-digit year. */
  expiryYear: number;
  cvc: string;
};

export type CardValidationResult =
  { ok: true; card: ValidCard } | { ok: false; errors: CardErrors };

const MIN_CARD_DIGITS = 12;
const MAX_CARD_DIGITS = 19;
const MAX_YEARS_AHEAD = 20;

export function normalizeCardNumber(value: string): string {
  return value.replace(/[\s-]/g, "");
}

/** Groups digits in blocks of four as the user types, e.g. "4242424" -> "4242 424". */
export function formatCardNumberInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, MAX_CARD_DIGITS);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function passesLuhnCheck(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function detectCardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return "unknown";
}

/** Parses "MM/YY", "MM / YY" or "MM/YYYY". Returns null when malformed. */
export function parseExpiry(value: string): { month: number; year: number } | null {
  const match = /^\s*(\d{1,2})\s*\/\s*(\d{2}|\d{4})\s*$/.exec(value);
  if (!match) return null;
  const month = Number(match[1]);
  const rawYear = match[2];
  const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
  if (month < 1 || month > 12) return null;
  return { month, year };
}

export function validateCard(input: CardInput, now: Date = new Date()): CardValidationResult {
  const errors: CardErrors = {};

  const name = input.name.trim();
  if (name.length < 2) {
    errors.name = "Enter the name shown on the card.";
  } else if (name.length > 100) {
    errors.name = "Name must be 100 characters or fewer.";
  }

  const number = normalizeCardNumber(input.number);
  const brand = detectCardBrand(number);
  if (!/^\d+$/.test(number)) {
    errors.number = "Enter a card number using digits only.";
  } else if (number.length < MIN_CARD_DIGITS || number.length > MAX_CARD_DIGITS) {
    errors.number = "Card number must be between 12 and 19 digits.";
  } else if (!passesLuhnCheck(number)) {
    errors.number = "Card number is not valid.";
  }

  const expiry = parseExpiry(input.expiry);
  if (!expiry) {
    errors.expiry = "Enter the expiry date as MM/YY.";
  } else {
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;
    const expired =
      expiry.year < currentYear || (expiry.year === currentYear && expiry.month < currentMonth);
    if (expired) {
      errors.expiry = "This card has expired.";
    } else if (expiry.year > currentYear + MAX_YEARS_AHEAD) {
      errors.expiry = "Expiry date is too far in the future.";
    }
  }

  const cvc = input.cvc.trim();
  const cvcLength = brand === "amex" ? 4 : 3;
  if (!new RegExp(`^\\d{${cvcLength}}$`).test(cvc)) {
    errors.cvc = `Security code must be ${cvcLength} digits.`;
  }

  if (Object.keys(errors).length > 0 || !expiry) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    card: {
      name,
      number,
      brand,
      last4: number.slice(-4),
      expiryMonth: expiry.month,
      expiryYear: expiry.year,
      cvc,
    },
  };
}
