import type { CardInput } from "@/lib/card";

/** Well-known test card numbers (not real cards). See README.md#test-cards. */
export const TEST_CARDS = {
  visa: "4242424242424242",
  mastercard: "5555555555554444",
  amex: "378282246310005",
  declined: "4000000000000002",
  invalidChecksum: "4242424242424241",
} as const;

/** An expiry date in MM/YY format one year from now. */
export function futureExpiry(now: Date = new Date()): string {
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const year = String((now.getUTCFullYear() + 1) % 100).padStart(2, "0");
  return `${month}/${year}`;
}

export function validCardInput(overrides: Partial<CardInput> = {}): CardInput {
  return {
    name: "Alex Andersson",
    number: TEST_CARDS.visa,
    expiry: futureExpiry(),
    cvc: "123",
    ...overrides,
  };
}
