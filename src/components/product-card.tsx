"use client";

import { useBasket } from "@/lib/basket/use-basket";
import { formatMoney } from "@/lib/money";
import { MAX_QUANTITY_PER_ITEM } from "@/lib/schemas";
import type { Product } from "@/lib/types";
import { card, primaryButton } from "./ui/styles";

export function ProductCard({ product }: { product: Product }) {
  const { add, quantityOf, ready } = useBasket();
  const inBasket = quantityOf(product.id);
  const atLimit = inBasket >= MAX_QUANTITY_PER_ITEM;

  return (
    <article className={`${card} flex h-full flex-col overflow-hidden`}>
      <div
        aria-hidden="true"
        className="flex h-36 items-center justify-center bg-linear-to-br from-amber-50 to-stone-100 text-6xl"
      >
        {product.emoji}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="font-semibold text-stone-900">{product.name}</h2>
        <p className="flex-1 text-sm text-stone-600">{product.description}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-base font-semibold">{formatMoney(product.unitPrice)}</span>
          <button
            type="button"
            className={primaryButton}
            onClick={() => add(product.id)}
            disabled={!ready || atLimit}
            aria-label={`Add ${product.name} to basket`}
          >
            {atLimit ? "Limit reached" : "Add to basket"}
          </button>
        </div>
        {/* Always rendered so cards in a row keep the same height. */}
        <p className="h-4 text-xs text-stone-500" aria-live="polite">
          {inBasket > 0 ? `${inBasket} in basket` : ""}
        </p>
      </div>
    </article>
  );
}
