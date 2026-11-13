# AGENTS.md

Instructions for AI coding agents working in this repository. Humans should read it too: it is the
source of truth for how we build and change this codebase. `CLAUDE.md` imports this file.

## Project overview

**Checkout** is the storefront and checkout web app for Fika Supply Co. Customers browse products,
add them to a basket, and pay by card. It is one Next.js (App Router) app deployed to Vercel, with:

- **Frontend:** React Server Components for pages, Client Components for interactive parts.
- **Backend:** Route Handlers under `src/app/api/*`, run as serverless functions.

The app is **stateless** and runs in **test mode**:

- The product catalog is static data in `src/server/catalog.ts`. There is no database.
- The basket lives in the browser's `localStorage`. The server never stores it.
- Payments are simulated in `src/server/payments.ts`. No payment provider is called, no money
  moves, and orders are not persisted.
- API calls are audit-logged to Datadog by `src/server/audit-log.ts` when `DD_API_KEY` is set.
  Without it, logging is off. No environment variables, secrets or external services are needed
  to run, test or build.

Read `docs/architecture.md` for the design and `docs/api.md` for the HTTP API contract.

## Commands

Use npm (the lockfile is `package-lock.json`). Node.js 22 (`.nvmrc`).

| Task                                            | Command                                     |
| ----------------------------------------------- | ------------------------------------------- |
| Install dependencies                            | `npm ci`                                    |
| Start dev server (http://localhost:3000)        | `npm run dev`                               |
| **Run every check (do this before you finish)** | `npm run check`                             |
| Lint / auto-fix                                 | `npm run lint` / `npm run lint:fix`         |
| Format / check formatting                       | `npm run format` / `npm run format:check`   |
| Typecheck                                       | `npm run typecheck`                         |
| Tests (single run / watch)                      | `npm test` / `npm run test:watch`           |
| Run one test file                               | `npx vitest run src/server/pricing.test.ts` |
| Production build                                | `npm run build`                             |

`npm run check` runs lint, format check, typecheck and tests. CI also runs `npm run build`, which
catches prerendering errors that the other checks miss. Run it when you change pages, layouts or
route handlers.

## Definition of done

A change is done when all of these are true:

1. `npm run check` and `npm run build` pass locally.
2. New or changed behavior has tests. Bug fixes include a test that fails without the fix.
3. The API contract in `src/lib/types.ts`, `src/lib/schemas.ts` and `docs/api.md` agree.
4. Docs are updated when behavior, setup or architecture changes (`README.md`, `docs/`).
5. The diff only contains changes related to the task. No drive-by refactors or reformatting.

## Repository layout

```text
src/
  app/                  Next.js routes
    page.tsx            Shop page (product grid + basket)
    checkout/page.tsx   Checkout page
    api/                Route Handlers (the backend)
      products/         GET  /api/products
      quote/            POST /api/quote
      orders/           POST /api/orders
  components/           React components (Client Components use "use client")
    checkout/           Checkout flow: view, order summary, card form, confirmation
    ui/styles.ts        Shared Tailwind class lists for buttons and cards
  lib/                  Code shared by browser and server (no secrets, no server-only logic)
    types.ts            API contract types
    schemas.ts          Zod request schemas and limits
    card.ts             Card validation (used by the form and the API)
    money.ts            Money formatting
    api-client.ts       Typed fetch client for Client Components
    basket/             localStorage basket store and useBasket hook
  server/               Server-only logic: catalog, pricing, orders, payments, HTTP, audit log
  test/                 Test fixtures and helpers
docs/                   Architecture, API and deployment docs
.github/workflows/      CI and production deployment
```

## Architecture rules

These rules keep the app correct and safe. Do not break them; if a task seems to need it, stop and
explain why in your PR description.

1. **`src/server` is server-only.** Never import it from `src/components` or `src/lib` (ESLint
   enforces this). Server Components in `src/app` may import it and pass data down as props. Client
   Components reach the server through `src/lib/api-client.ts`.
2. **The server owns prices.** Clients send product ids and quantities, never amounts. Totals are
   computed by `createQuote` in `src/server/pricing.ts`. The order API re-prices the basket and
   rejects the order with `409 price_changed` if the total differs from what the customer confirmed.
3. **Money is integer minor units (cents).** Never use floats for amounts. Format for display only
   with `formatMoney` from `src/lib/money.ts`.
4. **Card data never leaves the request.** Never log, persist, return, send to an external
   service or put in error messages a card number or CVC. Only `brand` and `last4` may be returned.
   Validation errors list field paths and messages, never submitted values. Audit logs never
   include request or response bodies.
5. **Stay stateless.** No database, file writes, in-memory caches of user data, or module-level
   mutable state on the server. Every request must work on a fresh serverless instance.
6. **Validate every request body** with a Zod schema from `src/lib/schemas.ts` via `parseJsonBody`
   in `src/server/http.ts`. Return errors only through `errorResponse` so they use the standard
   envelope: `{ "error": { "code", "message", "details?" } }`.
7. **Keep route handlers thin.** Parse input, call a function in `src/server`, map the result to a
   response. Domain logic lives in `src/server` and returns `Result` values instead of throwing.
   Wrap per-request handlers in `withAuditLog` from `src/server/audit-log.ts`.
8. **External calls only from the server, and only to listed services.** Code in `src/server` may
   call the external services listed under "External services" in `docs/architecture.md`. Each
   integration must:
   - be optional: turned off when its environment variables are not set, so tests and builds
     work offline with no configuration;
   - run off the request path (for example in `after()`), with a timeout, so a slow or failing
     service never delays or breaks a response;
   - send no card data or other personal data.

   No browser-side network calls except to our own API: no analytics, tracking scripts or
   third-party SDKs in the browser, and no fonts or assets from external hosts.

9. **Server Components by default.** Add `"use client"` only to components that need state, effects,
   event handlers or browser APIs.

## Next.js specifics

This is Next.js 16 with **Cache Components** (`cacheComponents: true`) and Partial Prefetching. It
differs from older Next.js versions; see the managed block at the end of this file and read the
bundled docs in `node_modules/next/dist/docs/` before using an API you are unsure about.

- Pages and `GET` route handlers are prerendered at build time unless they read request data.
  `POST` handlers run per request.
- In Server Components, calling `new Date()`, `Math.random()`, `cookies()`, `headers()` or reading
  `searchParams` outside a `<Suspense>` boundary fails the build. Do that work in Client Components,
  in route handlers, or inside Suspense.
- Read `localStorage` only through the basket store, which uses `useSyncExternalStore` so server
  and client renders match.
- `LayoutProps`, `PageProps` and `RouteContext` are global types generated by `next typegen`
  (run as part of `npm run typecheck`).

## Code style

- TypeScript strict mode. Do not use `any`, `@ts-ignore` or non-null assertions in application code.
- Use named exports. Default exports only where Next.js requires them (`page.tsx`, `layout.tsx`).
- File names are kebab-case (`card-form.tsx`). Components are PascalCase.
- Import with the `@/` alias (`@/lib/money`), except for siblings in the same folder.
- Style with Tailwind utility classes. Reuse `src/components/ui/styles.ts` for buttons and cards.
- Write accessible UI: every input has a `<label>`, use real `<button>`s and links, give icon-only
  controls an `aria-label`, mark invalid fields with `aria-invalid` and `aria-describedby`.
- User-facing copy is short, plain English, and says what to do next ("Check your card details
  and try again.").
- Prettier formats everything (100-char lines). Do not format files by hand.

## Testing

Tests use Vitest and live next to the code they test (`card.ts` → `card.test.ts`).

- `*.test.ts` runs in Node. Use it for `src/lib`, `src/server` and route handlers.
- `*.test.tsx` runs in jsdom with Testing Library. Use it for components.
- Test route handlers by calling the exported `GET`/`POST` with a `Request`; see
  `src/test/http.ts` and `src/app/api/orders/route.test.ts`.
- Component tests that call the API use `createRouteHandlerFetch()` from
  `src/test/route-handler-fetch.ts`. It sends `fetch` calls to the real route handlers in-process,
  so frontend and backend are tested together. Stub `fetch` only to simulate network failures.
- Code that calls an external service is tested with `fetch` stubbed and `after` from
  `next/server` mocked to collect its callbacks. See `src/server/audit-log.test.ts`.
- Query by role and label (`getByRole`, `getByLabelText`) and interact through `userEvent`.
- Code that depends on the current time takes a `now` parameter. Pass a fixed date in tests, or use
  `futureExpiry()` from `src/test/fixtures.ts` for card expiry dates.
- Use the test cards in `src/test/fixtures.ts`. Do not invent card numbers.
- Tests must not use the network, real timers with long waits, or depend on test order.

### Test cards

These well-known test numbers are the only card numbers to use, in tests and when trying the app.

| Card                  | Number                | Result                           |
| --------------------- | --------------------- | -------------------------------- |
| Visa                  | `4242 4242 4242 4242` | Approved                         |
| Mastercard            | `5555 5555 5555 4444` | Approved                         |
| American Express      | `3782 822463 10005`   | Approved (4-digit security code) |
| Visa, always declined | `4000 0000 0000 0002` | Declined: `402 card_declined`    |

Use any name, any future expiry date (MM/YY) and any 3-digit security code (4 for Amex).

## Git and pull requests

- Never commit directly to `main`. Every push to `main` deploys to production.
- Branch from `main` using a prefix: `feat/`, `fix/`, `refactor/`, `test/`, `docs/`, `chore/`
  followed by a short kebab-case description, e.g. `feat/quantity-picker`.
- Write commit messages in [Conventional Commits](https://www.conventionalcommits.org/) style:
  `feat(checkout): show card brand icon`. Use the imperative mood.
- Keep pull requests small and focused on one change. Fill in the PR template, including how you
  tested the change. Link the issue it resolves (`Closes #123`).
- CI must pass before merging. Do not merge your own PR unless the task explicitly says to.
- Never force-push to `main`, rewrite published history, or skip hooks or checks.

## Boundaries

Ask before (or explain in the PR why you need to):

- Adding, removing or upgrading a dependency. Prefer the platform and existing dependencies.
- Changing the API contract (request or response shapes, status codes, error codes).
- Adding an external service or a new environment variable. List it in `docs/architecture.md`
  and `docs/deployment.md`.
- Changing `.github/workflows/`, `vercel.json`, `next.config.ts` or `eslint.config.mjs`.

Never:

- Add a real payment provider, database or browser-side analytics.
- Commit secrets, tokens or `.env` files. Secrets live in Vercel's environment variables only.
- Weaken lint rules, TypeScript settings or tests to make checks pass. Fix the code instead.
- Edit `package-lock.json` by hand. Use `npm install`.
- Edit generated files: `.next/`, `next-env.d.ts`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
