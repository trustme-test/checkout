"use client";

import Link from "next/link";
import { useBasket } from "@/lib/basket/use-basket";
import { formatMoney } from "@/lib/money";
import { MAX_QUANTITY_PER_ITEM } from "@/lib/schemas";
import type { Product } from "@/lib/types";
import { card, iconButton, primaryButton } from "./ui/styles";

/**
 * Sidebar basket on the shop page. Amounts here are an estimate from the
 * catalog the page was rendered with; the checkout page shows the confirmed
 * total from the API.
 */
export function BasketSummary({ products }: { products: readonly Product[] }) {
  const { items, ready, setQuantity, remove } = useBasket();
  const productsById = new Map(products.map((product) => [product.id, product]));
  const lines = items.flatMap((item) => {
    const product = productsById.get(item.productId);
    return product ? [{ product, quantity: item.quantity }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.product.unitPrice * line.quantity, 0);

  return (
    <aside aria-labelledby="basket-heading" className={`${card} h-fit p-4 lg:sticky lg:top-4`}>
      <h2 id="basket-heading" className="text-lg font-semibold">
        Your basket
      </h2>

      {!ready ? (
        <p className="mt-3 text-sm text-stone-500">Loading basket…</p>
      ) : lines.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">Your basket is empty.</p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-stone-100">
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className="flex flex-col gap-2 py-3">
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className="font-medium">{product.name}</span>
                  <span className="shrink-0">{formatMoney(product.unitPrice * quantity)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={iconButton}
                    onClick={() => setQuantity(product.id, quantity - 1)}
                    aria-label={`Decrease quantity of ${product.name}`}
                  >
                    −
                  </button>
                  <span
                    className="w-6 text-center text-sm"
                    aria-label={`Quantity of ${product.name}`}
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className={iconButton}
                    onClick={() => setQuantity(product.id, quantity + 1)}
                    disabled={quantity >= MAX_QUANTITY_PER_ITEM}
                    aria-label={`Increase quantity of ${product.name}`}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="ml-auto text-xs font-medium text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
                    onClick={() => remove(product.id)}
                    aria-label={`Remove ${product.name} from basket`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-3 font-semibold">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <Link href="/checkout" className={`${primaryButton} mt-4 w-full`}>
            Go to checkout
          </Link>
        </>
      )}
    </aside>
  );
}
