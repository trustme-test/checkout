import { describe, expect, it } from "vitest";
import { z } from "zod";
import { jsonRequest } from "@/test/http";
import { errorResponse, parseJsonBody } from "./http";

const schema = z.object({ productId: z.string().min(1), quantity: z.number().int().min(1) });

describe("errorResponse", () => {
  it.each([
    ["invalid_request", 400],
    ["card_declined", 402],
    ["price_changed", 409],
    ["unknown_product", 422],
    ["invalid_card", 422],
    ["internal_error", 500],
  ] as const)("maps %s to HTTP %i", async (code, status) => {
    const response = errorResponse({ code, message: "msg" });

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: { code, message: "msg" } });
  });

  it("includes details in the envelope when provided", async () => {
    const response = errorResponse({
      code: "invalid_card",
      message: "Card is not valid.",
      details: { fields: { cvc: "CVC must be 3 digits." } },
    });

    expect((await response.json()).error.details).toEqual({
      fields: { cvc: "CVC must be 3 digits." },
    });
  });
});

describe("parseJsonBody", () => {
  it("returns the parsed data for a valid body", async () => {
    const result = await parseJsonBody(
      jsonRequest("/x", { productId: "mug", quantity: 2 }),
      schema,
    );

    expect(result).toEqual({ ok: true, data: { productId: "mug", quantity: 2 } });
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

  it("reports issues by path and message without echoing submitted values", async () => {
    const secret = "4242424242424242";
    const result = await parseJsonBody(
      jsonRequest("/x", { productId: "", quantity: 0, card: secret }),
      schema,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const text = await result.response.text();
    const body = JSON.parse(text);
    expect(body.error.code).toBe("invalid_request");
    expect(body.error.message).toBe("Request body is not valid.");
    expect(body.error.details.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "productId" }),
        expect.objectContaining({ path: "quantity" }),
      ]),
    );
    expect(text).not.toContain(secret);
  });
});
