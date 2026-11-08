-- Chicken Factor Phase 3: role-aware policies for admin catalog and branch management.
create or replace function public.has_any_app_role(_roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = any(_roles) and ur.branch_id is null
  );
$$;

create or replace function public.can_access_branch(_branch_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_app_role(array['admin','super_admin']::public.app_role[])
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.branch_id = _branch_id
        and ur.role in ('branch_staff','branch_manager')
    );
$$;

revoke all on function public.has_any_app_role(public.app_role[]) from public;
revoke all on function public.can_access_branch(uuid) from public;
grant execute on function public.has_any_app_role(public.app_role[]) to authenticated;
grant execute on function public.can_access_branch(uuid) to authenticated;

create policy "admins manage branches" on public.branches for all to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]))
with check (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));

create policy "admins manage categories" on public.categories for all to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]))
with check (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));
create policy "admins manage products" on public.products for all to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]))
with check (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));
create policy "admins manage variants" on public.product_variants for all to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]))
with check (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));
create policy "admins manage addon groups" on public.addon_groups for all to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]))
with check (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));
create policy "admins manage addons" on public.addons for all to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]))
with check (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));
create policy "admins manage product addon groups" on public.product_addon_groups for all to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]))
with check (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));
create policy "admins manage branch products" on public.branch_products for all to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]))
with check (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));
create policy "branch staff read assigned products" on public.branch_products for select to authenticated
using (public.can_access_branch(branch_id));
create policy "admins manage delivery zones" on public.delivery_zones for all to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]))
with check (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));
create policy "branch staff read assigned delivery zones" on public.delivery_zones for select to authenticated
using (public.can_access_branch(branch_id));

create policy "admins read profiles" on public.profiles for select to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));
create policy "admins read user roles" on public.user_roles for select to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));
create policy "admins read orders" on public.orders for select to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));
create policy "branch staff read assigned orders" on public.orders for select to authenticated
using (public.can_access_branch(branch_id));
create policy "admins read order items" on public.order_items for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id
  and public.has_any_app_role(array['admin','super_admin']::public.app_role[])));
create policy "admins read payments" on public.payments for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id
  and public.has_any_app_role(array['admin','super_admin']::public.app_role[])));
create policy "admins read order history" on public.order_status_history for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id
  and public.has_any_app_role(array['admin','super_admin']::public.app_role[])));

create policy "admins manage offers" on public.offers for all to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]))
with check (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));
create policy "admins manage offer branches" on public.offer_branches for all to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]))
with check (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));
create policy "admins manage coupons" on public.coupons for all to authenticated
using (public.has_any_app_role(array['admin','super_admin']::public.app_role[]))
with check (public.has_any_app_role(array['admin','super_admin']::public.app_role[]));

-- Role assignment, order creation, payment processing, notifications and outbox writes remain server-controlled.
