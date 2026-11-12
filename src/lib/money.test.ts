import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it.each([
    [0, "€0.00"],
    [650, "€6.50"],
    [1490, "€14.90"],
    [123456, "€1,234.56"],
  ])("formats %i minor units as %s", (amount, expected) => {
    expect(formatMoney(amount)).toBe(expected);
  });
});
