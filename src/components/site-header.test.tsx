import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { basketStore } from "@/lib/basket/basket-store";
import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  beforeEach(() => {
    basketStore.clear();
  });

  it("shows the test mode notice", () => {
    render(<SiteHeader />);
    expect(screen.getByText("Test mode: no real payments are processed.")).toBeInTheDocument();
  });

  it("links the brand name to the shop", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Fika Supply Co." })).toHaveAttribute("href", "/");
  });

  it("includes the basket link", () => {
    basketStore.add("stoneware-mug", 2);
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Basket, 2 items" })).toHaveAttribute(
      "href",
      "/checkout",
    );
  });
});
