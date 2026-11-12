import { describe, expect, it } from "vitest";
import { TEST_CARDS, validCardInput } from "@/test/fixtures";
import { placeOrder } from "./orders";

const NOW = new Date("2026-06-15T12:00:00Z");
const options = { now: NOW, createId: () => "11111111-2222-3333-4444-555555555555" };
const items = [{ productId: "ceramic-dripper", quantity: 1 }];
const card = validCardInput({ expiry: "12/27" });

describe("placeOrder", () => {
  it("confirms the order and only exposes the last four card digits", () => {
    const result = placeOrder({ items, card, expectedTotal: 2900 }, options);

    expect(result).toEqual({
      ok: true,
      order: {
        orderId: "ord_11111111222233334444",
        status: "confirmed",
        createdAt: "2026-06-15T12:00:00.000Z",
        currency: "EUR",
        itemCount: 1,
        total: 2900,
        lines: [expect.objectContaining({ productId: "ceramic-dripper", lineTotal: 2900 })],
        payment: { brand: "visa", last4: "4242" },
      },
    });
    expect(JSON.stringify(result)).not.toContain(TEST_CARDS.visa);
    expect(JSON.stringify(result)).not.toContain(card.cvc);
  });

  it("returns field errors for invalid card details", () => {
    const result = placeOrder(
      { items, card: { ...card, number: TEST_CARDS.invalidChecksum }, expectedTotal: 2900 },
      options,
    );
    expect(result).toEqual({
      ok: false,
      error: {
        code: "invalid_card",
        message: "Some card details are not valid.",
        details: { fields: { number: "Card number is not valid." } },
      },
    });
  });

  it("refuses to charge when the confirmed total no longer matches", () => {
    const result = placeOrder({ items, card, expectedTotal: 100 }, options);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "price_changed", details: { quote: { total: 2900 } } },
    });
  });

  it("passes on pricing errors", () => {
    const result = placeOrder(
      { items: [{ productId: "nope", quantity: 1 }], card, expectedTotal: 0 },
      options,
    );
    expect(result).toMatchObject({ ok: false, error: { code: "unknown_product" } });
  });

  it("declines the declined test card", () => {
    const result = placeOrder(
      { items, card: { ...card, number: TEST_CARDS.declined }, expectedTotal: 2900 },
      options,
    );
    expect(result).toMatchObject({ ok: false, error: { code: "card_declined" } });
  });
});
