import { describe, expect, it } from "vitest";
import { TEST_CARDS, validCardInput } from "@/test/fixtures";
import { validateCard } from "@/lib/card";
import { authorizePayment, DECLINED_TEST_CARD_NUMBER } from "./payments";

const NOW = new Date("2026-06-15T12:00:00Z");

function validCard(number: string) {
  const result = validateCard(validCardInput({ number }), NOW);
  if (!result.ok) throw new Error("test card fixture must be valid");
  return result.card;
}

describe("authorizePayment", () => {
  it("approves a valid card with an authorization id from the injected generator", () => {
    const result = authorizePayment(
      { card: validCard(TEST_CARDS.visa), amount: 1200, currency: "EUR" },
      () => "abc",
    );
    expect(result).toEqual({ status: "approved", authorizationId: "auth_abc" });
  });

  it("generates a random authorization id by default", () => {
    const request = {
      card: validCard(TEST_CARDS.mastercard),
      amount: 500,
      currency: "EUR" as const,
    };
    const first = authorizePayment(request);
    const second = authorizePayment(request);

    expect(first.status).toBe("approved");
    expect(first).not.toEqual(second);
    if (first.status === "approved") {
      expect(first.authorizationId).toMatch(/^auth_[0-9a-f-]{36}$/);
    }
  });

  it("declines the documented test card that is always declined", () => {
    expect(DECLINED_TEST_CARD_NUMBER).toBe(TEST_CARDS.declined);
    const result = authorizePayment({
      card: validCard(TEST_CARDS.declined),
      amount: 500,
      currency: "EUR",
    });
    expect(result).toEqual({ status: "declined", reason: "card_declined" });
  });
});
