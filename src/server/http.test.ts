import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { ApiErrorCode } from "@/lib/types";
import { jsonRequest } from "@/test/http";
import { errorResponse, parseJsonBody } from "./http";

describe("errorResponse", () => {
  const statusByCode: Record<ApiErrorCode, number> = {
    invalid_request: 400,
    card_declined: 402,
    price_changed: 409,
    unknown_product: 422,
    invalid_card: 422,
    internal_error: 500,
  };

  it.each(Object.entries(statusByCode))("maps %s to HTTP %i", (code, status) => {
    const response = errorResponse({
      code: code as ApiErrorCode,
      message: "Something went wrong.",
    });
    expect(response.status).toBe(status);
  });

  it("uses the standard error envelope", async () => {
    const response = errorResponse({
      code: "invalid_card",
      message: "Check your card details and try again.",
      details: { issues: [{ path: "number", message: "Invalid" }] },
    });

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({
      error: {
        code: "invalid_card",
        message: "Check your card details and try again.",
        details: { issues: [{ path: "number", message: "Invalid" }] },
      },
    });
  });
});

describe("parseJsonBody", () => {
  const schema = z.object({
    name: z.string().min(1),
    items: z.array(z.object({ quantity: z.number().int().min(1) })),
  });

  it("returns the parsed data for a valid body", async () => {
    const result = await parseJsonBody(
      jsonRequest("/api/test", { name: "Mug", items: [{ quantity: 2 }] }),
      schema,
    );
    expect(result).toEqual({ ok: true, data: { name: "Mug", items: [{ quantity: 2 }] } });
  });

  it("reports a malformed JSON body as invalid_request", async () => {
    const result = await parseJsonBody(jsonRequest("/api/test", "{not json"), schema);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
    expect(await result.response.json()).toEqual({
      error: { code: "invalid_request", message: "Request body must be valid JSON." },
    });
  });

  it("lists validation issues by path without echoing submitted values", async () => {
    const secret = "4242424242424242";
    const result = await parseJsonBody(
      jsonRequest("/api/test", { name: "", items: [{ quantity: 0, card: secret }] }),
      schema,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);

    const text = await result.response.text();
    const body = JSON.parse(text) as {
      error: { code: string; message: string; details: { issues: { path: string }[] } };
    };
    expect(body.error.code).toBe("invalid_request");
    expect(body.error.message).toBe("Request body is not valid.");
    expect(body.error.details.issues.map((issue) => issue.path)).toEqual([
      "name",
      "items.0.quantity",
    ]);
    expect(text).not.toContain(secret);
    expect(text).not.toContain('"0"');
  });
});
