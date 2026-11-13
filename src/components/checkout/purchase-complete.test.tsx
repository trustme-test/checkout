import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OrderConfirmation } from "@/lib/types";
import { PurchaseComplete } from "./purchase-complete";

const order: OrderConfirmation = {
  orderId: "ord_0123456789abcdef0123",
  status: "confirmed",
  createdAt: "2030-01-01T10:00:00.000Z",
  currency: "EUR",
  lines: [
    {
      productId: "stoneware-mug",
      name: "Stoneware Mug, 300 ml",
      unitPrice: 1850,
      quantity: 2,
      lineTotal: 3700,
    },
  ],
  itemCount: 2,
  total: 3700,
  payment: { brand: "mastercard", last4: "4444" },
};

describe("PurchaseComplete", () => {
  it("confirms the payment with total, card brand and last four digits", () => {
    render(<PurchaseComplete order={order} />);

    expect(screen.getByRole("heading", { name: "Purchase done!" })).toBeInTheDocument();
    const message = screen.getByText(/was approved/).textContent;
    expect(message).toContain("€37.00");
    expect(message).toContain("Mastercard");
    expect(message).toContain("ending in 4444");
  });

  it("shows the order number", () => {
    render(<PurchaseComplete order={order} />);
    expect(screen.getByText(order.orderId)).toBeInTheDocument();
  });

  it("lists the purchased lines with the confirmed total", () => {
    render(<PurchaseComplete order={order} />);

    const summary = screen.getByRole("region", { name: "Order summary" });
    expect(within(summary).getByText("Stoneware Mug, 300 ml")).toBeInTheDocument();
    expect(within(summary).getByText("2 × €18.50")).toBeInTheDocument();
    expect(within(summary).getByTestId("order-total")).toHaveTextContent("€37.00");
  });

  it("links back to the shop", () => {
    render(<PurchaseComplete order={order} />);
    expect(screen.getByRole("link", { name: "Continue shopping" })).toHaveAttribute("href", "/");
  });

  it("uses a generic card label for unknown brands", () => {
    render(<PurchaseComplete order={{ ...order, payment: { brand: "unknown", last4: "0000" } }} />);
    expect(screen.getByText(/Card ending in 0000/)).toBeInTheDocument();
  });
});
