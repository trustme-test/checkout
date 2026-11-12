import type { z } from "zod";
import type { ApiErrorBody, ApiErrorCode } from "@/lib/types";
import type { Failure } from "./errors";

/** HTTP helpers for route handlers. Every error uses the ApiErrorBody envelope. */

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  invalid_request: 400,
  card_declined: 402,
  price_changed: 409,
  unknown_product: 422,
  invalid_card: 422,
  internal_error: 500,
};

export function errorResponse(failure: Failure): Response {
  const body: ApiErrorBody = { error: failure };
  return Response.json(body, { status: STATUS_BY_CODE[failure.code] });
}

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: Response };

/**
 * Reads and validates a JSON request body. Validation issues are reported by
 * path and message only; submitted values are never echoed back.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<ParsedBody<T>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return {
      ok: false,
      response: errorResponse({
        code: "invalid_request",
        message: "Request body must be valid JSON.",
      }),
    };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse({
        code: "invalid_request",
        message: "Request body is not valid.",
        details: {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      }),
    };
  }

  return { ok: true, data: parsed.data };
}
