import { after } from "next/server";

/**
 * Audit logging for API route handlers. Each call to a wrapped handler sends one log entry to
 * Datadog's HTTP log intake, after the response has been sent.
 *
 * Logging is off unless `DD_API_KEY` is set, so local development, tests and builds need no
 * configuration. Entries hold only the route, status, duration, error code and Vercel request id.
 * Request and response bodies are never logged: order requests contain card data.
 */

type RouteHandler = (request: Request) => Promise<Response>;

export type AuditEntry = {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  errorCode?: string;
  requestId?: string;
};

const DEFAULT_DATADOG_SITE = "datadoghq.com";
const INTAKE_TIMEOUT_MS = 2000;

/** Wraps a route handler so every call is audit-logged to Datadog. */
export function withAuditLog(handler: RouteHandler): RouteHandler {
  return async (request) => {
    const start = performance.now();
    let response: Response;
    try {
      response = await handler(request);
    } catch (error) {
      scheduleAuditLog(request, 500, start, "unhandled_exception");
      throw error;
    }

    // Read the error code from a copy so the original body still goes to the client.
    const errorCopy = response.status >= 400 ? response.clone() : undefined;
    scheduleAuditLog(request, response.status, start, undefined, errorCopy);
    return response;
  };
}

function scheduleAuditLog(
  request: Request,
  status: number,
  start: number,
  errorCode?: string,
  errorResponse?: Response,
): void {
  const apiKey = process.env.DD_API_KEY;
  if (!apiKey) return;

  const durationMs = Math.round(performance.now() - start);
  const base = {
    method: request.method,
    path: new URL(request.url).pathname,
    status,
    durationMs,
    requestId: request.headers.get("x-vercel-id") ?? undefined,
  };

  after(async () => {
    const code = errorCode ?? (errorResponse ? await readErrorCode(errorResponse) : undefined);
    await sendToDatadog(apiKey, { ...base, errorCode: code });
  });
}

async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("error" in body)) return undefined;
    const { error } = body;
    if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
    return typeof error.code === "string" ? error.code : undefined;
  } catch {
    return undefined;
  }
}

/** Builds the Datadog log entry. Uses Datadog's standard attribute names for HTTP fields. */
export function toDatadogLog(entry: AuditEntry, env: string) {
  return {
    ddsource: "nextjs",
    service: "checkout",
    ddtags: `env:${env}`,
    status: entry.status >= 500 ? "error" : entry.status >= 400 ? "warn" : "info",
    message: `${entry.method} ${entry.path} ${entry.status}`,
    // Datadog expects durations in nanoseconds.
    duration: entry.durationMs * 1_000_000,
    http: {
      method: entry.method,
      status_code: entry.status,
      url_details: { path: entry.path },
      request_id: entry.requestId,
    },
    ...(entry.errorCode ? { error: { kind: entry.errorCode } } : {}),
  };
}

async function sendToDatadog(apiKey: string, entry: AuditEntry): Promise<void> {
  const site = process.env.DD_SITE || DEFAULT_DATADOG_SITE;
  const env = process.env.VERCEL_ENV ?? "development";
  try {
    const response = await fetch(`https://http-intake.logs.${site}/api/v2/logs`, {
      method: "POST",
      headers: { "content-type": "application/json", "dd-api-key": apiKey },
      body: JSON.stringify([toDatadogLog(entry, env)]),
      signal: AbortSignal.timeout(INTAKE_TIMEOUT_MS),
    });
    if (!response.ok) console.error(`Datadog log intake returned HTTP ${response.status}.`);
  } catch (error) {
    // Audit logging must never break a request. Report the failure and move on.
    console.error("Could not send audit log to Datadog.", error);
  }
}
