-- Back-office workflows: call-center order intake, payment reconciliation, and roles.
alter table public.user_roles drop constraint user_roles_check;
alter table public.user_roles add constraint user_roles_check check (
  (role in ('branch_staff','branch_manager') and branch_id is not null)
  or (role in ('customer','admin','super_admin','call_center','accountant','operations') and branch_id is null)
);

alter table public.orders add column if not exists source text not null default 'website'
  check (source in ('website','call_center'));
alter table public.orders add column if not exists created_by uuid references auth.users(id) on delete set null;

create or replace function public.has_backoffice_role(_roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur where ur.user_id=auth.uid()
    and ur.role=any(_roles) and ur.branch_id is null);
$$;
revoke all on function public.has_backoffice_role(public.app_role[]) from public;
grant execute on function public.has_backoffice_role(public.app_role[]) to authenticated;

create policy "backoffice read all orders" on public.orders for select to authenticated
using (public.has_backoffice_role(array['call_center','accountant','operations']::public.app_role[]));
create policy "backoffice read all order items" on public.order_items for select to authenticated
using (exists(select 1 from public.orders o where o.id=order_id and
  public.has_backoffice_role(array['call_center','accountant','operations']::public.app_role[])));
create policy "backoffice read payments" on public.payments for select to authenticated
using (exists(select 1 from public.orders o where o.id=order_id and
  public.has_backoffice_role(array['call_center','accountant','operations']::public.app_role[])));
create policy "backoffice read order history" on public.order_status_history for select to authenticated
using (exists(select 1 from public.orders o where o.id=order_id and
  public.has_backoffice_role(array['call_center','accountant','operations']::public.app_role[])));

create policy "call center create orders" on public.orders for insert to authenticated
with check (source='call_center' and created_by=auth.uid() and
  public.has_backoffice_role(array['call_center']::public.app_role[]));
create policy "call center add order items" on public.order_items for insert to authenticated
with check (exists(select 1 from public.orders o where o.id=order_id and o.created_by=auth.uid() and o.source='call_center')
  and public.has_backoffice_role(array['call_center']::public.app_role[]));
create policy "call center add cash payments" on public.payments for insert to authenticated
with check (exists(select 1 from public.orders o where o.id=order_id and o.created_by=auth.uid() and o.source='call_center')
  and provider='cash' and public.has_backoffice_role(array['call_center']::public.app_role[]));

create policy "call center and operations update order routing" on public.orders for update to authenticated
using (public.has_backoffice_role(array['call_center','operations']::public.app_role[]))
with check (public.has_backoffice_role(array['call_center','operations']::public.app_role[]));
create policy "branch teams update assigned orders" on public.orders for update to authenticated
using (public.can_access_branch(branch_id)) with check (public.can_access_branch(branch_id));
create policy "accountants update order payment status" on public.orders for update to authenticated
using (public.has_backoffice_role(array['accountant']::public.app_role[]))
with check (public.has_backoffice_role(array['accountant']::public.app_role[]));
create policy "accountants update payments" on public.payments for update to authenticated
using (exists(select 1 from public.orders o where o.id=order_id and
  public.has_backoffice_role(array['accountant']::public.app_role[])))
with check (exists(select 1 from public.orders o where o.id=order_id and
  public.has_backoffice_role(array['accountant']::public.app_role[])));
create policy "backoffice append order history" on public.order_status_history for insert to authenticated
with check (changed_by=auth.uid() and (
  public.has_backoffice_role(array['call_center','operations']::public.app_role[])
  or exists(select 1 from public.orders o where o.id=order_id and public.can_access_branch(o.branch_id))
));

grant insert on public.orders, public.order_items, public.payments, public.order_status_history to authenticated;
grant update (branch_id,status,accepted_at,completed_at,payment_status) on public.orders to authenticated;
grant update (status,provider_transaction_id,updated_at) on public.payments to authenticated;

