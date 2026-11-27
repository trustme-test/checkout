import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Quote } from "@/lib/types";
import { OrderSummary } from "./order-summary";

const quote: Pick<Quote, "lines" | "total" | "currency"> = {
  currency: "EUR",
  lines: [
    {
      productId: "stoneware-mug",
      name: "Stoneware Mug, 300 ml",
      unitPrice: 1850,
      quantity: 2,
      lineTotal: 3700,
    },
    {
      productId: "linen-tea-towel",
      name: "Linen Tea Towel",
      unitPrice: 950,
      quantity: 1,
      lineTotal: 950,
    },
  ],
  total: 4650,
};

describe("OrderSummary", () => {
  it("lists each line with its quantity, unit price and line total", () => {
    render(<OrderSummary quote={quote} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);

    expect(within(items[0]!).getByText("Stoneware Mug, 300 ml")).toBeInTheDocument();
    expect(within(items[0]!).getByText("2 × €18.50")).toBeInTheDocument();
    expect(within(items[0]!).getByText("€37.00")).toBeInTheDocument();

    expect(within(items[1]!).getByText("Linen Tea Towel")).toBeInTheDocument();
    expect(within(items[1]!).getByText("1 × €9.50")).toBeInTheDocument();
    expect(within(items[1]!).getByText("€9.50")).toBeInTheDocument();
  });

  it("shows free delivery and the order total", () => {
    render(<OrderSummary quote={quote} />);

    expect(screen.getByRole("heading", { name: "Order summary" })).toBeInTheDocument();
    expect(screen.getByText("Delivery")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByTestId("order-total")).toHaveTextContent("€46.50");
  });
});
