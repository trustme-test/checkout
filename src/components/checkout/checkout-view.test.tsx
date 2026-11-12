import { render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { basketStore } from "@/lib/basket/basket-store";
import { futureExpiry, TEST_CARDS } from "@/test/fixtures";
import { createRouteHandlerFetch } from "@/test/route-handler-fetch";
import { CheckoutView } from "./checkout-view";

async function fillCard(user: UserEvent, number: string = TEST_CARDS.visa) {
  await user.type(screen.getByLabelText("Name on card"), "Alex Andersson");
  await user.type(screen.getByLabelText("Card number"), number);
  await user.type(screen.getByLabelText("Expiry (MM/YY)"), futureExpiry());
  await user.type(screen.getByLabelText("Security code"), "123");
}

describe("CheckoutView", () => {
  let fetchMock: ReturnType<typeof createRouteHandlerFetch>;

  beforeEach(() => {
    basketStore.clear();
    fetchMock = createRouteHandlerFetch();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the confirmed total and completes the purchase", async () => {
    const user = userEvent.setup();
    basketStore.add("stoneware-mug", 2);
    basketStore.add("paper-filters-100");

    render(<CheckoutView />);

    expect(await screen.findByTestId("order-total")).toHaveTextContent("€43.50");
    await fillCard(user);
    await user.click(screen.getByRole("button", { name: "Confirm purchase · €43.50" }));

    expect(await screen.findByRole("heading", { name: "Purchase done!" })).toBeInTheDocument();
    expect(screen.getByText(/Visa ending in 4242/)).toBeInTheDocument();
    expect(basketStore.getSnapshot()).toEqual([]);

    const orderCall = fetchMock.mock.calls.find(([url]) => url === "/api/orders");
    expect(JSON.parse(String(orderCall?.[1]?.body))).toMatchObject({
      items: [
        { productId: "stoneware-mug", quantity: 2 },
        { productId: "paper-filters-100", quantity: 1 },
      ],
      expectedTotal: 4350,
    });
  });

  it("validates card details before calling the API", async () => {
    const user = userEvent.setup();
    basketStore.add("ceramic-dripper");
    render(<CheckoutView />);

    await user.click(await screen.findByRole("button", { name: /Confirm purchase/ }));

    expect(screen.getByLabelText("Card number")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/quote"]);
  });

  it("explains when the card is declined and keeps the basket", async () => {
    const user = userEvent.setup();
    basketStore.add("ceramic-dripper");
    render(<CheckoutView />);

    await screen.findByTestId("order-total");
    await fillCard(user, TEST_CARDS.declined);
    await user.click(screen.getByRole("button", { name: /Confirm purchase/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Your card was declined");
    expect(basketStore.getSnapshot()).toHaveLength(1);
  });

  it("offers recovery when the basket cannot be priced", async () => {
    const user = userEvent.setup();
    basketStore.add("discontinued-item");
    render(<CheckoutView />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("no longer available");
    await user.click(within(alert).getByRole("button", { name: "Empty basket" }));

    expect(await screen.findByText("Your basket is empty.")).toBeInTheDocument();
  });

  it("points to the shop when the basket is empty", async () => {
    render(<CheckoutView />);

    expect(await screen.findByText("Your basket is empty.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse the shop" })).toHaveAttribute("href", "/");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
