"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, fetchQuote, submitOrder } from "@/lib/api-client";
import { useBasket } from "@/lib/basket/use-basket";
import type { CardErrors, CardInput } from "@/lib/card";
import { formatMoney } from "@/lib/money";
import type { OrderConfirmation, Quote } from "@/lib/types";
import { card, primaryButton, secondaryButton } from "../ui/styles";
import { CardForm } from "./card-form";
import { OrderSummary } from "./order-summary";
import { PurchaseComplete } from "./purchase-complete";

type QuoteState =
  | { requestKey: string; status: "ready"; quote: Quote }
  | { requestKey: string; status: "error"; message: string };

function quoteErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "unknown_product") {
    return "Some items in your basket are no longer available.";
  }
  return "We couldn't load your order total. Please try again.";
}

/**
 * Checkout flow: price the basket via the API, collect card details, place
 * the order, then show the confirmation.
 */
export function CheckoutView() {
  const basket = useBasket();
  const { items, ready } = basket;

  const [reloadCount, setReloadCount] = useState(0);
  const [quoteState, setQuoteState] = useState<QuoteState | null>(null);
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const requestKey = `${reloadCount}:${JSON.stringify(items)}`;
  const current = quoteState?.requestKey === requestKey ? quoteState : null;

  useEffect(() => {
    if (!ready || items.length === 0) return;
    const controller = new AbortController();
    fetchQuote(items, controller.signal).then(
      (quote) => setQuoteState({ requestKey, status: "ready", quote }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setQuoteState({ requestKey, status: "error", message: quoteErrorMessage(error) });
      },
    );
    return () => controller.abort();
  }, [ready, items, requestKey]);

  async function handlePay(cardInput: CardInput): Promise<CardErrors | void> {
    if (current?.status !== "ready") return;
    setFormError(null);
    try {
      const confirmation = await submitOrder({
        items: [...items],
        card: cardInput,
        expectedTotal: current.quote.total,
      });
      setOrder(confirmation);
      basket.clear();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError("We couldn't reach the server. Check your connection and try again.");
        return;
      }
      switch (error.code) {
        case "invalid_card":
          setFormError("Check your card details and try again.");
          return error.cardErrors;
        case "card_declined":
          setFormError("Your card was declined. Try a different card.");
          return;
        case "price_changed":
          setFormError(
            "Prices changed since you opened checkout. Review the new total and confirm again.",
          );
          setReloadCount((count) => count + 1);
          return;
        default:
          setFormError(error.message);
      }
    }
  }

  if (order) {
    return <PurchaseComplete order={order} />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>

      {!ready ? (
        <p className="mt-6 text-stone-500">Loading your basket…</p>
      ) : items.length === 0 ? (
        <div className={`${card} mt-6 p-6 text-center`}>
          <p className="text-stone-600">Your basket is empty.</p>
          <Link href="/" className={`${primaryButton} mt-4`}>
            Browse the shop
          </Link>
        </div>
      ) : !current ? (
        <p className="mt-6 text-stone-500" role="status">
          Calculating your total…
        </p>
      ) : current.status === "error" ? (
        <div className={`${card} mt-6 p-6`} role="alert">
          <p className="text-stone-700">{current.message}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className={primaryButton}
              onClick={() => setReloadCount((count) => count + 1)}
            >
              Try again
            </button>
            <button type="button" className={secondaryButton} onClick={basket.clear}>
              Empty basket
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className={`${card} h-fit p-5`}>
            <OrderSummary quote={current.quote} />
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-amber-800 hover:underline"
            >
              ← Edit basket
            </Link>
          </div>
          <div className={`${card} p-5`}>
            <CardForm
              amountLabel={formatMoney(current.quote.total, current.quote.currency)}
              onSubmit={handlePay}
              formError={formError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
