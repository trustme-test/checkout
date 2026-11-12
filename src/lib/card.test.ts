import { describe, expect, it } from "vitest";
import { TEST_CARDS, validCardInput } from "@/test/fixtures";
import {
  detectCardBrand,
  formatCardNumberInput,
  normalizeCardNumber,
  parseExpiry,
  passesLuhnCheck,
  validateCard,
} from "./card";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("passesLuhnCheck", () => {
  it("accepts valid test card numbers", () => {
    expect(passesLuhnCheck(TEST_CARDS.visa)).toBe(true);
    expect(passesLuhnCheck(TEST_CARDS.mastercard)).toBe(true);
    expect(passesLuhnCheck(TEST_CARDS.amex)).toBe(true);
  });

  it("rejects a number with a bad checksum or non-digits", () => {
    expect(passesLuhnCheck(TEST_CARDS.invalidChecksum)).toBe(false);
    expect(passesLuhnCheck("4242abcd")).toBe(false);
    expect(passesLuhnCheck("")).toBe(false);
  });
});

describe("detectCardBrand", () => {
  it.each([
    [TEST_CARDS.visa, "visa"],
    [TEST_CARDS.mastercard, "mastercard"],
    [TEST_CARDS.amex, "amex"],
    ["6011000990139424", "unknown"],
  ])("detects the brand of %s", (number, brand) => {
    expect(detectCardBrand(number)).toBe(brand);
  });
});

describe("card number formatting", () => {
  it("removes spaces and dashes", () => {
    expect(normalizeCardNumber(" 4242 4242-42 ")).toBe("4242424242");
  });

  it("groups digits in blocks of four and drops non-digits", () => {
    expect(formatCardNumberInput("4242x42424")).toBe("4242 4242 4");
    expect(formatCardNumberInput("1".repeat(25))).toHaveLength(19 + 4);
  });
});

describe("parseExpiry", () => {
  it.each([
    ["08/27", { month: 8, year: 2027 }],
    ["8/27", { month: 8, year: 2027 }],
    [" 08 / 2027 ", { month: 8, year: 2027 }],
  ])("parses %j", (value, expected) => {
    expect(parseExpiry(value)).toEqual(expected);
  });

  it.each(["", "13/27", "00/27", "0827", "08-27", "ab/cd"])("rejects %j", (value) => {
    expect(parseExpiry(value)).toBeNull();
  });
});

describe("validateCard", () => {
  it("returns the normalized card when every field is valid", () => {
    const result = validateCard(
      validCardInput({ name: "  Alex Andersson ", number: "4242 4242 4242 4242", expiry: "12/27" }),
      NOW,
    );
    expect(result).toEqual({
      ok: true,
      card: {
        name: "Alex Andersson",
        number: TEST_CARDS.visa,
        brand: "visa",
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2027,
        cvc: "123",
      },
    });
  });

  it("reports an error per invalid field", () => {
    const result = validateCard({ name: "", number: "1234", expiry: "99/99", cvc: "1" }, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["cvc", "expiry", "name", "number"]);
  });

  it("rejects a number that fails the checksum", () => {
    const result = validateCard(validCardInput({ number: TEST_CARDS.invalidChecksum }), NOW);
    expect(result).toMatchObject({ ok: false, errors: { number: "Card number is not valid." } });
  });

  it("accepts a card that expires this month and rejects one that expired last month", () => {
    expect(validateCard(validCardInput({ expiry: "06/26" }), NOW).ok).toBe(true);
    expect(validateCard(validCardInput({ expiry: "05/26" }), NOW)).toMatchObject({
      ok: false,
      errors: { expiry: "This card has expired." },
    });
  });

  it("rejects an expiry date more than 20 years ahead", () => {
    expect(validateCard(validCardInput({ expiry: "01/47" }), NOW)).toMatchObject({
      ok: false,
      errors: { expiry: "Expiry date is too far in the future." },
    });
  });

  it("requires a 4-digit security code for American Express", () => {
    const amex = validCardInput({ number: TEST_CARDS.amex, cvc: "123" });
    expect(validateCard(amex, NOW)).toMatchObject({
      ok: false,
      errors: { cvc: expect.any(String) },
    });
    expect(validateCard({ ...amex, cvc: "1234" }, NOW).ok).toBe(true);
  });
});
