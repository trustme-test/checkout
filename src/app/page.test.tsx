import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { basketStore } from "@/lib/basket/basket-store";
import ShopPage from "./page";

describe("ShopPage", () => {
  beforeEach(() => {
    basketStore.clear();
  });

  it("lists every product with the basket sidebar", async () => {
    render(await ShopPage());

    expect(screen.getByRole("heading", { name: "Shop", level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Your basket" })).toBeInTheDocument();
  });
});
