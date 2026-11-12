/**
 * Public data contract shared by the API (src/app/api) and the frontend.
 *
 * All monetary amounts are integers in minor units (cents). Keep this file in
 * sync with docs/api.md.
 */

export type Currency = "EUR";

export type Product = {
  id: string;
  name: string;
  description: string;
  /** Price per unit in minor units (cents). */
  unitPrice: number;
  /** Decorative glyph used as the product image. */
  emoji: string;
};

export type BasketItem = {
  productId: string;
  quantity: number;
};

export type QuoteLine = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type Quote = {
  currency: Currency;
  lines: QuoteLine[];
  itemCount: number;
  total: number;
};

export type CardBrand = "visa" | "mastercard" | "amex" | "unknown";

export type OrderConfirmation = {
  orderId: string;
  status: "confirmed";
  /** ISO 8601 timestamp. */
  createdAt: string;
  currency: Currency;
  lines: QuoteLine[];
  itemCount: number;
  total: number;
  payment: {
    brand: CardBrand;
    last4: string;
  };
};

export type ApiErrorCode =
  | "invalid_request"
  | "unknown_product"
  | "invalid_card"
  | "price_changed"
  | "card_declined"
  | "internal_error";

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
};
