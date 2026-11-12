import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { basketStore } from "@/lib/basket/basket-store";
import { MAX_QUANTITY_PER_ITEM } from "@/lib/schemas";
import type { Product } from "@/lib/types";
import { ProductCard } from "./product-card";

const product: Product = {
  id: "stoneware-mug",
  name: "Stoneware Mug, 300 ml",
  description: "Speckled stoneware mug.",
  unitPrice: 1850,
  emoji: "☕",
};

describe("ProductCard", () => {
  beforeEach(() => {
    basketStore.clear();
  });

  it("shows the product and its price", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByRole("heading", { name: product.name })).toBeInTheDocument();
    expect(screen.getByText("€18.50")).toBeInTheDocument();
  });

  it("adds the product to the basket", async () => {
    const user = userEvent.setup();
    render(<ProductCard product={product} />);

    await user.click(screen.getByRole("button", { name: `Add ${product.name} to basket` }));
    await user.click(screen.getByRole("button", { name: `Add ${product.name} to basket` }));

    expect(basketStore.getSnapshot()).toEqual([{ productId: product.id, quantity: 2 }]);
    expect(screen.getByText("2 in basket")).toBeInTheDocument();
  });

  it("disables adding once the per-item limit is reached", () => {
    basketStore.add(product.id, MAX_QUANTITY_PER_ITEM);
    render(<ProductCard product={product} />);

    expect(screen.getByRole("button", { name: `Add ${product.name} to basket` })).toBeDisabled();
  });
});
