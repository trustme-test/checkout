import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { basketStore } from "@/lib/basket/basket-store";
import CheckoutPage from "./page";

describe("CheckoutPage", () => {
  beforeEach(() => {
    basketStore.clear();
  });

  it("renders the checkout for the saved basket", async () => {
    render(<CheckoutPage />);

    expect(screen.getByRole("heading", { name: "Checkout", level: 1 })).toBeInTheDocument();
    expect(await screen.findByText("Your basket is empty.")).toBeInTheDocument();
  });
});
