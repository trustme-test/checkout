import { formatMoney } from "@/lib/money";
import type { Quote } from "@/lib/types";

export function OrderSummary({ quote }: { quote: Pick<Quote, "lines" | "total" | "currency"> }) {
  return (
    <section aria-labelledby="order-summary-heading">
      <h2 id="order-summary-heading" className="text-lg font-semibold">
        Order summary
      </h2>
      <ul className="mt-3 divide-y divide-stone-100">
        {quote.lines.map((line) => (
          <li key={line.productId} className="flex items-start justify-between gap-4 py-2 text-sm">
            <span>
              <span className="font-medium">{line.name}</span>
              <span className="block text-stone-500">
                {line.quantity} × {formatMoney(line.unitPrice, quote.currency)}
              </span>
            </span>
            <span className="shrink-0">{formatMoney(line.lineTotal, quote.currency)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-1 border-t border-stone-200 pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-stone-600">Delivery</dt>
          <dd>Free</dd>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <dt>Total</dt>
          <dd data-testid="order-total">{formatMoney(quote.total, quote.currency)}</dd>
        </div>
      </dl>
    </section>
  );
}
