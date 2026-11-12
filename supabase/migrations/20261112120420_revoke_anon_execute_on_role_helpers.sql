-- Keep role-check helpers callable by authenticated sessions and trusted server code only.
-- These SECURITY DEFINER functions were directly executable by anon despite the earlier PUBLIC revoke.
revoke execute on function public.can_access_branch(uuid) from anon;
revoke execute on function public.has_any_app_role(public.app_role[]) from anon;
revoke execute on function public.has_backoffice_role(public.app_role[]) from anon;

grant execute on function public.can_access_branch(uuid) to authenticated, service_role;
grant execute on function public.has_any_app_role(public.app_role[]) to authenticated, service_role;
grant execute on function public.has_backoffice_role(public.app_role[]) to authenticated, service_role;
