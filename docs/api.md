# HTTP API

The backend is a small JSON API served by Next.js Route Handlers under `/api`. The checkout page is
its main client, but it can be called directly.

- Requests and responses are JSON (`content-type: application/json`).
- All amounts are **integers in minor units** (cents). `1490` means €14.90.
- The only currency is `EUR`.
- The API is stateless. Nothing is stored between requests.

Types for every request and response are in [`src/lib/types.ts`](../src/lib/types.ts) and
[`src/lib/schemas.ts`](../src/lib/schemas.ts). Keep this document in sync with them.

## Errors

Every error uses the same envelope:

```json
{
  "error": {
    "code": "invalid_card",
    "message": "Some card details are not valid.",
    "details": { "fields": { "cvc": "Security code must be 3 digits." } }
  }
}
```

`message` is safe to show to customers. `details` is optional and depends on the code.

| Status | `code`            | Meaning                                                | `details`                     |
| ------ | ----------------- | ------------------------------------------------------ | ----------------------------- |
| 400    | `invalid_request` | Body is not JSON, fails the schema, or exceeds a limit | `issues: [{ path, message }]` |
| 402    | `card_declined`   | The payment was declined                               | –                             |
| 409    | `price_changed`   | The basket total differs from `expectedTotal`          | `quote`: the current quote    |
| 422    | `unknown_product` | A product id is not in the catalog                     | `productId`                   |
| 422    | `invalid_card`    | Card details failed validation                         | `fields`: message per field   |
| 500    | `internal_error`  | Unexpected server error                                | –                             |

Validation errors never echo submitted values, so card details do not appear in responses.

## Limits

| Limit                | Value |
| -------------------- | ----- |
| Quantity per product | 1–10  |
| Lines per basket     | 50    |

Duplicate product ids in one basket are merged. The merged quantity must stay within the limit.

## `GET /api/products`

Lists the catalog. The response is prerendered at build time.

```bash
curl https://<host>/api/products
```

```json
{
  "products": [
    {
      "id": "house-blend-500g",
      "name": "House Blend Beans, 500 g",
      "description": "Our everyday medium roast. Cocoa, hazelnut and dried cherry.",
      "unitPrice": 1490,
      "emoji": "🫘"
    }
  ]
}
```

## `POST /api/quote`

Prices a basket. The checkout page shows this total for the customer to confirm.

Request:

| Field               | Type   | Notes                         |
| ------------------- | ------ | ----------------------------- |
| `items`             | array  | At least one item             |
| `items[].productId` | string | A product id from the catalog |
| `items[].quantity`  | int    | 1–10                          |

```bash
curl -X POST https://<host>/api/quote \
  -H 'content-type: application/json' \
  -d '{"items":[{"productId":"stoneware-mug","quantity":2},{"productId":"paper-filters-100","quantity":1}]}'
```

Response `200`:

```json
{
  "currency": "EUR",
  "lines": [
    {
      "productId": "stoneware-mug",
      "name": "Stoneware Mug, 300 ml",
      "unitPrice": 1850,
      "quantity": 2,
      "lineTotal": 3700
    },
    {
      "productId": "paper-filters-100",
      "name": "Paper Filters, 100 pack",
      "unitPrice": 650,
      "quantity": 1,
      "lineTotal": 650
    }
  ],
  "itemCount": 3,
  "total": 4350
}
```

Errors: `400 invalid_request`, `422 unknown_product`.

## `POST /api/orders`

Validates the card, re-prices the basket, checks it against the total the customer confirmed, and
authorizes the payment. Returns an order confirmation. Orders are not stored.

Request:

| Field           | Type   | Notes                                                     |
| --------------- | ------ | --------------------------------------------------------- |
| `items`         | array  | Same as `/api/quote`                                      |
| `card.name`     | string | Name on card, 2–100 characters                            |
| `card.number`   | string | 12–19 digits, spaces and dashes allowed, must pass Luhn   |
| `card.expiry`   | string | `MM/YY` or `MM/YYYY`, not expired, at most 20 years ahead |
| `card.cvc`      | string | 3 digits (4 for American Express)                         |
| `expectedTotal` | int    | The `total` from `/api/quote` that the customer confirmed |

```bash
curl -X POST https://<host>/api/orders \
  -H 'content-type: application/json' \
  -d '{
    "items": [{"productId":"stoneware-mug","quantity":2}],
    "card": {"name":"Alex Andersson","number":"4242424242424242","expiry":"12/30","cvc":"123"},
    "expectedTotal": 3700
  }'
```

Response `201`:

```json
{
  "orderId": "ord_51f0b7e8a1504caba51d",
  "status": "confirmed",
  "createdAt": "2026-11-12T21:23:40.211Z",
  "currency": "EUR",
  "lines": [
    {
      "productId": "stoneware-mug",
      "name": "Stoneware Mug, 300 ml",
      "unitPrice": 1850,
      "quantity": 2,
      "lineTotal": 3700
    }
  ],
  "itemCount": 2,
  "total": 3700,
  "payment": { "brand": "visa", "last4": "4242" }
}
```

`payment.brand` is one of `visa`, `mastercard`, `amex` or `unknown`.

Errors: `400 invalid_request`, `402 card_declined`, `409 price_changed`, `422 unknown_product`,
`422 invalid_card`.

### Test cards

Payments are simulated. Every valid card is approved except `4000 0000 0000 0002`, which is always
declined with `402 card_declined`. See the [README](../README.md#test-cards) for the full list.
