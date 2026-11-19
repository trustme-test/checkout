import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { basketStore } from "@/lib/basket/basket-store";
import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("warns that the shop runs in test mode", () => {
    render(<SiteHeader />);
    expect(screen.getByText("Test mode: no real payments are processed.")).toBeInTheDocument();
  });

  it("links the brand name to the shop page", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Fika Supply Co." })).toHaveAttribute("href", "/");
  });

  it("shows the basket link", () => {
    basketStore.clear();
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Basket, 0 items" })).toHaveAttribute(
      "href",
      "/checkout",
    );
  });
});
