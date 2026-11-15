import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validCardInput } from "@/test/fixtures";
import { ApiError, fetchQuote, submitOrder } from "./api-client";
import type { OrderRequest } from "./schemas";
import type { Quote } from "./types";

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
    it("posts the basket items and returns the quote", async () => {
      const quote: Quote = { currency: "EUR", lines: [], itemCount: 0, total: 0 };
      fetchMock.mockResolvedValue(jsonResponse(quote));
      const items = [{ productId: "stoneware-mug", quantity: 2 }];

      const result = await fetchQuote(items);

      expect(result).toEqual(quote);
      expect(fetchMock).toHaveBeenCalledWith("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ items }),
        signal: undefined,
      });
    });

    it("passes the abort signal to fetch", async () => {
      fetchMock.mockResolvedValue(jsonResponse({}));
      const controller = new AbortController();

      await fetchQuote([], controller.signal);

      expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
    });

    it("turns an API error body into an ApiError", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { error: { code: "unknown_product", message: "Unknown product.", details: { id: "x" } } },
          400,
        ),
      );

      const error = await fetchQuote([]).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 400,
        code: "unknown_product",
        message: "Unknown product.",
        details: { id: "x" },
      });
    });

    it("falls back to internal_error when the error body is not an API envelope", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ oops: true }, 502));

      const error = await fetchQuote([]).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 502,
        code: "internal_error",
        message: "Unexpected response from the server.",
      });
    });

    it("falls back to internal_error when the error response is not JSON", async () => {
      fetchMock.mockResolvedValue(new Response("<html>gateway</html>", { status: 503 }));

      const error = await fetchQuote([]).catch((caught: unknown) => caught);

      expect(error).toMatchObject({ status: 503, code: "internal_error" });
    });
  });

  describe("submitOrder", () => {
    it("posts the order to /api/orders", async () => {
      const confirmation = { orderId: "ord_1" };
      fetchMock.mockResolvedValue(jsonResponse(confirmation, 201));
      const order: OrderRequest = {
        items: [{ productId: "stoneware-mug", quantity: 1 }],
        card: validCardInput(),
        expectedTotal: 1850,
      };

      const result = await submitOrder(order);

      expect(result).toEqual(confirmation);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/orders",
        expect.objectContaining({ method: "POST", body: JSON.stringify(order) }),
      );
    });
  });

  describe("ApiError.cardErrors", () => {
    it("returns the per-field card errors from details", () => {
      const error = new ApiError(400, "invalid_card", "Check your card.", {
        fields: { number: "Card number is not valid." },
      });
      expect(error.cardErrors).toEqual({ number: "Card number is not valid." });
    });

    it("returns no card errors when details are missing or malformed", () => {
      expect(new ApiError(400, "invalid_card", "x").cardErrors).toEqual({});
      expect(new ApiError(400, "invalid_card", "x", { fields: "nope" }).cardErrors).toEqual({});
    });
  });
});
