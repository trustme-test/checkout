import type { CardErrors } from "./card";
import type { OrderRequest } from "./schemas";
import type { ApiErrorBody, ApiErrorCode, BasketItem, OrderConfirmation, Quote } from "./types";

/**
 * Typed client for the app's own HTTP API, used by Client Components.
 * Server Components should import from src/server directly instead.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Per-field card errors returned with `invalid_card`. */
  get cardErrors(): CardErrors {
    const fields = this.details?.fields;
    return fields && typeof fields === "object" ? (fields as CardErrors) : {};
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = (value as { error: unknown }).error;
  return (
    !!error &&
    typeof error === "object" &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorBody(payload)) {
      const { code, message, details } = payload.error;
      throw new ApiError(response.status, code, message, details);
    }
    throw new ApiError(response.status, "internal_error", "Unexpected response from the server.");
  }

  return payload as T;
}

export function fetchQuote(items: readonly BasketItem[], signal?: AbortSignal): Promise<Quote> {
  return postJson<Quote>("/api/quote", { items }, signal);
}

export function submitOrder(order: OrderRequest, signal?: AbortSignal): Promise<OrderConfirmation> {
  return postJson<OrderConfirmation>("/api/orders", order, signal);
}
