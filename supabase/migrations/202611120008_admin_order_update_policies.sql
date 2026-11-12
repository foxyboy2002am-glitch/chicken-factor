drop policy if exists "call center and operations update order routing" on public.orders;
create policy "backoffice update order routing and status" on public.orders for update to authenticated
using (public.has_backoffice_role(array['call_center','operations','admin','super_admin']::public.app_role[]))
with check (public.has_backoffice_role(array['call_center','operations','admin','super_admin']::public.app_role[]));
drop policy if exists "accountants update order payment status" on public.orders;
create policy "finance update order payment status" on public.orders for update to authenticated
using (public.has_backoffice_role(array['accountant','admin','super_admin']::public.app_role[]))
with check (public.has_backoffice_role(array['accountant','admin','super_admin']::public.app_role[]));