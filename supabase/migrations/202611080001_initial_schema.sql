-- Chicken Factor Online Ordering — initial PostgreSQL schema
-- Apply to a NEW Supabase project. Review policies before production.

create extension if not exists pgcrypto;

create type public.app_role as enum ('customer','branch_staff','branch_manager','admin','super_admin');
create type public.fulfillment_type as enum ('delivery','pickup');
create type public.payment_method as enum ('cash','paymob');
create type public.payment_status as enum ('pending','paid','failed','refunded','partially_refunded');
create type public.order_status as enum ('pending_confirmation','confirmed','preparing','ready','out_for_delivery','completed','rejected','cancelled','payment_failed');

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text not null,
  phone text,
  address_ar text,
  address_en text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  is_active boolean not null default true,
  accepts_delivery boolean not null default true,
  accepts_pickup boolean not null default true,
  priority integer not null default 100,
  opening_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  preferred_locale text not null default 'ar' check (preferred_locale in ('ar','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  branch_id uuid references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((role in ('branch_staff','branch_manager') and branch_id is not null) or (role in ('customer','admin','super_admin') and branch_id is null))
);
create unique index uq_user_global_role on public.user_roles(user_id, role) where branch_id is null;
create unique index uq_user_branch_role on public.user_roles(user_id, role, branch_id) where branch_id is not null;

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  label text,
  governorate text not null,
  area text not null,
  street text not null,
  building text,
  floor text,
  apartment text,
  landmark text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  delivery_notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  slug text not null unique,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  category_id uuid references public.categories(id) on delete set null,
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  image_path text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  sku text unique,
  base_price numeric(12,2) not null check (base_price >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table public.addon_groups (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select >= min_select),
  is_required boolean not null default false,
  is_active boolean not null default true
);

create table public.addons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.addon_groups(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  price numeric(12,2) not null default 0 check (price >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table public.product_addon_groups (
  product_id uuid not null references public.products(id) on delete cascade,
  group_id uuid not null references public.addon_groups(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, group_id)
);

create table public.branch_products (
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  is_available boolean not null default true,
  branch_price numeric(12,2) check (branch_price >= 0),
  primary key (branch_id, product_id)
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  governorate text not null,
  area text not null,
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  minimum_order numeric(12,2) not null default 0 check (minimum_order >= 0),
  estimated_minutes integer,
  is_active boolean not null default true,
  unique (branch_id, governorate, area)
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  image_path text,
  discount_type text not null check (discount_type in ('percentage','fixed','bundle_price')),
  discount_value numeric(12,2) not null check (discount_value >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.offer_branches (
  offer_id uuid not null references public.offers(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  primary key (offer_id, branch_id)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value >= 0),
  minimum_order numeric(12,2) not null default 0,
  max_discount numeric(12,2),
  usage_limit integer,
  per_customer_limit integer,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id),
  customer_id uuid references auth.users(id),
  order_id uuid,
  redeemed_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid references auth.users(id) on delete set null,
  branch_id uuid not null references public.branches(id),
  fulfillment public.fulfillment_type not null,
  status public.order_status not null default 'pending_confirmation',
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  customer_name text not null,
  customer_phone text not null,
  delivery_address_snapshot jsonb,
  customer_notes text,
  coupon_code text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  idempotency_key text not null unique,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name_ar text not null,
  product_name_en text not null,
  variant_name_ar text,
  variant_name_en text,
  sku_snapshot text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  addons_snapshot jsonb not null default '[]'::jsonb
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null check (provider in ('cash','paymob')),
  provider_order_id text,
  provider_transaction_id text unique,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'EGP',
  status public.payment_status not null default 'pending',
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status public.order_status,
  new_status public.order_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('customer','branch','admin')),
  channel text not null check (channel in ('whatsapp','email','sms','in_app')),
  recipient text not null,
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table public.integration_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null,
  processed_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);

create index idx_products_category_active on public.products(category_id, is_active);
create index idx_branch_products_branch_available on public.branch_products(branch_id, is_available);
create index idx_delivery_zones_lookup on public.delivery_zones(governorate, area, is_active);
create index idx_orders_branch_status_created on public.orders(branch_id, status, created_at desc);
create index idx_orders_customer_created on public.orders(customer_id, created_at desc);
create index idx_order_items_order on public.order_items(order_id);
create index idx_notifications_status_created on public.notifications(status, created_at);
create index idx_outbox_unprocessed on public.integration_outbox(created_at) where processed_at is null;

alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.addon_groups enable row level security;
alter table public.addons enable row level security;
alter table public.product_addon_groups enable row level security;
alter table public.branch_products enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.offers enable row level security;
alter table public.offer_branches enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.notifications enable row level security;
alter table public.integration_outbox enable row level security;

create policy "active branches are readable" on public.branches for select using (is_active = true);
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "own roles readable" on public.user_roles for select using (auth.uid() = user_id);
create policy "own addresses read" on public.customer_addresses for select using (auth.uid() = customer_id);
create policy "own addresses insert" on public.customer_addresses for insert with check (auth.uid() = customer_id);
create policy "own addresses update" on public.customer_addresses for update using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
create policy "own addresses delete" on public.customer_addresses for delete using (auth.uid() = customer_id);
create policy "active categories readable" on public.categories for select using (is_active = true);
create policy "active products readable" on public.products for select using (is_active = true);
create policy "active variants readable" on public.product_variants for select using (is_active = true);
create policy "active addon groups readable" on public.addon_groups for select using (is_active = true);
create policy "active addons readable" on public.addons for select using (is_active = true);
create policy "product addon groups readable" on public.product_addon_groups for select using (
  exists (select 1 from public.products p where p.id = product_id and p.is_active = true)
);
create policy "branch products readable" on public.branch_products for select using (is_available = true);
create policy "active delivery zones readable" on public.delivery_zones for select using (is_active = true);
create policy "active offers readable" on public.offers for select using (is_active = true and now() between starts_at and ends_at);
create policy "offer branches readable" on public.offer_branches for select using (
  exists (select 1 from public.offers o where o.id = offer_id and o.is_active = true)
);
create policy "own orders readable" on public.orders for select using (auth.uid() = customer_id);
create policy "own order items readable" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);
create policy "own payments readable" on public.payments for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);
create policy "own status history readable" on public.order_status_history for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);

-- Deliberately no browser-side write policies for orders, payments, user roles,
-- coupon redemption, notifications, or integration_outbox. Implement these through
-- trusted server routes after authorization and server-side pricing validation.
