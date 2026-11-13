import { afterEach, describe, expect, it, vi } from "vitest";
import { TEST_CARDS, validCardInput } from "@/test/fixtures";
import { jsonRequest } from "@/test/http";
import { POST } from "./route";

// `after` only works inside a real Next.js request, so collect the callbacks and run them by hand.
const afterCallbacks = vi.hoisted((): Array<() => Promise<void>> => []);
vi.mock("next/server", () => ({
  after: (callback: () => Promise<void>) => {
    afterCallbacks.push(callback);
  },
}));

const items = [{ productId: "stoneware-mug", quantity: 2 }];
const total = 3700;

describe("POST /api/orders", () => {
  it("creates an order and returns 201 with the confirmation", async () => {
    const response = await POST(
      jsonRequest("/api/orders", { items, card: validCardInput(), expectedTotal: total }),
    );

    expect(response.status).toBe(201);
    const order = await response.json();
    expect(order).toMatchObject({
      orderId: expect.stringMatching(/^ord_[0-9a-f]{20}$/),
      status: "confirmed",
      total,
      payment: { brand: "visa", last4: "4242" },
    });
  });

  it("returns 422 with per-field errors for invalid card details", async () => {
    const response = await POST(
      jsonRequest("/api/orders", {
        items,
        card: validCardInput({ cvc: "1", expiry: "01/20" }),
        expectedTotal: total,
      }),
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_card");
    expect(Object.keys(body.error.details.fields).sort()).toEqual(["cvc", "expiry"]);
  });

  it("returns 402 when the card is declined", async () => {
    const response = await POST(
      jsonRequest("/api/orders", {
        items,
        card: validCardInput({ number: TEST_CARDS.declined }),
        expectedTotal: total,
      }),
    );

    expect(response.status).toBe(402);
    expect((await response.json()).error.code).toBe("card_declined");
  });

  it("returns 409 when the confirmed total is out of date", async () => {
    const response = await POST(
      jsonRequest("/api/orders", { items, card: validCardInput(), expectedTotal: total - 1 }),
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("price_changed");
    expect(body.error.details.quote.total).toBe(total);
  });

  it("returns 400 when required fields are missing, without echoing card data", async () => {
    const response = await POST(
      jsonRequest("/api/orders", { items, card: { number: TEST_CARDS.visa } }),
    );

    expect(response.status).toBe(400);
    const text = await response.text();
    expect(JSON.parse(text).error.code).toBe("invalid_request");
    expect(text).not.toContain(TEST_CARDS.visa);
  });

  describe("audit log", () => {
    afterEach(() => {
      afterCallbacks.length = 0;
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });

    it("sends the order outcome to Datadog without any card data", async () => {
      vi.stubEnv("DD_API_KEY", "test-api-key");
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 202 }));
      vi.stubGlobal("fetch", fetchMock);
      const card = validCardInput({ number: TEST_CARDS.declined, cvc: "987" });

      const response = await POST(
        jsonRequest("/api/orders", { items, card, expectedTotal: total }),
      );
      await Promise.all(afterCallbacks.splice(0).map((callback) => callback()));

      expect(response.status).toBe(402);
      expect(fetchMock).toHaveBeenCalledOnce();
      const payload = String(fetchMock.mock.calls[0]?.[1]?.body);
      expect(JSON.parse(payload)).toEqual([
        expect.objectContaining({
          message: "POST /api/orders 402",
          error: { kind: "card_declined" },
        }),
      ]);
      expect(payload).not.toContain(card.number);
      expect(payload).not.toContain(card.cvc);
      expect(payload).not.toContain(card.name);
    });
  });
});
