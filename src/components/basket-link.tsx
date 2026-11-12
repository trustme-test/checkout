"use client";

import Link from "next/link";
import { useBasket } from "@/lib/basket/use-basket";

export function BasketLink() {
  const { count, ready } = useBasket();
  const label = ready ? `Basket, ${count} ${count === 1 ? "item" : "items"}` : "Basket";

  return (
    <Link
      href="/checkout"
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-100"
    >
      <span aria-hidden="true">🛒</span>
      <span>Basket</span>
      <span
        aria-hidden="true"
        className="min-w-6 rounded-full bg-amber-800 px-1.5 text-center text-xs leading-5 font-semibold text-white"
      >
        {ready ? count : "–"}
      </span>
    </Link>
  );
}
