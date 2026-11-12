import { z } from "zod";

/**
 * Request schemas for the HTTP API. Route handlers parse every request body
 * with these; the frontend uses the inferred types when calling the API.
 */

export const MAX_QUANTITY_PER_ITEM = 10;
export const MAX_BASKET_LINES = 50;

export const basketItemSchema = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
});

export const basketItemsSchema = z.array(basketItemSchema).max(MAX_BASKET_LINES);

const nonEmptyBasketSchema = basketItemsSchema.min(1, "Basket must contain at least one item.");

export const quoteRequestSchema = z.object({
  items: nonEmptyBasketSchema,
});

/**
 * Card fields are only shape-checked here. Detailed validation (Luhn, expiry,
 * CVC length) lives in validateCard so the API can return per-field messages.
 */
export const cardInputSchema = z.object({
  name: z.string().max(200),
  number: z.string().max(40),
  expiry: z.string().max(10),
  cvc: z.string().max(10),
});

export const orderRequestSchema = z.object({
  items: nonEmptyBasketSchema,
  card: cardInputSchema,
  /** The total (minor units) the customer confirmed on the checkout page. */
  expectedTotal: z.number().int().nonnegative(),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type OrderRequest = z.infer<typeof orderRequestSchema>;
