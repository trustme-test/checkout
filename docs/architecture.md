# Architecture

Checkout is a single Next.js application. The frontend and the backend API are built and deployed
together to Vercel, where pages are served as static assets and API routes run as serverless
functions.

## Overview

```text
┌──────────────────────────── Browser ────────────────────────────┐
│  Shop page (/)                    Checkout page (/checkout)     │
│  ProductCard ─┐                   CheckoutView                  │
│  BasketSummary├─ useBasket ──┐      ├─ OrderSummary             │
│  BasketLink ──┘              │      ├─ CardForm (validateCard)  │
│                              ▼      └─ PurchaseComplete         │
│                    basket store ◀─── localStorage               │
│                              │                                  │
│                    api-client.ts ── fetch ──┐                   │
└─────────────────────────────────────────────┼───────────────────┘
                                              │ JSON over HTTPS
┌──────────────────────────── Vercel ─────────▼───────────────────┐
│  Route Handlers (src/app/api)                                   │
│    GET  /api/products ─▶ catalog                                │
│    POST /api/quote    ─▶ parseJsonBody ─▶ createQuote           │
│    POST /api/orders   ─▶ parseJsonBody ─▶ placeOrder            │
│                                            ├─ validateCard      │
│                                            ├─ createQuote       │
│                                            └─ authorizePayment  │
│  Domain logic (src/server): catalog, pricing, orders, payments  │
└─────────────────────────────────────────────────────────────────┘
```

## Modules

| Path             | Runs in          | Responsibility                                                    |
| ---------------- | ---------------- | ----------------------------------------------------------------- |
| `src/app`        | Server           | Routes: pages, layout, API route handlers                         |
| `src/components` | Browser + server | UI. Interactive parts are Client Components                       |
| `src/lib`        | Browser + server | API types and schemas, card validation, money, basket, API client |
| `src/server`     | Server only      | Catalog, pricing, orders, simulated payments, HTTP helpers        |

`src/server` must never be imported by browser code. ESLint enforces this for `src/components` and
`src/lib`. Server Components in `src/app` read from `src/server` directly and pass data to Client
Components as props, so the shop page needs no API call.

## Request flows

### Shop

1. `/` is prerendered at build time. The Server Component reads the catalog and renders the product
   grid.
2. Clicking **Add to basket** updates the basket store, which writes to `localStorage` and notifies
   every component using `useBasket` (product cards, basket sidebar, header link).
3. The sidebar shows a subtotal estimate from the catalog data the page was rendered with.

### Checkout

1. `/checkout` is a static shell. `CheckoutView` waits until the basket has been read from
   `localStorage`, then sends it to `POST /api/quote`.
2. The quote (lines and total) is shown as the order summary. The confirm button shows the total.
3. On submit, `CardForm` validates the card in the browser with `validateCard` for instant feedback.
4. `POST /api/orders` receives the basket, the card details and `expectedTotal`, the total the
   customer saw. The server validates the card again, re-prices the basket, rejects the order with
   `409 price_changed` if the totals differ, and authorizes the simulated payment.
5. On success the basket is cleared and the confirmation (order number, amount, card brand and last
   four digits) is shown.

## Key decisions

**Stateless by design.** There is no database. The catalog is code, the basket is client-side, and
orders are returned to the browser but not stored. Any serverless instance can serve any request,
and the app needs no configuration or secrets.

**The server owns prices.** The browser never sends amounts. The order endpoint re-prices the basket
and compares it with the total the customer confirmed, so a stale page or a tampered request cannot
change what is charged.

**Integer minor units for money.** All amounts are integer cents to avoid floating-point rounding.
Formatting happens only at the edge, in `formatMoney`.

**Shared validation, authoritative on the server.** `validateCard` in `src/lib/card.ts` is pure and
runs in both places: in the browser for fast feedback and on the server as the real check. The same
goes for the Zod request schemas in `src/lib/schemas.ts`.

**Domain functions return results.** `createQuote` and `placeOrder` return
`{ ok: true, ... } | { ok: false, error }` instead of throwing. Route handlers map failures to HTTP
status codes in one place (`src/server/http.ts`), so error responses are consistent.

**Simulated payments behind one function.** `authorizePayment` in `src/server/payments.ts` is the
only place that decides whether a payment succeeds. Integrating a real payment provider would mean
replacing that function (and handling card data through the provider's hosted fields instead of our
own form).

**Basket in an external store.** The basket store is a small module built for React's
`useSyncExternalStore`. The server render and the first client render both see an empty basket,
which avoids hydration mismatches, and components re-render as soon as the saved basket is read.
Changes in other tabs are picked up through the `storage` event.

**Cache Components.** The app uses Next.js Cache Components. Pages and `GET /api/products` are
prerendered; `POST` handlers run per request. Server Components must not call non-deterministic or
request-time APIs outside a `<Suspense>` boundary.

## Security notes

- Card numbers and security codes are only held in memory for the duration of a request. They are
  never logged, stored or returned. Responses include only the card brand and last four digits.
- Request validation errors report field paths and messages, not submitted values.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`) are set for every route in `next.config.ts`.
- The app makes no outbound network calls and loads no third-party scripts or fonts.
