import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Quote } from "@/lib/types";
import { OrderSummary } from "./order-summary";

const quote: Quote = {
  currency: "EUR",
  itemCount: 3,
  total: 4950,
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
      unitPrice: 1250,
      quantity: 1,
      lineTotal: 1250,
    },
  ],
};

describe("OrderSummary", () => {
  it("lists each line with quantity, unit price and line total", () => {
    render(<OrderSummary quote={quote} />);
    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Stoneware Mug, 300 ml");
    expect(items[0]).toHaveTextContent("2 × €18.50");
    expect(items[0]).toHaveTextContent("€37.00");
    expect(items[1]).toHaveTextContent("1 × €12.50");
    expect(items[1]).toHaveTextContent("€12.50");
  });

  it("shows free delivery and the order total", () => {
    render(<OrderSummary quote={quote} />);

    expect(screen.getByText("Delivery")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByTestId("order-total")).toHaveTextContent("€49.50");
  });
});
