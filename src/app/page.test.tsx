import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { basketStore } from "@/lib/basket/basket-store";
import { SEED_PRODUCTS } from "@/server/catalog-seed";
import ShopPage from "./page";

describe("ShopPage", () => {
  beforeEach(() => {
    basketStore.clear();
  });

  it("lists every product and an empty basket", async () => {
    render(await ShopPage());

    expect(screen.getByRole("heading", { name: "Shop" })).toBeInTheDocument();
    for (const product of SEED_PRODUCTS) {
      expect(screen.getByText(product.name)).toBeInTheDocument();
    }
    expect(screen.getByText("Your basket is empty.")).toBeInTheDocument();
  });
});
