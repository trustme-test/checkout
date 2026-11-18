import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { basketStore } from "@/lib/basket/basket-store";
import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  beforeEach(() => {
    basketStore.clear();
  });

  it("announces that the site runs in test mode", () => {
    render(<SiteHeader />);
    expect(screen.getByText("Test mode: no real payments are processed.")).toBeInTheDocument();
  });

  it("links the brand name to the shop", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Fika Supply Co." })).toHaveAttribute("href", "/");
  });

  it("shows the basket link with the current item count", () => {
    basketStore.add("stoneware-mug", 3);
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Basket, 3 items" })).toHaveAttribute(
      "href",
      "/checkout",
    );
  });
});
