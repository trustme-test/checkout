import { validateCard } from "@/lib/card";
import type { OrderRequest } from "@/lib/schemas";
import type { OrderConfirmation } from "@/lib/types";
import { fail, type Result } from "./errors";
import { authorizePayment } from "./payments";
import { createQuote } from "./pricing";

export type PlaceOrderOptions = {
  now?: Date;
  createId?: () => string;
};

/**
 * Places an order: validates the card, re-prices the basket, checks the total
 * the customer confirmed, and authorizes the (simulated) payment.
 *
 * Orders are not persisted; the confirmation is returned to the caller only.
 */
export function placeOrder(
  request: OrderRequest,
  { now = new Date(), createId = () => crypto.randomUUID() }: PlaceOrderOptions = {},
): Result<{ order: OrderConfirmation }> {
  const card = validateCard(request.card, now);
  if (!card.ok) {
    return fail("invalid_card", "Some card details are not valid.", { fields: card.errors });
  }

  const priced = createQuote(request.items);
  if (!priced.ok) return priced;
  const { quote } = priced;

  if (quote.total !== request.expectedTotal) {
    return fail(
      "price_changed",
      "The order total has changed. Review the new total and confirm again.",
      {
        quote,
      },
    );
  }

  const payment = authorizePayment(
    { card: card.card, amount: quote.total, currency: quote.currency },
    createId,
  );
  if (payment.status === "declined") {
    return fail("card_declined", "The card was declined. Try a different card.");
  }

  return {
    ok: true,
    order: {
      orderId: `ord_${createId().replaceAll("-", "").slice(0, 20)}`,
      status: "confirmed",
      createdAt: now.toISOString(),
      currency: quote.currency,
      lines: quote.lines,
      itemCount: quote.itemCount,
      total: quote.total,
      payment: { brand: card.card.brand, last4: card.card.last4 },
    },
  };
}
