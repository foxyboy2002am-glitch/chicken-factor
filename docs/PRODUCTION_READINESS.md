# Production readiness checklist

## Required before production release

- [ ] Merge Phase 5 (#21) and Phase 6 (#22) in dependency order; Phase 7 (#23) is already merged into the Phase 6 branch.
- [ ] Configure the production environment variables from `.env.example` in Vercel. Never commit real values or expose server-only values with a `NEXT_PUBLIC_` prefix.
- [ ] Confirm the Supabase production project URL and publishable key.
- [ ] Confirm the Supabase service-role key is configured only as a server environment variable.
- [ ] Configure Paymob API key, integration ID, iframe ID, and HMAC secret. Keep card checkout disabled until a server-side checkout/order creation flow exists and has been tested.
- [ ] Enter the business WhatsApp number in Admin > Settings; the database currently contains a blank number.
- [ ] Confirm the production Supabase schema and RLS policies are applied.
- [ ] Create a test order and verify the admin order workflow and report totals.
- [ ] Test Paymob webhook signature, integration ID, currency, amount matching, duplicate callbacks, and failure callbacks in Paymob test mode.
- [ ] Verify `/admin/reports`, `/admin/orders`, `/admin/settings`, and `/menu` on the deployed preview.
- [ ] Only after preview acceptance, deploy the reviewed commit to production and smoke-test the production domain.

## Known release blockers

- There is no customer checkout/order-creation flow yet. The Paymob webhook is only a callback handler and cannot initiate card payments or create payment rows by itself.
- The `payments` and `orders` tables were empty at the last database inspection; report figures will remain zero until real orders/payments are created.
- The production Vercel team scope currently returns an authorization error to the deployment connection. Deployment status and environment variables cannot be inspected until access is authorized.
- The WhatsApp contact number is blank and must be entered by the business.
