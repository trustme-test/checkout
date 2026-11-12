import { describe, expect, it } from "vitest";
import { getProduct } from "./catalog";
import { createQuote } from "./pricing";

describe("createQuote", () => {
  it("prices each line from the catalog and totals the basket", () => {
    const result = createQuote([
      { productId: "house-blend-500g", quantity: 2 },
      { productId: "paper-filters-100", quantity: 1 },
    ]);

    expect(result).toEqual({
      ok: true,
      quote: {
        currency: "EUR",
        itemCount: 3,
        total: 1490 * 2 + 650,
        lines: [
          {
            productId: "house-blend-500g",
            name: "House Blend Beans, 500 g",
            unitPrice: 1490,
            quantity: 2,
            lineTotal: 2980,
          },
          {
            productId: "paper-filters-100",
            name: "Paper Filters, 100 pack",
            unitPrice: 650,
            quantity: 1,
            lineTotal: 650,
          },
        ],
      },
    });
  });

  it("merges duplicate products", () => {
    const result = createQuote([
      { productId: "stoneware-mug", quantity: 1 },
      { productId: "stoneware-mug", quantity: 2 },
    ]);
    expect(result.ok && result.quote.lines).toEqual([
      expect.objectContaining({ productId: "stoneware-mug", quantity: 3 }),
    ]);
  });

  it("rejects unknown products", () => {
    expect(createQuote([{ productId: "espresso-machine", quantity: 1 }])).toEqual({
      ok: false,
      error: {
        code: "unknown_product",
        message: 'Product "espresso-machine" is not available.',
        details: { productId: "espresso-machine" },
      },
    });
  });

  it("rejects merged quantities above the per-item limit", () => {
    const result = createQuote([
      { productId: "stoneware-mug", quantity: 6 },
      { productId: "stoneware-mug", quantity: 6 },
    ]);
    expect(result).toMatchObject({ ok: false, error: { code: "invalid_request" } });
  });

  it("uses integer minor units for every amount", () => {
    expect(Number.isInteger(getProduct("gooseneck-kettle")?.unitPrice)).toBe(true);
  });
});
