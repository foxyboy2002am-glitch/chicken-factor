# API Specification — Phase 1

Base path: `/api/v1`
Format: JSON, UTF-8
Locale: `ar` or `en` via Accept-Language or stored preference.
Money: integer minor units (EGP piastres) in API responses; database values are EGP numeric(12,2).
All writes validate server-side. Admin and branch endpoints require authenticated role checks.

## Response format

Success:
```json
{ "data": {}, "meta": {} }
```

Error:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": [] } }
```

## Public/customer endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/branches` | List active branches and service status |
| POST | `/branches/recommend` | Recommend an eligible branch for an address |
| GET | `/branches/{branchId}/menu` | Branch-specific menu and availability |
| GET | `/categories` | Active menu categories |
| GET | `/products/{productId}` | Product, variants, and add-on groups |
| GET | `/offers?branchId=` | Active offers for a branch |
| POST | `/coupons/validate` | Validate coupon against server-side cart context |
| GET | `/delivery-zones?branchId=` | Delivery coverage and fees |
| POST | `/orders/quote` | Recalculate cart, discounts, fees, and total |
| POST | `/orders` | Create an order using server-calculated prices |
| GET | `/orders/{orderId}` | Read own order and status |
| GET | `/me/orders` | Customer order history |
| POST | `/me/addresses` | Create customer address |
| GET | `/me/addresses` | List own addresses |

## Branch operations

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/branch/orders?status=` | Orders for assigned branch |
| POST | `/branch/orders/{orderId}/accept` | Accept an order |
| POST | `/branch/orders/{orderId}/reject` | Reject with reason |
| POST | `/branch/orders/{orderId}/status` | Move order through allowed states |
| GET | `/branch/products` | Branch product availability |
| PATCH | `/branch/products/{productId}` | Toggle availability / branch price if permitted |

## Admin endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| CRUD | `/admin/branches` | Manage branches |
| CRUD | `/admin/categories` | Manage categories |
| CRUD | `/admin/products` | Manage products |
| CRUD | `/admin/offers` | Manage offers |
| CRUD | `/admin/coupons` | Manage coupons |
| GET | `/admin/reports/sales` | Sales by date and branch |
| GET | `/admin/reports/products` | Product performance |
| GET | `/admin/users` | User and role administration |

## Payments (Phase 4)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/payments/paymob/session` | Create hosted checkout session server-side |
| POST | `/webhooks/paymob` | Verify HMAC and process events idempotently |

Never accept a client assertion that payment succeeded. Only verified provider callbacks or server-side provider verification can mark payment as paid.

## WhatsApp notifications (Phase 4)
Notifications are emitted by server-side order events. Templates and opt-in rules must comply with WhatsApp Business requirements. Do not send unsolicited bulk messages from the order API.

## Core request examples

### Recommend branch
```json
{
  "deliveryAddress": {
    "governorate": "Alexandria",
    "area": "Example area",
    "street": "Example street",
    "building": "10"
  }
}
```

### Quote cart
```json
{
  "branchId": "uuid",
  "fulfillmentType": "delivery",
  "items": [
    { "productId": "uuid", "variantId": "uuid", "quantity": 2, "addonIds": ["uuid"] }
  ],
  "couponCode": null
}
```

### Create order
```json
{
  "idempotencyKey": "client-generated-unique-value",
  "branchId": "uuid",
  "fulfillmentType": "pickup",
  "paymentMethod": "cash",
  "customer": { "name": "Customer name", "phone": "+20XXXXXXXXXX" },
  "items": [
    { "productId": "uuid", "variantId": "uuid", "quantity": 1, "addonIds": [] }
  ]
}
```

The server resolves all product names and prices, validates availability and branch eligibility, recalculates totals, then persists the order and immutable item snapshots.

## Order states
`pending_confirmation -> confirmed -> preparing -> ready -> out_for_delivery -> completed`

Exception states: `rejected`, `cancelled`, `payment_failed`. Pickup normally moves from `ready` to `completed` without `out_for_delivery`.

## Phase 1 boundary
Phase 1 establishes the application skeleton, database schema, auth/role primitives, branch/catalog primitives, and API contracts. Checkout, payment, WhatsApp, reporting UI, and Odoo adapter are later phases.
