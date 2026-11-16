import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OrderConfirmation } from "@/lib/types";
import { PurchaseComplete } from "./purchase-complete";

const order: OrderConfirmation = {
  orderId: "ord_0123456789abcdef0123",
  status: "confirmed",
  createdAt: "2026-11-16T12:00:00.000Z",
  currency: "EUR",
  itemCount: 1,
  total: 1850,
  lines: [
    {
      productId: "stoneware-mug",
      name: "Stoneware Mug, 300 ml",
      unitPrice: 1850,
      quantity: 1,
      lineTotal: 1850,
    },
  ],
  payment: { brand: "mastercard", last4: "4444" },
};

describe("PurchaseComplete", () => {
  it("confirms the payment with total, card brand and last four digits", () => {
    render(<PurchaseComplete order={order} />);

    expect(screen.getByRole("heading", { name: "Purchase done!" })).toBeInTheDocument();
    expect(screen.getByText(/was approved/).querySelector("strong")).toHaveTextContent("€18.50");
    expect(screen.getByText(/Mastercard ending in 4444 was approved/)).toBeInTheDocument();
  });

  it("shows the order number and the order summary", () => {
    render(<PurchaseComplete order={order} />);

    expect(screen.getByText(order.orderId)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Order summary" })).toBeInTheDocument();
  });

  it("links back to the shop", () => {
    render(<PurchaseComplete order={order} />);

    expect(screen.getByRole("link", { name: "Continue shopping" })).toHaveAttribute("href", "/");
  });

  it("uses a generic label for unknown card brands", () => {
    render(<PurchaseComplete order={{ ...order, payment: { brand: "unknown", last4: "0001" } }} />);

    expect(screen.getByText(/Card ending in 0001 was approved/)).toBeInTheDocument();
  });
});
