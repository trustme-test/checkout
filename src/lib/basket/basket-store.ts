import { basketItemsSchema, MAX_QUANTITY_PER_ITEM } from "@/lib/schemas";
import type { BasketItem } from "@/lib/types";

/**
 * The basket lives in the browser (localStorage). The server never stores it;
 * it is sent to the API at checkout to be priced and paid for.
 *
 * The store is a tiny external store designed for React's useSyncExternalStore.
 * Snapshots are immutable arrays, so every change produces a new reference.
 */

export type BasketItems = readonly BasketItem[];

export const BASKET_STORAGE_KEY = "fika.basket.v1";

const EMPTY: BasketItems = Object.freeze([]);

// ---------------------------------------------------------------------------
// Pure operations (easy to unit test)
// ---------------------------------------------------------------------------

function clampQuantity(quantity: number): number {
  return Math.min(Math.max(Math.trunc(quantity), 0), MAX_QUANTITY_PER_ITEM);
}

export function addItem(items: BasketItems, productId: string, quantity = 1): BasketItems {
  const existing = items.find((item) => item.productId === productId);
  if (!existing) {
    const clamped = clampQuantity(quantity);
    return clamped > 0 ? [...items, { productId, quantity: clamped }] : items;
  }
  return setItemQuantity(items, productId, existing.quantity + quantity);
}

export function setItemQuantity(
  items: BasketItems,
  productId: string,
  quantity: number,
): BasketItems {
  const clamped = clampQuantity(quantity);
  if (clamped === 0) return removeItem(items, productId);
  return items.map((item) =>
    item.productId === productId ? { ...item, quantity: clamped } : item,
  );
}

export function removeItem(items: BasketItems, productId: string): BasketItems {
  return items.filter((item) => item.productId !== productId);
}

export function countItems(items: BasketItems): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function quantityOf(items: BasketItems, productId: string): number {
  return items.find((item) => item.productId === productId)?.quantity ?? 0;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function readItems(storage: StorageLike | null): BasketItems {
  if (!storage) return EMPTY;
  try {
    const raw = storage.getItem(BASKET_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = basketItemsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeItems(storage: StorageLike | null, items: BasketItems): void {
  if (!storage) return;
  try {
    if (items.length === 0) {
      storage.removeItem(BASKET_STORAGE_KEY);
    } else {
      storage.setItem(BASKET_STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    // Storage can be full or disabled (private mode). The basket still works
    // in memory for the current page view.
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export type BasketStore = ReturnType<typeof createBasketStore>;

export function createBasketStore(getStorage: () => StorageLike | null) {
  let items: BasketItems = EMPTY;
  let loaded = false;
  const listeners = new Set<() => void>();

  function ensureLoaded() {
    if (loaded) return;
    loaded = true;
    items = readItems(getStorage());
  }

  function notify() {
    for (const listener of listeners) listener();
  }

  function commit(next: BasketItems) {
    if (next === items) return;
    items = next.length === 0 ? EMPTY : next;
    writeItems(getStorage(), items);
    notify();
  }

  // Keep tabs in sync when the basket changes in another tab.
  function handleStorageEvent(event: StorageEvent) {
    if (event.key !== null && event.key !== BASKET_STORAGE_KEY) return;
    items = readItems(getStorage());
    loaded = true;
    notify();
  }

  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      if (listeners.size === 1 && typeof window !== "undefined") {
        window.addEventListener("storage", handleStorageEvent);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") {
          window.removeEventListener("storage", handleStorageEvent);
        }
      };
    },
    getSnapshot(): BasketItems {
      ensureLoaded();
      return items;
    },
    getServerSnapshot(): BasketItems {
      return EMPTY;
    },
    add(productId: string, quantity = 1) {
      ensureLoaded();
      commit(addItem(items, productId, quantity));
    },
    setQuantity(productId: string, quantity: number) {
      ensureLoaded();
      commit(setItemQuantity(items, productId, quantity));
    },
    remove(productId: string) {
      ensureLoaded();
      commit(removeItem(items, productId));
    },
    clear() {
      ensureLoaded();
      commit(EMPTY);
    },
  };
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The app-wide basket. Only use from Client Components. */
export const basketStore = createBasketStore(browserStorage);
