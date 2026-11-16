---
name: add-catalog-product
description: Add, change or remove products in the Checkout catalog (src/server/catalog-seed.ts). Use when a task asks to add new items to the shop, change a product's name, description, price or emoji, or retire a product. Covers id naming, integer-cent prices, tests, checks, branch and PR.
---

# Add a catalog product

The catalog is the `SEED_PRODUCTS` array in `src/server/catalog-seed.ts`. The deployed app serves it
from an in-memory `Map` (`src/server/catalog.ts`); the Postgres integration test seeds from the same
array. You only edit the seed file and its test. Do not touch `catalog.ts`, `postgres-catalog.ts`,
the API contract or the UI.

## 1. Plan the entry

Each product is a `Product` from `src/lib/types.ts`:

| Field         | Rule                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------ |
| `id`          | Kebab-case, ends with the size or pack: `birra-tirana-330ml`, `paper-filters-100`. Unique. |
| `name`        | Title case, size after a comma: `"Birra Tirana, 330 ml"`.                                  |
| `description` | One short plain-English sentence ending with a full stop.                                  |
| `unitPrice`   | Positive **integer in cents** (`250` = €2.50). Never a float.                              |
| `emoji`       | One emoji used as the product image. No image URLs or external assets.                     |

If the task does not give a price, ask. Do not invent prices.

## 2. Edit the seed

- Append new products to the end of `SEED_PRODUCTS`, next to related items if a group exists.
- To change a product, edit it in place and keep its `id`. Changing an `id` breaks baskets stored
  in customers' browsers; only do it if the task says so.
- To remove a product, delete the entry and any test or doc that names its id
  (`grep -rn "<id>" src docs`). Baskets holding it will get `422 unknown_product`; mention this in
  the PR.

## 3. Test it

Add each new id to the `it.each([...])` list in `src/server/catalog.test.ts` ("offers %s"). Remove
ids you deleted. The "has unique product ids" test covers duplicates.

Run the new test first, then everything:

```bash
npx vitest run src/server/catalog.test.ts
npm run check
npm run build
```

`npm run test:integration` (Docker) also uses the seed. Run it if Docker is available; otherwise
say in the PR that you did not.

## 4. Ship it

- Branch from `main`: `feat/catalog-<short-description>` (never commit to `main`).
- Commit: `feat(catalog): add <products>` (or `fix(catalog): ...` for corrections).
- The diff should touch only `catalog-seed.ts` and `catalog.test.ts`. Update `docs/api.md` only if
  its example product changed.
- Open a PR with the template filled in, listing each product with id and price.
