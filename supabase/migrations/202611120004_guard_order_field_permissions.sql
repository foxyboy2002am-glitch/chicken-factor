create or replace function public.guard_order_backoffice_updates()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.payment_status is distinct from old.payment_status and not public.has_backoffice_role(array['accountant','admin','super_admin']::public.app_role[]) then raise exception 'not_authorized_to_change_payment_status' using errcode='42501'; end if;
  if new.branch_id is distinct from old.branch_id and not public.has_backoffice_role(array['call_center','operations','admin','super_admin']::public.app_role[]) then raise exception 'not_authorized_to_route_order' using errcode='42501'; end if;
  if new.status is distinct from old.status and not (public.has_backoffice_role(array['call_center','operations','admin','super_admin']::public.app_role[]) or exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.branch_id=old.branch_id and ur.role in ('branch_staff','branch_manager'))) then raise exception 'not_authorized_to_change_order_status' using errcode='42501'; end if;
  return new;
end; $$;
drop trigger if exists trg_guard_order_backoffice_updates on public.orders;
create trigger trg_guard_order_backoffice_updates before update on public.orders for each row execute function public.guard_order_backoffice_updates();