import { describe, expect, it } from "vitest";
import { validCardInput } from "@/test/fixtures";
import {
  MAX_BASKET_LINES,
  MAX_QUANTITY_PER_ITEM,
  orderRequestSchema,
  quoteRequestSchema,
} from "./schemas";

describe("quoteRequestSchema", () => {
  it("accepts a basket within the limits", () => {
    const result = quoteRequestSchema.safeParse({
      items: [{ productId: "stoneware-mug", quantity: MAX_QUANTITY_PER_ITEM }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty basket", () => {
    const result = quoteRequestSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Basket must contain at least one item.");
  });

  it("rejects quantities above the per-item limit", () => {
    const result = quoteRequestSchema.safeParse({
      items: [{ productId: "stoneware-mug", quantity: MAX_QUANTITY_PER_ITEM + 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero, negative and fractional quantities", () => {
    for (const quantity of [0, -1, 1.5]) {
      const result = quoteRequestSchema.safeParse({
        items: [{ productId: "stoneware-mug", quantity }],
      });
      expect(result.success, `quantity ${quantity}`).toBe(false);
    }
  });

  it("rejects an empty product id", () => {
    const result = quoteRequestSchema.safeParse({ items: [{ productId: "", quantity: 1 }] });
    expect(result.success).toBe(false);
  });

  it("rejects more basket lines than the maximum", () => {
    const items = Array.from({ length: MAX_BASKET_LINES + 1 }, (_, index) => ({
      productId: `product-${index}`,
      quantity: 1,
    }));
    expect(quoteRequestSchema.safeParse({ items }).success).toBe(false);
  });
});

describe("orderRequestSchema", () => {
  const validOrder = {
    items: [{ productId: "stoneware-mug", quantity: 1 }],
    card: validCardInput(),
    expectedTotal: 1850,
  };

  it("accepts a complete order", () => {
    expect(orderRequestSchema.safeParse(validOrder).success).toBe(true);
  });

  it("requires expectedTotal to be a non-negative integer of minor units", () => {
    expect(orderRequestSchema.safeParse({ ...validOrder, expectedTotal: -1 }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...validOrder, expectedTotal: 18.5 }).success).toBe(
      false,
    );
    expect(orderRequestSchema.safeParse({ ...validOrder, expectedTotal: 0 }).success).toBe(true);
  });

  it("limits the length of card fields", () => {
    const result = orderRequestSchema.safeParse({
      ...validOrder,
      card: { ...validOrder.card, number: "4".repeat(41) },
    });
    expect(result.success).toBe(false);
  });

  it("requires the card object", () => {
    const result = orderRequestSchema.safeParse({
      items: validOrder.items,
      expectedTotal: validOrder.expectedTotal,
    });
    expect(result.success).toBe(false);
  });
});
