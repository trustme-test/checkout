import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { basketStore } from "@/lib/basket/basket-store";
import { BasketLink } from "./basket-link";

describe("BasketLink", () => {
  beforeEach(() => {
    basketStore.clear();
  });

  it("links to the checkout page", () => {
    render(<BasketLink />);
    expect(screen.getByRole("link", { name: "Basket, 0 items" })).toHaveAttribute(
      "href",
      "/checkout",
    );
  });

  it("announces an empty basket", () => {
    render(<BasketLink />);
    expect(screen.getByRole("link", { name: "Basket, 0 items" })).toBeInTheDocument();
  });

  it("uses the singular for one item", () => {
    basketStore.add("stoneware-mug", 1);
    render(<BasketLink />);
    expect(screen.getByRole("link", { name: "Basket, 1 item" })).toBeInTheDocument();
  });

  it("counts every unit across all lines", () => {
    basketStore.add("stoneware-mug", 2);
    basketStore.add("hand-grinder", 3);
    render(<BasketLink />);

    const link = screen.getByRole("link", { name: "Basket, 5 items" });
    expect(link).toHaveTextContent("5");
  });

  it("shows a placeholder count until the basket has loaded", () => {
    basketStore.add("stoneware-mug", 2);
    const html = renderToStaticMarkup(<BasketLink />);

    expect(html).toContain('aria-label="Basket"');
    expect(html).toContain("–");
    expect(html).not.toContain("Basket, 2 items");
  });
});
