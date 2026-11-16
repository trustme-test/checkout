import { describe, expect, it } from "vitest";
import { validateCard } from "@/lib/card";
import { futureExpiry, TEST_CARDS, validCardInput } from "@/test/fixtures";
import { authorizePayment, DECLINED_TEST_CARD_NUMBER } from "./payments";

function validCard(number: string) {
  const result = validateCard(validCardInput({ number, expiry: futureExpiry() }));
  if (!result.ok) throw new Error(`Test card ${number} should be valid`);
  return result.card;
}

describe("authorizePayment", () => {
  const request = { card: validCard(TEST_CARDS.visa), amount: 1850, currency: "EUR" as const };

  it("approves a valid card with an authorization id", () => {
    const result = authorizePayment(request, () => "fixed-id");
    expect(result).toEqual({ status: "approved", authorizationId: "auth_fixed-id" });
  });

  it("generates a unique authorization id when none is injected", () => {
    const first = authorizePayment(request);
    const second = authorizePayment(request);
    expect(first.status).toBe("approved");
    expect(second.status).toBe("approved");
    if (first.status === "approved" && second.status === "approved") {
      expect(first.authorizationId).toMatch(/^auth_/);
      expect(first.authorizationId).not.toBe(second.authorizationId);
    }
  });

  it("declines the documented always-declined test card", () => {
    const declined = { ...request, card: validCard(DECLINED_TEST_CARD_NUMBER) };
    expect(authorizePayment(declined, () => "unused")).toEqual({
      status: "declined",
      reason: "card_declined",
    });
  });
});
