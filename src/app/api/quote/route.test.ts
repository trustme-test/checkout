import { describe, expect, it } from "vitest";
import { jsonRequest } from "@/test/http";
import { POST } from "./route";

describe("POST /api/quote", () => {
  it("returns the priced basket", async () => {
    const response = await POST(
      jsonRequest("/api/quote", { items: [{ productId: "gooseneck-kettle", quantity: 2 }] }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ currency: "EUR", itemCount: 2, total: 11800 });
  });

  it("rejects a body that is not JSON", async () => {
    const response = await POST(jsonRequest("/api/quote", "not json"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "invalid_request", message: "Request body must be valid JSON." },
    });
  });

  it("rejects an empty basket and reports the failing path", async () => {
    const response = await POST(jsonRequest("/api/quote", { items: [] }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_request");
    expect(body.error.details.issues).toEqual([{ path: "items", message: expect.any(String) }]);
  });

  it("rejects quantities outside 1–10", async () => {
    const response = await POST(
      jsonRequest("/api/quote", { items: [{ productId: "stoneware-mug", quantity: 11 }] }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 422 for unknown products", async () => {
    const response = await POST(
      jsonRequest("/api/quote", { items: [{ productId: "unknown", quantity: 1 }] }),
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("unknown_product");
  });
});
