# Chicken Factor Online Ordering

Standalone bilingual (Arabic/English) multi-branch online ordering platform.

## Approved decisions
- Independent domain
- VPS deployment target
- Multi-branch ordering with manual selection and automatic recommendation
- Arabic + English (RTL/LTR)
- Cash on Delivery + Paymob hosted checkout (planned)
- WhatsApp order notifications (planned)
- Future Odoo integration through a decoupled adapter

## Planned stack
- Next.js App Router + TypeScript
- Supabase PostgreSQL, Auth, and Storage
- Server-side API routes
- Paymob hosted checkout
- WhatsApp Business API

## Phase 1
This repository is being initialized with the database schema, architecture notes, API contracts, and application skeleton. Payment, WhatsApp, production deployment, and Odoo integration will be implemented in later phases.

## Security
Never commit database passwords, Supabase service-role keys, Paymob secrets, or WhatsApp access tokens. Use server-side environment variables. All customer-accessible database tables must be protected by reviewed Row Level Security policies.
