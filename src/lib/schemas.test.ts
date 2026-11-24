import { describe, expect, it } from "vitest";
import {
  MAX_BASKET_LINES,
  MAX_QUANTITY_PER_ITEM,
  orderRequestSchema,
  quoteRequestSchema,
} from "./schemas";

const validItem = { productId: "stoneware-mug", quantity: 1 };
const validCard = { name: "Alex", number: "4242424242424242", expiry: "12/30", cvc: "123" };

describe("quoteRequestSchema", () => {
  it("accepts a basket with one valid item", () => {
    expect(quoteRequestSchema.safeParse({ items: [validItem] }).success).toBe(true);
  });

  it("rejects an empty basket", () => {
    const result = quoteRequestSchema.safeParse({ items: [] });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Basket must contain at least one item.");
  });

  it("rejects quantities below 1, above the limit, or non-integers", () => {
    for (const quantity of [0, MAX_QUANTITY_PER_ITEM + 1, 1.5]) {
      expect(quoteRequestSchema.safeParse({ items: [{ ...validItem, quantity }] }).success).toBe(
        false,
      );
    }
  });

  it("accepts the maximum quantity per item", () => {
    const item = { ...validItem, quantity: MAX_QUANTITY_PER_ITEM };
    expect(quoteRequestSchema.safeParse({ items: [item] }).success).toBe(true);
  });

  it("rejects an empty product id", () => {
    expect(quoteRequestSchema.safeParse({ items: [{ ...validItem, productId: "" }] }).success).toBe(
      false,
    );
  });

  it("rejects more than the maximum number of basket lines", () => {
    const items = Array.from({ length: MAX_BASKET_LINES + 1 }, (_, i) => ({
      productId: `p-${i}`,
      quantity: 1,
    }));
    expect(quoteRequestSchema.safeParse({ items }).success).toBe(false);
  });
});

describe("orderRequestSchema", () => {
  const valid = { items: [validItem], card: validCard, expectedTotal: 1850 };

  it("accepts a complete order request", () => {
    expect(orderRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("requires expectedTotal to be a non-negative integer in minor units", () => {
    expect(orderRequestSchema.safeParse({ ...valid, expectedTotal: -1 }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...valid, expectedTotal: 18.5 }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...valid, expectedTotal: 0 }).success).toBe(true);
  });

  it("rejects card fields that exceed their length limits", () => {
    const card = { ...validCard, number: "4".repeat(41) };
    expect(orderRequestSchema.safeParse({ ...valid, card }).success).toBe(false);
  });

  it("requires the card object", () => {
    expect(orderRequestSchema.safeParse({ items: valid.items, expectedTotal: 1850 }).success).toBe(
      false,
    );
  });
});
