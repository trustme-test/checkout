import Link from "next/link";
import { formatMoney } from "@/lib/money";
import type { CardBrand, OrderConfirmation } from "@/lib/types";
import { card, primaryButton } from "../ui/styles";
import { OrderSummary } from "./order-summary";

const BRAND_LABELS: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  unknown: "Card",
};

export function PurchaseComplete({ order }: { order: OrderConfirmation }) {
  return (
    <div className={`${card} mx-auto max-w-xl p-6`}>
      <div className="text-center">
        <p aria-hidden="true" className="text-5xl">
          ✅
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Purchase done!</h1>
        <p className="mt-2 text-stone-600">
          Thank you for your order. Your payment of{" "}
          <strong>{formatMoney(order.total, order.currency)}</strong> with{" "}
          {BRAND_LABELS[order.payment.brand]} ending in {order.payment.last4} was approved.
        </p>
        <p className="mt-1 text-sm text-stone-500">
          Order number <span className="font-mono">{order.orderId}</span>
        </p>
      </div>
      <div className="mt-6">
        <OrderSummary quote={order} />
      </div>
      <Link href="/" className={`${primaryButton} mt-6 w-full`}>
        Continue shopping
      </Link>
    </div>
  );
}
