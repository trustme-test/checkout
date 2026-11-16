import { describe, expect, it } from "vitest";
import { fail } from "./errors";

describe("fail", () => {
  it("returns a failed result with code and message", () => {
    expect(fail("unknown_product", "No such product.")).toEqual({
      ok: false,
      error: { code: "unknown_product", message: "No such product." },
    });
  });

  it("includes details only when they are provided", () => {
    const result = fail("price_changed", "Total changed.", { expected: 100, actual: 120 });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "price_changed",
        message: "Total changed.",
        details: { expected: 100, actual: 120 },
      },
    });
    expect(fail("internal_error", "Oops")).not.toHaveProperty("error.details");
  });
});
