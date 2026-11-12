import { describe, expect, it, vi } from "vitest";
import { MAX_QUANTITY_PER_ITEM } from "@/lib/schemas";
import {
  addItem,
  BASKET_STORAGE_KEY,
  countItems,
  createBasketStore,
  quantityOf,
  removeItem,
  setItemQuantity,
} from "./basket-store";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    data,
  };
}

describe("basket operations", () => {
  it("adds a new product and increments an existing one", () => {
    const once = addItem([], "mug");
    expect(once).toEqual([{ productId: "mug", quantity: 1 }]);
    expect(addItem(once, "mug", 2)).toEqual([{ productId: "mug", quantity: 3 }]);
  });

  it("caps quantities at the per-item maximum", () => {
    const items = addItem([], "mug", MAX_QUANTITY_PER_ITEM + 5);
    expect(quantityOf(items, "mug")).toBe(MAX_QUANTITY_PER_ITEM);
    expect(quantityOf(addItem(items, "mug"), "mug")).toBe(MAX_QUANTITY_PER_ITEM);
  });

  it("removes a product when its quantity is set to zero", () => {
    const items = addItem(addItem([], "mug"), "kettle");
    expect(setItemQuantity(items, "mug", 0)).toEqual([{ productId: "kettle", quantity: 1 }]);
    expect(removeItem(items, "kettle")).toEqual([{ productId: "mug", quantity: 1 }]);
  });

  it("counts every unit in the basket", () => {
    expect(countItems([])).toBe(0);
    expect(
      countItems([
        { productId: "mug", quantity: 2 },
        { productId: "kettle", quantity: 3 },
      ]),
    ).toBe(5);
  });
});

describe("createBasketStore", () => {
  it("loads the saved basket and persists changes", () => {
    const storage = memoryStorage({
      [BASKET_STORAGE_KEY]: JSON.stringify([{ productId: "mug", quantity: 2 }]),
    });
    const store = createBasketStore(() => storage);

    expect(store.getSnapshot()).toEqual([{ productId: "mug", quantity: 2 }]);

    store.add("kettle");
    expect(JSON.parse(storage.data.get(BASKET_STORAGE_KEY)!)).toEqual([
      { productId: "mug", quantity: 2 },
      { productId: "kettle", quantity: 1 },
    ]);

    store.clear();
    expect(storage.data.has(BASKET_STORAGE_KEY)).toBe(false);
    expect(store.getSnapshot()).toEqual([]);
  });

  it("ignores corrupt or invalid saved data", () => {
    expect(
      createBasketStore(() => memoryStorage({ [BASKET_STORAGE_KEY]: "{oops" })).getSnapshot(),
    ).toEqual([]);
    const invalid = JSON.stringify([{ productId: "mug", quantity: -1 }]);
    expect(
      createBasketStore(() => memoryStorage({ [BASKET_STORAGE_KEY]: invalid })).getSnapshot(),
    ).toEqual([]);
  });

  it("returns a stable snapshot until the basket changes, and notifies subscribers", () => {
    const store = createBasketStore(() => memoryStorage());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);

    store.add("mug");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).not.toBe(before);

    unsubscribe();
    store.add("mug");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("works without storage (server rendering)", () => {
    const store = createBasketStore(() => null);
    expect(store.getServerSnapshot()).toEqual([]);
    store.add("mug");
    expect(store.getSnapshot()).toEqual([{ productId: "mug", quantity: 1 }]);
  });
});
