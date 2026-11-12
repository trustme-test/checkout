import type { ApiErrorCode } from "@/lib/types";

/** A domain failure that route handlers turn into an error response. */
export type Failure = {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type Result<T> = ({ ok: true } & T) | { ok: false; error: Failure };

export function fail(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
): { ok: false; error: Failure } {
  return { ok: false, error: details ? { code, message, details } : { code, message } };
}
