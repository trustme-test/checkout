import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchQuote, submitOrder } from "./api-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchQuote", () => {
  it("posts the basket items as JSON and returns the quote", async () => {
    const quote = { currency: "EUR", lines: [], itemCount: 0, total: 0 };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(quote));
    vi.stubGlobal("fetch", fetchMock);

    const items = [{ productId: "mug", quantity: 2 }];
    await expect(fetchQuote(items)).resolves.toEqual(quote);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/quote",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    );
  });

  it("throws an ApiError built from the standard error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: { code: "unknown_product", message: "Unknown product.", details: { id: "x" } },
          },
          400,
        ),
      ),
    );

    const error = await fetchQuote([{ productId: "x", quantity: 1 }]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      name: "ApiError",
      status: 400,
      code: "unknown_product",
      message: "Unknown product.",
      details: { id: "x" },
    });
  });

  it("falls back to internal_error when the error body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 502 })));

    const error = await fetchQuote([]).catch((e: unknown) => e);

    expect(error).toMatchObject({
      status: 502,
      code: "internal_error",
      message: "Unexpected response from the server.",
    });
  });

  it("falls back to internal_error when the error body has no error envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ nope: true }, 500)));

    await expect(fetchQuote([])).rejects.toMatchObject({
      status: 500,
      code: "internal_error",
    });
  });
});

describe("submitOrder", () => {
  it("posts the order to /api/orders", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ orderId: "ord_1" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const order = {
      items: [{ productId: "mug", quantity: 1 }],
      expectedTotal: 1200,
    } as unknown as Parameters<typeof submitOrder>[0];
    await expect(submitOrder(order)).resolves.toEqual({ orderId: "ord_1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/orders",
      expect.objectContaining({ method: "POST", body: JSON.stringify(order) }),
    );
  });
});

describe("ApiError.cardErrors", () => {
  it("returns the per-field card errors from invalid_card details", () => {
    const error = new ApiError(400, "invalid_card", "Check your card.", {
      fields: { number: "Card number is not valid." },
    });
    expect(error.cardErrors).toEqual({ number: "Card number is not valid." });
  });

  it("returns no field errors when details are missing or malformed", () => {
    expect(new ApiError(500, "internal_error", "x").cardErrors).toEqual({});
    expect(new ApiError(400, "invalid_card", "x", { fields: "bad" }).cardErrors).toEqual({});
  });
});
