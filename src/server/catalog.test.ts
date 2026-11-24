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
    "gummy-bears-150g",
    "dark-chocolate-bar-100g",
    "sour-worms-150g",
    "salted-caramels-120g",
    "peppermint-drops-100g",
  ])("offers %s", async (id) => {
    expect((await getProduct(id))?.unitPrice).toBeGreaterThan(0);
  });

  it("has unique product ids", async () => {
    const ids = (await listProducts()).map((product) => product.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
