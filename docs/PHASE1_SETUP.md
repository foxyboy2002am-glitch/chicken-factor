# Phase 1 Setup Checklist

## Supabase project
- Project ref: jjwvrqfeixxntdljqxsp
- Project URL: https://jjwvrqfeixxntdljqxsp.supabase.co
- CLI config project_id: chicken-factor-production

## Apply migration
From the repository root, after installing the Supabase CLI and authenticating:
```bash
supabase login
supabase link --project-ref jjwvrqfeixxntdljqxsp
supabase db push
``

The database password is entered locally when prompted. Never commit it or send it in chat.

## Environment
Copy `.env.example` to `.env.local` locally and populate:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY (server only; do not expose to browser)

Do not add real credentials to this repository.

## Before production
1. Run the migration against the intended Supabase project and inspect the CLI output.
2. Review RLS behavior using separate anonymous, customer, branch staff, branch manager, admin, and super-admin identities.
3. Implement server-side authorization and allowed order state transitions before enabling staff operations.
4. Add server-side pricing/discount calculation and idempotent order creation.
5. Configure Auth email/phone settings and redirect URLs for the final domain.
6. Add rate limits, audit logging, backups, monitoring, and VPS TLS/firewall configuration.

## Important migration note
This initial migration creates the core schema and intentionally limits browser-side writes. Do not expose a service-role key to the client. Do not treat this schema as a finished production authorization model until branch/admin policies and server routes are implemented and tested.
