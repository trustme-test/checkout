import { render, screen, waitFor, within } from "@testing-library/react";
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

  it("asks the customer to confirm again when prices change, and re-prices the basket", async () => {
    const user = userEvent.setup();
    basketStore.add("ceramic-dripper");
    const fetch = stubFetch(async (url) =>
      url === "/api/orders"
        ? Response.json(
            { error: { code: "price_changed", message: "Prices changed." } },
            { status: 409 },
          )
        : undefined,
    );
    render(<CheckoutView />);

    await screen.findByTestId("order-total");
    await fillCard(user);
    await user.click(screen.getByRole("button", { name: /Confirm purchase/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Prices changed since you opened");
    await waitFor(() => {
      expect(fetch.mock.calls.filter(([url]) => url === "/api/quote")).toHaveLength(2);
    });
    expect(await screen.findByTestId("order-total")).toBeInTheDocument();
    expect(basketStore.getSnapshot()).toHaveLength(1);
  });

  it("tells the customer when the server cannot be reached", async () => {
    const user = userEvent.setup();
    basketStore.add("ceramic-dripper");
    stubFetch(async (url) => {
      if (url === "/api/orders") throw new TypeError("Failed to fetch");
      return undefined;
    });
    render(<CheckoutView />);

    await screen.findByTestId("order-total");
    await fillCard(user);
    await user.click(screen.getByRole("button", { name: /Confirm purchase/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't reach the server");
    expect(basketStore.getSnapshot()).toHaveLength(1);
  });

  it("lets the customer retry when the total cannot be loaded", async () => {
    const user = userEvent.setup();
    basketStore.add("ceramic-dripper");
    let quoteCalls = 0;
    stubFetch(async (url) => {
      if (url !== "/api/quote") return undefined;
      quoteCalls += 1;
      return quoteCalls === 1 ? new Response("Gateway timeout", { status: 504 }) : undefined;
    });
    render(<CheckoutView />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We couldn't load your order total.");
    await user.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByTestId("order-total")).toBeInTheDocument();
    expect(quoteCalls).toBe(2);
  });
});

/** Routes requests to the real handlers unless `override` returns a response for them. */
function stubFetch(override: (url: string, init?: RequestInit) => Promise<Response | undefined>) {
  const handlers = createRouteHandlerFetch();
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const overridden = await override(String(input), init);
    return overridden ?? handlers(input, init);
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
