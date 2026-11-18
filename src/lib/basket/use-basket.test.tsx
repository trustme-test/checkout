import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { basketStore } from "./basket-store";
import { useBasket } from "./use-basket";

function BasketProbe() {
  const { ready, count } = useBasket();
  return (
    <p data-testid="probe" data-ready={String(ready)} data-count={count}>
      basket
    </p>
  );
}

describe("useBasket", () => {
  beforeEach(() => {
    basketStore.clear();
  });

  it("is ready on the client and reports the stored items", () => {
    basketStore.add("stoneware-mug", 2);
    render(<BasketProbe />);
    expect(screen.getByTestId("probe")).toHaveAttribute("data-ready", "true");
    expect(screen.getByTestId("probe")).toHaveAttribute("data-count", "2");
  });

  it("is not ready during server rendering, so the server HTML never shows a stale basket", () => {
    basketStore.add("stoneware-mug", 2);
    const html = renderToString(<BasketProbe />);
    expect(html).toContain('data-ready="false"');
    expect(html).toContain('data-count="0"');
  });
});
