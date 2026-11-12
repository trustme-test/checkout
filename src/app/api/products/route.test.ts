import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/products", () => {
  it("lists the catalog", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.products.length).toBeGreaterThan(0);
    expect(body.products[0]).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      description: expect.any(String),
      unitPrice: expect.any(Number),
      emoji: expect.any(String),
    });
  });
});
