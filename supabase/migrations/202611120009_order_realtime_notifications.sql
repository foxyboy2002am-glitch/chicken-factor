-- Stream new orders to authorized back-office users for live admin alerts.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$$;

-- Realtime applies SELECT policies to each subscriber. Keep the stream limited
-- to authenticated back-office roles; branch-scoped users remain governed by
-- the existing branch-access policy.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'backoffice roles receive order realtime'
  ) then
    create policy "backoffice roles receive order realtime"
      on public.orders
      for select
      to authenticated
      using (
        public.has_any_app_role(
          array['admin','super_admin','call_center','accountant','operations']::public.app_role[]
        )
      );
  end if;
end
$$;
