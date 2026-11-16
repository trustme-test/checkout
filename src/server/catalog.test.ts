import { describe, expect, it } from "vitest";
import { getProduct, listProducts } from "./catalog";

describe("catalog", () => {
  it.each([
    "coca-cola-330ml",
    "fanta-330ml",
    "root-beer-355ml",
    "beer-330ml",
    "birra-tirana-330ml",
    "birra-korca-330ml",
    "boza-330ml",
    "semla",
  ])("offers %s", async (id) => {
    expect((await getProduct(id))?.unitPrice).toBeGreaterThan(0);
  });

  it("prices every product as a positive integer number of cents", async () => {
    for (const product of await listProducts()) {
      expect(Number.isInteger(product.unitPrice), product.id).toBe(true);
      expect(product.unitPrice, product.id).toBeGreaterThan(0);
    }
  });

  it("has unique product ids", async () => {
    const ids = (await listProducts()).map((product) => product.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
