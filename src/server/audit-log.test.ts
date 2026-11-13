import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest } from "@/test/http";
import { withAuditLog } from "./audit-log";

// `after` only works inside a real Next.js request, so collect the callbacks and run them by hand.
const afterCallbacks = vi.hoisted((): Array<() => Promise<void>> => []);
vi.mock("next/server", () => ({
  after: (callback: () => Promise<void>) => {
    afterCallbacks.push(callback);
  },
}));

async function runAfterCallbacks(): Promise<void> {
  await Promise.all(afterCallbacks.splice(0).map((callback) => callback()));
}

const fetchMock = vi.fn<typeof fetch>();

function sentLogs(): unknown[] {
  return fetchMock.mock.calls.flatMap(([, init]) => JSON.parse(String(init?.body)));
}

const created = withAuditLog(async () => Response.json({ orderId: "ord_1" }, { status: 201 }));

describe("withAuditLog", () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    afterCallbacks.length = 0;
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does nothing when DD_API_KEY is not set", async () => {
    vi.stubEnv("DD_API_KEY", "");

    const response = await created(jsonRequest("/api/orders", {}));

    expect(response.status).toBe(201);
    expect(afterCallbacks).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends one entry to the Datadog log intake after the response", async () => {
    vi.stubEnv("DD_API_KEY", "test-api-key");
    vi.stubEnv("DD_SITE", "");
    vi.stubEnv("VERCEL_ENV", "production");

    const request = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "x-vercel-id": "arn1::abc123" },
      body: "{}",
    });
    const response = await created(request);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ orderId: "ord_1" });
    expect(fetchMock).not.toHaveBeenCalled();

    await runAfterCallbacks();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://http-intake.logs.datadoghq.com/api/v2/logs");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("dd-api-key")).toBe("test-api-key");
    expect(sentLogs()).toEqual([
      {
        ddsource: "nextjs",
        service: "checkout",
        ddtags: "env:production",
        status: "info",
        message: "POST /api/orders 201",
        duration: expect.any(Number),
        http: {
          method: "POST",
          status_code: 201,
          url_details: { path: "/api/orders" },
          request_id: "arn1::abc123",
        },
      },
    ]);
  });

  it("uses the Datadog site from DD_SITE", async () => {
    vi.stubEnv("DD_API_KEY", "test-api-key");
    vi.stubEnv("DD_SITE", "datadoghq.eu");

    await created(jsonRequest("/api/orders", {}));
    await runAfterCallbacks();

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://http-intake.logs.datadoghq.eu/api/v2/logs");
  });

  it("records the error code of an error response and leaves the body for the client", async () => {
    vi.stubEnv("DD_API_KEY", "test-api-key");
    const declined = withAuditLog(async () =>
      Response.json({ error: { code: "card_declined", message: "Declined." } }, { status: 402 }),
    );

    const response = await declined(jsonRequest("/api/orders", {}));
    await runAfterCallbacks();

    expect((await response.json()).error.code).toBe("card_declined");
    expect(sentLogs()).toEqual([
      expect.objectContaining({
        status: "warn",
        message: "POST /api/orders 402",
        error: { kind: "card_declined" },
      }),
    ]);
  });

  it("logs a 500 and rethrows when the handler throws", async () => {
    vi.stubEnv("DD_API_KEY", "test-api-key");
    const failing = withAuditLog(async () => {
      throw new Error("boom");
    });

    await expect(failing(jsonRequest("/api/orders", {}))).rejects.toThrow("boom");
    await runAfterCallbacks();

    expect(sentLogs()).toEqual([
      expect.objectContaining({
        status: "error",
        http: expect.objectContaining({ status_code: 500 }),
        error: { kind: "unhandled_exception" },
      }),
    ]);
  });

  it("does not throw when the Datadog intake fails", async () => {
    vi.stubEnv("DD_API_KEY", "test-api-key");
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await created(jsonRequest("/api/orders", {}));

    await expect(runAfterCallbacks()).resolves.toBeUndefined();
    expect(response.status).toBe(201);
    expect(console.error).toHaveBeenCalledWith(
      "Could not send audit log to Datadog.",
      expect.any(TypeError),
    );
  });
});
