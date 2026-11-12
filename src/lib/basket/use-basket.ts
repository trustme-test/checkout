"use client";

import { useSyncExternalStore } from "react";
import { basketStore, countItems, quantityOf } from "./basket-store";

const subscribeNoop = () => () => {};

/**
 * React binding for the basket store.
 *
 * `ready` is false during server rendering and hydration, when the basket in
 * localStorage is not readable yet. Use it to avoid flashing an empty basket.
 */
export function useBasket() {
  const items = useSyncExternalStore(
    basketStore.subscribe,
    basketStore.getSnapshot,
    basketStore.getServerSnapshot,
  );
  const ready = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  return {
    items,
    ready,
    count: countItems(items),
    quantityOf: (productId: string) => quantityOf(items, productId),
    add: basketStore.add,
    setQuantity: basketStore.setQuantity,
    remove: basketStore.remove,
    clear: basketStore.clear,
  };
}
