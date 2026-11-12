drop policy if exists "backoffice append order history" on public.order_status_history;
create policy "backoffice append order history" on public.order_status_history for insert to authenticated
with check (changed_by=auth.uid() and (public.has_backoffice_role(array['call_center','operations','admin','super_admin']::public.app_role[]) or exists(select 1 from public.orders o where o.id=order_id and public.can_access_branch(o.branch_id))));
create policy "admins update payments" on public.payments for update to authenticated
using (exists(select 1 from public.orders o where o.id=order_id and public.has_any_app_role(array['admin','super_admin']::public.app_role[])))
with check (exists(select 1 from public.orders o where o.id=order_id and public.has_any_app_role(array['admin','super_admin']::public.app_role[])));
create or replace function public.set_order_payment_status(_order_id uuid,_payment_id uuid,_status public.payment_status)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if not public.has_backoffice_role(array['accountant','admin','super_admin']::public.app_role[]) then raise exception 'not_authorized' using errcode='42501'; end if;
 update public.payments set status=_status,updated_at=now() where id=_payment_id and order_id=_order_id;
 if not found then raise exception 'payment_not_found'; end if;
 update public.orders set payment_status=_status where id=_order_id;
 if not found then raise exception 'order_not_found'; end if;
end; $$;
revoke all on function public.set_order_payment_status(uuid,uuid,public.payment_status) from public;
grant execute on function public.set_order_payment_status(uuid,uuid,public.payment_status) to authenticated;