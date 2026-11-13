import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchQuote, submitOrder } from "./api-client";
import type { OrderRequest } from "./schemas";

const order: OrderRequest = {
  items: [{ productId: "stoneware-mug", quantity: 2 }],
  card: { name: "Alex", number: "4242424242424242", expiry: "12/30", cvc: "123" },
  expectedTotal: 3700,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("api-client", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("fetchQuote", () => {
    it("POSTs the basket items as JSON and returns the quote", async () => {
      const quote = { currency: "EUR", lines: [], itemCount: 2, total: 3700 };
      fetchMock.mockResolvedValueOnce(jsonResponse(quote));

      const items = [{ productId: "stoneware-mug", quantity: 2 }];
      await expect(fetchQuote(items)).resolves.toEqual(quote);

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/quote",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ items }),
        }),
      );
      const init = fetchMock.mock.calls[0]?.[1];
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        accept: "application/json",
      });
    });
  });

  describe("submitOrder", () => {
    it("posts the order to /api/orders and returns the confirmation", async () => {
      const confirmation = { orderId: "ord_1", status: "confirmed", total: 3700 };
      fetchMock.mockResolvedValueOnce(jsonResponse(confirmation, 201));

      await expect(submitOrder(order)).resolves.toEqual(confirmation);
      expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/orders");
      expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual(order);
    });

    it("throws an ApiError carrying the server code, message and details", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: "invalid_card",
              message: "Check your card details and try again.",
              details: { fields: { cvc: "Enter 3 digits." } },
            },
          },
          422,
        ),
      );

      const error = await submitOrder(order).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 422,
        code: "invalid_card",
        message: "Check your card details and try again.",
      });
      expect((error as ApiError).cardErrors).toEqual({ cvc: "Enter 3 digits." });
    });

    it("maps a 402 card_declined response to an ApiError", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: { code: "card_declined", message: "Card declined." } }, 402),
      );

      await expect(submitOrder(order)).rejects.toMatchObject({
        status: 402,
        code: "card_declined",
      });
    });

    it("falls back to internal_error when the error body is not in the envelope", async () => {
      fetchMock.mockResolvedValueOnce(new Response("<html>Bad gateway</html>", { status: 502 }));

      const error = await submitOrder(order).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 502,
        code: "internal_error",
        message: "Unexpected response from the server.",
      });
    });

    it("propagates network failures unchanged", async () => {
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      await expect(submitOrder(order)).rejects.toThrow("Failed to fetch");
    });
  });

  describe("ApiError.cardErrors", () => {
    it("returns an empty object when there are no field errors", () => {
      expect(new ApiError(422, "invalid_card", "Invalid.").cardErrors).toEqual({});
    });
  });
});
