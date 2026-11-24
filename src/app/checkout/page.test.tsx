import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { basketStore } from "@/lib/basket/basket-store";
import CheckoutPage, { metadata } from "./page";

describe("CheckoutPage", () => {
  beforeEach(() => {
    basketStore.clear();
  });

  it("has a checkout title", () => {
    expect(metadata.title).toBe("Checkout");
  });

  it("renders the checkout flow", () => {
    render(<CheckoutPage />);

    expect(screen.getByRole("heading", { name: "Checkout" })).toBeInTheDocument();
    expect(screen.getByText("Your basket is empty.")).toBeInTheDocument();
  });
});
