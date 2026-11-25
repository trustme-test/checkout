import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { basketStore } from "@/lib/basket/basket-store";
import { MAX_QUANTITY_PER_ITEM } from "@/lib/schemas";
import type { Product } from "@/lib/types";
import { BasketSummary } from "./basket-summary";

const mug: Product = {
  id: "stoneware-mug",
  name: "Stoneware Mug, 300 ml",
  description: "Speckled stoneware mug.",
  unitPrice: 1850,
  emoji: "☕",
};

const grinder: Product = {
  id: "hand-grinder",
  name: "Hand Grinder",
  description: "Burr grinder for coffee.",
  unitPrice: 4500,
  emoji: "⚙️",
};

const products = [mug, grinder];

describe("BasketSummary", () => {
  beforeEach(() => {
    basketStore.clear();
  });

  it("shows a loading message until the saved basket can be read", () => {
    basketStore.add("stoneware-mug");

    // Server rendering has no access to localStorage, so the basket is not ready yet.
    const html = renderToString(<BasketSummary products={products} />);

    expect(html).toContain("Loading basket…");
    expect(html).not.toContain("Your basket is empty.");
  });

  it("shows an empty message when the basket has no items", () => {
    render(<BasketSummary products={products} />);

    expect(screen.getByRole("heading", { name: "Your basket" })).toBeInTheDocument();
    expect(screen.getByText("Your basket is empty.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Go to checkout" })).not.toBeInTheDocument();
  });

  it("lists each basket line with its line total and the subtotal", () => {
    basketStore.add(mug.id, 2);
    basketStore.add(grinder.id, 1);
    render(<BasketSummary products={products} />);

    const lines = screen.getAllByRole("listitem");
    expect(lines).toHaveLength(2);
    expect(within(lines[0]).getByText(mug.name)).toBeInTheDocument();
    expect(screen.getByText("€37.00")).toBeInTheDocument();
    expect(screen.getByText("€45.00")).toBeInTheDocument();
    expect(screen.getByText("€82.00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to checkout" })).toHaveAttribute(
      "href",
      "/checkout",
    );
  });

  it("ignores basket items whose product is not in the catalog", () => {
    basketStore.add("discontinued-kettle", 3);
    basketStore.add(mug.id, 1);
    render(<BasketSummary products={products} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText(mug.name)).toBeInTheDocument();
    expect(screen.queryByText(/discontinued/i)).not.toBeInTheDocument();
  });

  it("increases and decreases the quantity of a line", async () => {
    const user = userEvent.setup();
    basketStore.add(mug.id, 2);
    render(<BasketSummary products={products} />);

    await user.click(screen.getByRole("button", { name: `Increase quantity of ${mug.name}` }));
    expect(basketStore.getSnapshot()).toEqual([{ productId: mug.id, quantity: 3 }]);

    await user.click(screen.getByRole("button", { name: `Decrease quantity of ${mug.name}` }));
    await user.click(screen.getByRole("button", { name: `Decrease quantity of ${mug.name}` }));
    expect(basketStore.getSnapshot()).toEqual([{ productId: mug.id, quantity: 1 }]);
  });

  it("disables increasing once the per-item limit is reached", () => {
    basketStore.add(mug.id, MAX_QUANTITY_PER_ITEM);
    render(<BasketSummary products={products} />);

    expect(screen.getByRole("button", { name: `Increase quantity of ${mug.name}` })).toBeDisabled();
  });

  it("removes a line from the basket", async () => {
    const user = userEvent.setup();
    basketStore.add(mug.id, 1);
    basketStore.add(grinder.id, 1);
    render(<BasketSummary products={products} />);

    await user.click(screen.getByRole("button", { name: `Remove ${mug.name} from basket` }));

    expect(basketStore.getSnapshot()).toEqual([{ productId: grinder.id, quantity: 1 }]);
    expect(screen.queryByText(mug.name)).not.toBeInTheDocument();
  });

  it("shows the empty message after the last line is removed", async () => {
    const user = userEvent.setup();
    basketStore.add(mug.id, 1);
    render(<BasketSummary products={products} />);

    await user.click(screen.getByRole("button", { name: `Remove ${mug.name} from basket` }));

    expect(screen.getByText("Your basket is empty.")).toBeInTheDocument();
  });
});
