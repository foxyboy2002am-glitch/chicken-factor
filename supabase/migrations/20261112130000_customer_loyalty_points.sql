-- Customer CRM and auditable loyalty points.
-- Earn 1 point for each whole EGP of net item spend, excluding delivery fees.
-- Points are awarded only after an order is both completed and paid.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  phone_normalized text not null unique,
  full_name text not null,
  points_balance bigint not null default 0 check (points_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_order_at timestamptz
);

alter table public.orders
  add column customer_profile_id uuid references public.customers(id) on delete set null;

create index idx_customers_name on public.customers using gin (to_tsvector('simple', full_name));
create index idx_customers_phone on public.customers(phone_normalized);
create index idx_orders_customer_profile_created on public.orders(customer_profile_id, created_at desc);

create table public.customer_points_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  points_delta bigint not null check (points_delta <> 0),
  eligible_amount numeric(12,2) not null default 0,
  entry_type text not null check (entry_type in ('earn','reversal','adjustment','redemption')),
  description text not null,
  created_at timestamptz not null default now()
);

create index idx_customer_points_order on public.customer_points_ledger(order_id);
create index idx_loyalty_ledger_customer_created on public.customer_points_ledger(customer_id, created_at desc);
create index idx_customer_points_created on public.customer_points_ledger(created_at desc);

alter table public.customers enable row level security;
alter table public.customer_points_ledger enable row level security;

create policy "backoffice read customers" on public.customers for select to authenticated
using (public.has_any_app_role(array['admin','super_admin','accountant','operations','call_center']::public.app_role[]));
create policy "backoffice read points ledger" on public.customer_points_ledger for select to authenticated
using (public.has_any_app_role(array['admin','super_admin','accountant','operations','call_center']::public.app_role[]));

-- Canonicalize Egyptian local mobile numbers to 20XXXXXXXXXX while preserving other international numbers.
create or replace function public.normalize_customer_phone(_phone text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare v text := regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g');
begin
  if left(v, 4) = '0020' then v := substring(v from 3);
  elsif length(v) = 11 and left(v, 1) = '0' then v := '20' || substring(v from 2);
  end if;
  return v;
end;
$$;
revoke all on function public.normalize_customer_phone(text) from public, anon, authenticated;

-- Keep a CRM record for every phone number that places an order.
create or replace function public.link_order_to_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_phone text := public.normalize_customer_phone(new.customer_phone);
begin
  if v_phone = '' then
    new.customer_profile_id := null;
    return new;
  end if;

  insert into public.customers(phone, phone_normalized, full_name, last_order_at)
  values (new.customer_phone, v_phone, coalesce(nullif(trim(new.customer_name), ''), 'عميل'), new.created_at)
  on conflict (phone_normalized) do update
    set phone = excluded.phone,
        full_name = case when excluded.full_name <> 'عميل' then excluded.full_name else public.customers.full_name end,
        last_order_at = greatest(public.customers.last_order_at, excluded.last_order_at),
        updated_at = now()
  returning id into new.customer_profile_id;
  return new;
end;
$$;
revoke all on function public.link_order_to_customer() from public, anon, authenticated;

create trigger trg_link_order_to_customer
before insert or update of customer_phone, customer_name
on public.orders
for each row execute function public.link_order_to_customer();

-- Keep the running points balance in sync with the append-only ledger.
create or replace function public.apply_customer_points_delta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customers
     set points_balance = points_balance + new.points_delta,
         updated_at = now()
   where id = new.customer_id;
  return new;
end;
$$;
revoke all on function public.apply_customer_points_delta() from public, anon, authenticated;

create trigger trg_apply_customer_points_delta
after insert on public.customer_points_ledger
for each row execute function public.apply_customer_points_delta();

-- Reconcile the ledger against the order's current eligible spend.
-- Repeated updates are idempotent: only the delta from the already-recorded amount is posted.
create or replace function public.reconcile_order_loyalty_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_current_points bigint := 0;
  v_target_points bigint := 0;
  v_delta bigint := 0;
  v_eligible numeric(12,2) := 0;
begin
  v_customer_id := new.customer_profile_id;
  if v_customer_id is null then return new; end if;

  if new.status = 'completed' and new.payment_status = 'paid' then
    v_eligible := greatest(0, coalesce(new.subtotal, 0) - coalesce(new.discount_total, 0));
    v_target_points := floor(v_eligible)::bigint;
  end if;

  select coalesce(sum(points_delta), 0)
    into v_current_points
    from public.customer_points_ledger
   where order_id = new.id;

  v_delta := v_target_points - v_current_points;
  if v_delta <> 0 then
    insert into public.customer_points_ledger(customer_id, order_id, points_delta, eligible_amount, entry_type, description)
    values (
      v_customer_id,
      new.id,
      v_delta,
      v_eligible,
      case when v_delta > 0 then 'earn' else 'reversal' end,
      case when v_delta > 0
        then 'نقاط مكتسبة مقابل مشتريات مكتملة ومدفوعة'
        else 'عكس نقاط بسبب إلغاء/استرداد/تعديل الطلب'
      end
    );
  end if;
  return new;
end;
$$;
revoke all on function public.reconcile_order_loyalty_points() from public, anon, authenticated;

create trigger trg_reconcile_order_loyalty_points
after insert or update of status, payment_status, subtotal, discount_total, customer_profile_id
on public.orders
for each row execute function public.reconcile_order_loyalty_points();

-- Import all existing order phone numbers into the customer directory.
insert into public.customers(phone, phone_normalized, full_name, last_order_at)
select distinct on (public.normalize_customer_phone(customer_phone))
  customer_phone,
  public.normalize_customer_phone(customer_phone),
  coalesce(nullif(trim(customer_name), ''), 'عميل'),
  created_at
from public.orders
where public.normalize_customer_phone(customer_phone) <> ''
order by public.normalize_customer_phone(customer_phone), created_at desc
on conflict (phone_normalized) do update
set phone = excluded.phone,
    full_name = excluded.full_name,
    last_order_at = greatest(public.customers.last_order_at, excluded.last_order_at),
    updated_at = now();

update public.orders o
set customer_profile_id = c.id
from public.customers c
where c.phone_normalized = public.normalize_customer_phone(o.customer_phone)
  and o.customer_profile_id is distinct from c.id;

-- Backfill loyalty for historical orders only if they already qualify as completed and paid.
update public.orders
set status = status
where status = 'completed' and payment_status = 'paid';

grant select on public.customers, public.customer_points_ledger to authenticated;
