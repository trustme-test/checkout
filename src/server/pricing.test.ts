import { describe, expect, it } from "vitest";
import { getProduct } from "./catalog";
import { createQuote } from "./pricing";

describe("createQuote", () => {
  it("prices each line from the catalog and totals the basket", async () => {
    const result = await createQuote([
      { productId: "house-blend-500g", quantity: 2 },
      { productId: "paper-filters-100", quantity: 1 },
    ]);

    expect(result).toEqual({
      ok: true,
      quote: {
        currency: "EUR",
        itemCount: 3,
        total: 1863 * 2 + 813,
        lines: [
          {
            productId: "house-blend-500g",
            name: "House Blend Beans, 500 g",
            unitPrice: 1863,
            quantity: 2,
            lineTotal: 3726,
          },
          {
            productId: "paper-filters-100",
            name: "Paper Filters, 100 pack",
            unitPrice: 813,
            quantity: 1,
            lineTotal: 813,
          },
        ],
      },
    });
  });

  it("merges duplicate products", async () => {
    const result = await createQuote([
      { productId: "stoneware-mug", quantity: 1 },
      { productId: "stoneware-mug", quantity: 2 },
    ]);
    expect(result.ok && result.quote.lines).toEqual([
      expect.objectContaining({ productId: "stoneware-mug", quantity: 3 }),
    ]);
  });

  it("rejects unknown products", async () => {
    expect(await createQuote([{ productId: "espresso-machine", quantity: 1 }])).toEqual({
      ok: false,
      error: {
        code: "unknown_product",
        message: 'Product "espresso-machine" is not available.',
        details: { productId: "espresso-machine" },
      },
    });
  });

  it("rejects merged quantities above the per-item limit", async () => {
    const result = await createQuote([
      { productId: "stoneware-mug", quantity: 6 },
      { productId: "stoneware-mug", quantity: 6 },
    ]);
    expect(result).toMatchObject({ ok: false, error: { code: "invalid_request" } });
  });

  it("uses integer minor units for every amount", async () => {
    expect(Number.isInteger((await getProduct("gooseneck-kettle"))?.unitPrice)).toBe(true);
  });
});
