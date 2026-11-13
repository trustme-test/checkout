import { describe, expect, it } from "vitest";
import type { ValidCard } from "@/lib/card";
import { DECLINED_TEST_CARD_NUMBER, authorizePayment } from "./payments";

function card(number: string): ValidCard {
  return {
    name: "Alex Andersson",
    number,
    brand: "visa",
    last4: number.slice(-4),
    expiryMonth: 12,
    expiryYear: 2030,
    cvc: "123",
  };
}

describe("authorizePayment", () => {
  it("approves a valid card and prefixes the generated id", () => {
    const result = authorizePayment(
      { card: card("4242424242424242"), amount: 3700, currency: "EUR" },
      () => "abc123",
    );
    expect(result).toEqual({ status: "approved", authorizationId: "auth_abc123" });
  });

  it("declines the documented test card with card_declined", () => {
    const result = authorizePayment({
      card: card(DECLINED_TEST_CARD_NUMBER),
      amount: 3700,
      currency: "EUR",
    });
    expect(result).toEqual({ status: "declined", reason: "card_declined" });
  });

  it("does not call the id generator when the card is declined", () => {
    let calls = 0;
    authorizePayment(
      { card: card(DECLINED_TEST_CARD_NUMBER), amount: 100, currency: "EUR" },
      () => {
        calls += 1;
        return "unused";
      },
    );
    expect(calls).toBe(0);
  });

  it("uses a random UUID-based id by default", () => {
    const result = authorizePayment({
      card: card("5555555555554444"),
      amount: 100,
      currency: "EUR",
    });
    expect(result).toMatchObject({
      status: "approved",
      authorizationId: expect.stringMatching(/^auth_[0-9a-f-]{36}$/),
    });
  });
});
