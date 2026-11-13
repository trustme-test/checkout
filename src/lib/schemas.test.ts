import { describe, expect, it } from "vitest";
import {
  MAX_BASKET_LINES,
  MAX_QUANTITY_PER_ITEM,
  basketItemSchema,
  basketItemsSchema,
  orderRequestSchema,
  quoteRequestSchema,
} from "./schemas";

const validCard = { name: "Alex", number: "4242424242424242", expiry: "12/30", cvc: "123" };

describe("basketItemSchema", () => {
  it("accepts a product id with a whole quantity in range", () => {
    expect(basketItemSchema.parse({ productId: "stoneware-mug", quantity: 1 })).toEqual({
      productId: "stoneware-mug",
      quantity: 1,
    });
  });

  it.each([
    ["an empty product id", { productId: "", quantity: 1 }],
    ["a product id longer than 64 characters", { productId: "x".repeat(65), quantity: 1 }],
    ["zero quantity", { productId: "a", quantity: 0 }],
    [
      "a quantity above the per-item limit",
      { productId: "a", quantity: MAX_QUANTITY_PER_ITEM + 1 },
    ],
    ["a fractional quantity", { productId: "a", quantity: 1.5 }],
  ])("rejects %s", (_label, input) => {
    expect(basketItemSchema.safeParse(input).success).toBe(false);
  });
});

describe("basketItemsSchema", () => {
  it("allows up to MAX_BASKET_LINES lines and rejects more", () => {
    const line = { productId: "a", quantity: 1 };
    expect(basketItemsSchema.safeParse(Array(MAX_BASKET_LINES).fill(line)).success).toBe(true);
    expect(basketItemsSchema.safeParse(Array(MAX_BASKET_LINES + 1).fill(line)).success).toBe(false);
  });
});

describe("quoteRequestSchema", () => {
  it("requires at least one item", () => {
    const result = quoteRequestSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Basket must contain at least one item.");
    }
  });

  it("accepts a non-empty basket", () => {
    expect(quoteRequestSchema.safeParse({ items: [{ productId: "a", quantity: 2 }] }).success).toBe(
      true,
    );
  });
});

describe("orderRequestSchema", () => {
  const base = { items: [{ productId: "a", quantity: 1 }], card: validCard, expectedTotal: 1850 };

  it("accepts a complete order request", () => {
    expect(orderRequestSchema.parse(base)).toEqual(base);
  });

  it("rejects a negative or fractional expected total", () => {
    expect(orderRequestSchema.safeParse({ ...base, expectedTotal: -1 }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...base, expectedTotal: 10.5 }).success).toBe(false);
  });

  it("rejects card fields that exceed their length limits", () => {
    const card = { ...validCard, name: "n".repeat(201) };
    expect(orderRequestSchema.safeParse({ ...base, card }).success).toBe(false);
  });

  it("rejects a missing card", () => {
    const withoutCard = { items: base.items, expectedTotal: base.expectedTotal };
    expect(orderRequestSchema.safeParse(withoutCard).success).toBe(false);
  });
});
