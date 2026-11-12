import { vi } from "vitest";
import { POST as postOrder } from "@/app/api/orders/route";
import { GET as getProducts } from "@/app/api/products/route";
import { POST as postQuote } from "@/app/api/quote/route";

type Handler = (request: Request) => Promise<Response>;

const ROUTES: Record<string, Partial<Record<string, Handler>>> = {
  "/api/products": { GET: () => getProducts() },
  "/api/quote": { POST: postQuote },
  "/api/orders": { POST: postOrder },
};

/**
 * A fetch implementation that dispatches /api requests to the real route
 * handlers in-process. Lets component tests exercise frontend and backend
 * together without a running server.
 */
export function createRouteHandlerFetch() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input), "http://localhost");
    const method = (init?.method ?? "GET").toUpperCase();
    const handler = ROUTES[url.pathname]?.[method];
    if (!handler) {
      return new Response(null, { status: 404 });
    }
    // Drop the abort signal: jsdom's AbortSignal is not accepted by Node's Request.
    const requestInit: RequestInit = { ...init, signal: undefined };
    return handler(new Request(url, requestInit));
  });
}
