import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { basketStore } from "./basket-store";
import { useBasket } from "./use-basket";

describe("useBasket", () => {
  beforeEach(() => {
    basketStore.clear();
  });

  it("is not ready and has no items during server rendering", () => {
    basketStore.add("stoneware-mug", 2);
    let snapshot: ReturnType<typeof useBasket> | undefined;

    function Probe() {
      snapshot = useBasket();
      return null;
    }
    renderToString(<Probe />);

    expect(snapshot).toMatchObject({ ready: false, count: 0 });
  });

  it("is ready on the client and reports the basket contents", () => {
    basketStore.add("stoneware-mug", 2);
    const { result } = renderHook(() => useBasket());

    expect(result.current.ready).toBe(true);
    expect(result.current.count).toBe(2);
    expect(result.current.quantityOf("stoneware-mug")).toBe(2);
    expect(result.current.quantityOf("hand-grinder")).toBe(0);
  });

  it("re-renders when the basket changes", () => {
    const { result } = renderHook(() => useBasket());

    act(() => {
      result.current.add("hand-grinder", 3);
    });
    expect(result.current.count).toBe(3);

    act(() => {
      result.current.setQuantity("hand-grinder", 1);
    });
    expect(result.current.quantityOf("hand-grinder")).toBe(1);

    act(() => {
      result.current.remove("hand-grinder");
    });
    expect(result.current.count).toBe(0);
  });

  it("clears the basket", () => {
    basketStore.add("stoneware-mug", 2);
    const { result } = renderHook(() => useBasket());

    act(() => {
      result.current.clear();
    });

    expect(result.current.items).toEqual([]);
  });
});