create or replace function public.create_call_center_order(
  _branch_id uuid, _fulfillment text, _customer_name text, _customer_phone text,
  _address jsonb, _notes text, _items jsonb
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare
  v_order_id uuid;
  v_order_number bigint;
  v_subtotal numeric(12,2) := 0;
  v_item jsonb;
  v_variant record;
  v_qty integer;
begin
  if not public.has_backoffice_role(array['call_center']::public.app_role[]) then
    raise exception 'not_authorized' using errcode='42501';
  end if;
  if _fulfillment not in ('delivery','pickup') then raise exception 'invalid_fulfillment'; end if;
  if length(trim(_customer_name)) < 2 or length(regexp_replace(_customer_phone,'[^0-9]','','g')) < 10 then
    raise exception 'invalid_customer';
  end if;
  if jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) < 1 or jsonb_array_length(_items) > 30 then
    raise exception 'invalid_items';
  end if;
  if _fulfillment='delivery' and (_address is null or coalesce(trim(_address->>'area'),'')='' or coalesce(trim(_address->>'street'),'')='') then
    raise exception 'address_required';
  end if;
  if not exists(select 1 from public.branches b where b.id=_branch_id and b.is_active
    and ((_fulfillment='delivery' and b.accepts_delivery) or (_fulfillment='pickup' and b.accepts_pickup))) then
    raise exception 'branch_unavailable';
  end if;

  insert into public.orders(branch_id,fulfillment,payment_method,payment_status,status,customer_name,customer_phone,
    delivery_address_snapshot,customer_notes,subtotal,discount_total,delivery_fee,total,idempotency_key,source,created_by)
  values(_branch_id,_fulfillment::public.fulfillment_type,'cash','pending','pending_confirmation',
    trim(_customer_name),trim(_customer_phone),case when _fulfillment='delivery' then _address else null end,
    nullif(trim(_notes),''),0,0,0,0,gen_random_uuid()::text,'call_center',auth.uid())
  returning id,order_number into v_order_id,v_order_number;

  for v_item in select value from jsonb_array_elements(_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 20 then raise exception 'invalid_quantity'; end if;
    select pv.id,pv.product_id,pv.name_ar as variant_name_ar,pv.name_en as variant_name_en,
      pv.sku as variant_sku,pv.base_price,p.name_ar as product_name_ar,p.name_en as product_name_en,p.sku as product_sku
    into v_variant
    from public.product_variants pv join public.products p on p.id=pv.product_id
    where pv.id=(v_item->>'variant_id')::uuid and pv.is_active and p.is_active;
    if not found then raise exception 'product_unavailable'; end if;
    insert into public.order_items(order_id,product_id,variant_id,product_name_ar,product_name_en,
      variant_name_ar,variant_name_en,sku_snapshot,quantity,unit_price,line_total,addons_snapshot)
    values(v_order_id,v_variant.product_id,v_variant.id,v_variant.product_name_ar,v_variant.product_name_en,
      v_variant.variant_name_ar,v_variant.variant_name_en,coalesce(v_variant.variant_sku,v_variant.product_sku),
      v_qty,v_variant.base_price,v_variant.base_price*v_qty,'[]'::jsonb);
    v_subtotal := v_subtotal + (v_variant.base_price*v_qty);
  end loop;

  update public.orders set subtotal=v_subtotal,total=v_subtotal where id=v_order_id;
  insert into public.payments(order_id,provider,amount,currency,status)
  values(v_order_id,'cash',v_subtotal,'EGP','pending');
  insert into public.order_status_history(order_id,old_status,new_status,changed_by,note)
  values(v_order_id,null,'pending_confirmation',auth.uid(),'تم تسجيل الطلب بواسطة الكول سنتر');
  return jsonb_build_object('id',v_order_id,'order_number',v_order_number,'total',v_subtotal);
end;
$$;
revoke all on function public.create_call_center_order(uuid,text,text,text,jsonb,text,jsonb) from public;
grant execute on function public.create_call_center_order(uuid,text,text,text,jsonb,text,jsonb) to authenticated;
