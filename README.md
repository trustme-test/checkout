# Checkout

The storefront and checkout for **Fika Supply Co.**, a small shop for coffee and brewing gear.
Customers browse the range, add products to a basket and pay by card.

The store currently runs in **test mode**: the catalog is fixed, payments are simulated, and no
order data is stored. There is no database, so the app runs anywhere Node.js does, with no
configuration. In production, API calls can be audit-logged to Datadog (optional, see
[docs/deployment.md](docs/deployment.md#audit-logs-in-datadog)).

## Features

- Product listing with a basket you can update (add, change quantity, remove)
- Basket kept in the browser, so it survives page reloads
- Checkout that confirms the total with the server before you pay
- Card form with instant validation (card number checksum, expiry date, security code)
- Simulated payment with approved and declined test cards
- Order confirmation with an order number
- Optional audit logs of API calls in Datadog

## Tech stack

| Area      | Choice                                                          |
| --------- | --------------------------------------------------------------- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Cache Components) |
| UI        | React 19, Tailwind CSS 4                                        |
| API       | Next.js Route Handlers under `/api`, validated with Zod         |
| Language  | TypeScript (strict)                                             |
| Testing   | Vitest, Testing Library, jsdom                                  |
| Quality   | ESLint, Prettier                                                |
| Hosting   | Vercel, deployed from GitHub Actions on every push to `main`    |
| Logging   | Datadog HTTP log intake (optional)                              |

## Getting started

Requirements: Node.js 22 (see `.nvmrc`) and npm.

```bash
npm ci
npm run dev
```

Open http://localhost:3000, add a few products and go to checkout. Pay with one of the
[test cards](#test-cards).

## Scripts

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Start the dev server on port 3000                    |
| `npm run build`     | Create a production build                            |
| `npm start`         | Serve the production build                           |
| `npm run check`     | Lint, check formatting, typecheck and run tests      |
| `npm run lint`      | Run ESLint (`lint:fix` to fix what it can)           |
| `npm run format`    | Format all files with Prettier                       |
| `npm run typecheck` | Generate route types and run the TypeScript compiler |
| `npm test`          | Run the test suite once (`test:watch` to watch)      |

## Test cards

| Card                  | Number                | Result                           |
| --------------------- | --------------------- | -------------------------------- |
| Visa                  | `4242 4242 4242 4242` | Approved                         |
| Mastercard            | `5555 5555 5555 4444` | Approved                         |
| American Express      | `3782 822463 10005`   | Approved (4-digit security code) |
| Visa, always declined | `4000 0000 0000 0002` | Declined                         |

Use any name, any future expiry date (MM/YY) and any 3-digit security code (4 for American
Express). Numbers that fail the card checksum are rejected by the form.

## How it works

```text
Browser                                   Vercel (serverless)
───────                                   ───────────────────
Shop page  ── static HTML ────────────── /           (prerendered)
Basket in localStorage
Checkout   ── POST /api/quote ─────────▶ prices the basket from the catalog
           ── POST /api/orders ────────▶ validates the card, re-checks the total,
                                          simulates the payment, returns a confirmation
```

The server is the only source of truth for prices. The browser sends product ids and quantities;
the API calculates the total and refuses the order if it no longer matches what the customer
confirmed. See [docs/architecture.md](docs/architecture.md) for details.

### API

| Method & path       | Purpose                                 |
| ------------------- | --------------------------------------- |
| `GET /api/products` | List the catalog                        |
| `POST /api/quote`   | Price a basket                          |
| `POST /api/orders`  | Pay for a basket and get a confirmation |

Request and response formats, error codes and `curl` examples are in [docs/api.md](docs/api.md).

## Project structure

```text
src/
  app/          Pages and API routes
  components/   React components
  lib/          Code shared by browser and server (types, schemas, validation, API client, basket)
  server/       Server-only logic (catalog, pricing, orders, payments, audit log)
  test/         Test fixtures and helpers
docs/           Architecture, API and deployment docs
```

## Deployment

Every push to `main` runs CI and, if it passes, deploys to production on Vercel. Pull requests run
the same checks without deploying. Setup and rollback steps are in
[docs/deployment.md](docs/deployment.md).

## Contributing

1. Create a branch from `main`, e.g. `feat/gift-wrapping`.
2. Make your change with tests. Run `npm run check` and `npm run build`.
3. Open a pull request and fill in the template. CI must pass before merging.

Coding conventions, architecture rules and the definition of done are in [AGENTS.md](AGENTS.md).
They apply to everyone, human or AI.
