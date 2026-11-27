import { describe, expect, it } from "vitest";
import { TEST_CARDS, validCardInput } from "@/test/fixtures";
import { placeOrder } from "./orders";

const NOW = new Date("2026-06-15T12:00:00Z");
const options = { now: NOW, createId: () => "11111111-2222-3333-4444-555555555555" };
const items = [{ productId: "ceramic-dripper", quantity: 1 }];
const card = validCardInput({ expiry: "12/27" });

describe("placeOrder", () => {
  it("confirms the order and only exposes the last four card digits", async () => {
    const result = await placeOrder({ items, card, expectedTotal: 3335 }, options);

    expect(result).toEqual({
      ok: true,
      order: {
        orderId: "ord_11111111222233334444",
        status: "confirmed",
        createdAt: "2026-06-15T12:00:00.000Z",
        currency: "EUR",
        itemCount: 1,
        total: 3335,
        lines: [expect.objectContaining({ productId: "ceramic-dripper", lineTotal: 3335 })],
        payment: { brand: "visa", last4: "4242" },
      },
    });
    expect(JSON.stringify(result)).not.toContain(TEST_CARDS.visa);
    expect(JSON.stringify(result)).not.toContain(card.cvc);
  });

  it("returns field errors for invalid card details", async () => {
    const result = await placeOrder(
      { items, card: { ...card, number: TEST_CARDS.invalidChecksum }, expectedTotal: 3335 },
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

  it("refuses to charge when the confirmed total no longer matches", async () => {
    const result = await placeOrder({ items, card, expectedTotal: 100 }, options);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "price_changed", details: { quote: { total: 3335 } } },
    });
  });

  it("passes on pricing errors", async () => {
    const result = await placeOrder(
      { items: [{ productId: "nope", quantity: 1 }], card, expectedTotal: 0 },
      options,
    );
    expect(result).toMatchObject({ ok: false, error: { code: "unknown_product" } });
  });

  it("declines the declined test card", async () => {
    const result = await placeOrder(
      { items, card: { ...card, number: TEST_CARDS.declined }, expectedTotal: 3335 },
      options,
    );
    expect(result).toMatchObject({ ok: false, error: { code: "card_declined" } });
  });
});
