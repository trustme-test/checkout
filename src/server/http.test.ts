import { describe, expect, it } from "vitest";
import { z } from "zod";
import { jsonRequest } from "@/test/http";
import { fail } from "./errors";
import { errorResponse, parseJsonBody } from "./http";

describe("errorResponse", () => {
  it.each([
    ["invalid_request", 400],
    ["card_declined", 402],
    ["price_changed", 409],
    ["unknown_product", 422],
    ["invalid_card", 422],
    ["internal_error", 500],
  ] as const)("maps %s to HTTP %i", async (code, status) => {
    const response = errorResponse({ code, message: "Something went wrong." });
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({
      error: { code, message: "Something went wrong." },
    });
  });

  it("includes details when present", async () => {
    const response = errorResponse({
      code: "invalid_card",
      message: "Card is not valid.",
      details: { fields: { cvc: "Enter 3 digits." } },
    });
    expect(await response.json()).toEqual({
      error: {
        code: "invalid_card",
        message: "Card is not valid.",
        details: { fields: { cvc: "Enter 3 digits." } },
      },
    });
  });
});

describe("fail", () => {
  it("builds a failed result without details when none are given", () => {
    expect(fail("unknown_product", "No such product.")).toEqual({
      ok: false,
      error: { code: "unknown_product", message: "No such product." },
    });
  });

  it("includes details when given", () => {
    expect(fail("price_changed", "Total changed.", { total: 100 })).toEqual({
      ok: false,
      error: { code: "price_changed", message: "Total changed.", details: { total: 100 } },
    });
  });
});

describe("parseJsonBody", () => {
  const schema = z.object({ name: z.string(), count: z.number().int() });

  it("returns the parsed data for a valid body", async () => {
    const result = await parseJsonBody(jsonRequest("/x", { name: "mug", count: 2 }), schema);
    expect(result).toEqual({ ok: true, data: { name: "mug", count: 2 } });
  });

  it("returns invalid_request when the body is not JSON", async () => {
    const result = await parseJsonBody(jsonRequest("/x", "{not json"), schema);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
    expect(await result.response.json()).toEqual({
      error: { code: "invalid_request", message: "Request body must be valid JSON." },
    });
  });

  it("reports issue paths and messages but never echoes submitted values", async () => {
    const secret = "4242424242424242";
    const result = await parseJsonBody(
      jsonRequest("/x", { name: 7, count: 1.5, card: secret }),
      schema,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const text = await result.response.text();
    expect(result.response.status).toBe(400);
    expect(JSON.parse(text).error).toMatchObject({
      code: "invalid_request",
      message: "Request body is not valid.",
      details: {
        issues: expect.arrayContaining([
          expect.objectContaining({ path: "name" }),
          expect.objectContaining({ path: "count" }),
        ]),
      },
    });
    expect(text).not.toContain(secret);
  });
});
