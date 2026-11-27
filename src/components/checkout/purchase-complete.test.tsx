import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CardBrand, OrderConfirmation } from "@/lib/types";
import { PurchaseComplete } from "./purchase-complete";

function order(brand: CardBrand, last4 = "4242"): OrderConfirmation {
  return {
    orderId: "ord_123",
    status: "confirmed",
    createdAt: "2026-11-27T10:00:00.000Z",
    currency: "EUR",
    lines: [
      {
        productId: "stoneware-mug",
        name: "Stoneware Mug, 300 ml",
        unitPrice: 1850,
        quantity: 1,
        lineTotal: 1850,
      },
    ],
    itemCount: 1,
    total: 1850,
    payment: { brand, last4 },
  };
}

describe("PurchaseComplete", () => {
  it("confirms the payment with the total, card and order number", () => {
    render(<PurchaseComplete order={order("visa")} />);

    expect(screen.getByRole("heading", { name: "Purchase done!" })).toBeInTheDocument();
    expect(screen.getByText("€18.50", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/Visa ending in 4242 was approved/)).toBeInTheDocument();
    expect(screen.getByText("ord_123")).toBeInTheDocument();
  });

  it.each([
    ["visa", "Visa"],
    ["mastercard", "Mastercard"],
    ["amex", "American Express"],
    ["unknown", "Card"],
  ] as const)("labels a %s card as %s", (brand, label) => {
    render(<PurchaseComplete order={order(brand)} />);
    expect(screen.getByText(new RegExp(`${label} ending in 4242`))).toBeInTheDocument();
  });

  it("includes the order summary and a link back to the shop", () => {
    render(<PurchaseComplete order={order("visa")} />);

    expect(screen.getByRole("heading", { name: "Order summary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue shopping" })).toHaveAttribute("href", "/");
  });
});
