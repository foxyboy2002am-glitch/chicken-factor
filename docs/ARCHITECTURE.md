# Architecture — Phase 1

## Logical components

```text
Customer Web (Arabic/English, RTL/LTR)
              |
              v
       Next.js Server/API
       |       |        |
       v       v        v
   Supabase  Payments  Notifications
   Auth/DB   (Paymob)  (WhatsApp)
       |
       v
  PostgreSQL + Storage

Future adapter boundary:
Next.js domain services -> Integration adapters -> Odoo
```

## Deployment boundary
- VPS runs the Next.js application behind Nginx or Caddy with HTTPS.
- Supabase hosts PostgreSQL, Auth, and Storage initially.
- DNS points the Chicken Factor domain to the VPS.
- Secrets remain in server environment variables, never in Git.
- Browser database access is restricted by Supabase RLS; privileged workflows run server-side.

## Branch selection
1. Customer may select a branch manually.
2. For delivery, customer enters a delivery address.
3. Server checks active delivery zones matching the address.
4. If multiple branches qualify, rank by configured priority and service distance.
5. Customer confirms the recommended branch before checkout.
6. Server revalidates branch service, delivery zone, product availability, prices, and offer eligibility at checkout.

Browser geolocation alone is not authoritative.

## Order integrity
- Save immutable product, variant, add-on, and price snapshots in order items.
- Save subtotal, discount, delivery fee, and total snapshots on each order.
- Recalculate totals server-side; never trust prices from the browser.
- Use idempotency keys for order creation and payment callbacks.
- Record every order status change in the status history.
- Verify Paymob callbacks server-side before marking an order paid.

## Roles
- customer: own profile, addresses, and orders.
- branch_staff: assigned branch operations only.
- branch_manager: branch operations and branch reports.
- admin: platform operational management.
- super_admin: platform configuration and role administration.

## Future Odoo adapter
Reserve a server-side integration boundary for products, stock, customers, and sales orders. Keep checkout independent of Odoo so customer ordering remains operational if Odoo is unavailable.
