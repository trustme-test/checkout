import { CURRENCY } from "@/lib/money";
import { MAX_QUANTITY_PER_ITEM } from "@/lib/schemas";
import type { BasketItem, Quote, QuoteLine } from "@/lib/types";
import { getProduct } from "./catalog";
import { fail, type Result } from "./errors";

/**
 * Prices a basket using the catalog. The server is the only source of truth
 * for prices: clients send product ids and quantities, never amounts.
 *
 * Duplicate product ids are merged, keeping the order they first appear in.
 */
export function createQuote(items: readonly BasketItem[]): Result<{ quote: Quote }> {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  const lines: QuoteLine[] = [];
  for (const [productId, quantity] of quantities) {
    const product = getProduct(productId);
    if (!product) {
      return fail("unknown_product", `Product "${productId}" is not available.`, { productId });
    }
    if (quantity > MAX_QUANTITY_PER_ITEM) {
      return fail(
        "invalid_request",
        `You can buy at most ${MAX_QUANTITY_PER_ITEM} of "${product.name}" per order.`,
        { productId },
      );
    }
    lines.push({
      productId,
      name: product.name,
      unitPrice: product.unitPrice,
      quantity,
      lineTotal: product.unitPrice * quantity,
    });
  }

  return {
    ok: true,
    quote: {
      currency: CURRENCY,
      lines,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      total: lines.reduce((sum, line) => sum + line.lineTotal, 0),
    },
  };
}
