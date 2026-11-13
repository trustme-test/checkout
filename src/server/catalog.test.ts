import { describe, expect, it } from "vitest";
import { getProduct, listProducts } from "./catalog";

describe("catalog", () => {
  it.each(["coca-cola-330ml", "fanta-330ml", "root-beer-355ml", "beer-330ml"])(
    "offers %s",
    (id) => {
      expect(getProduct(id)?.unitPrice).toBeGreaterThan(0);
    },
  );

  it("has unique product ids", () => {
    const ids = listProducts().map((product) => product.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
