-- Move privileged payment work into the private schema and expose only SECURITY INVOKER wrappers.

create or replace function private.submit_manual_payment(p_level_id uuid,p_plan_code text,p_payment_method_id uuid,p_proof_url text,p_reference_no text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid()); v_plan public.premium_plans%rowtype; v_level public.levels%rowtype; v_method public.payment_methods%rowtype; v_path text; v_payment public.payments%rowtype;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  select * into v_level from public.levels where id=p_level_id; if not found then raise exception 'invalid_level' using errcode='22023'; end if;
  select * into v_plan from public.premium_plans where code=lower(trim(p_plan_code)) and active=true; if not found then raise exception 'invalid_plan' using errcode='22023'; end if;
  select * into v_method from public.payment_methods where id=p_payment_method_id and active=true; if not found then raise exception 'invalid_payment_method' using errcode='22023'; end if;
  if p_proof_url is null or p_proof_url not like ('storage://payment-proofs/'||v_user::text||'/%') then raise exception 'invalid_payment_proof' using errcode='22023'; end if;
  v_path:=substring(p_proof_url from length('storage://payment-proofs/')+1);
  if not exists(select 1 from storage.objects o where o.bucket_id='payment-proofs' and o.name=v_path) then raise exception 'payment_proof_not_found' using errcode='22023'; end if;
  if exists(select 1 from public.payments p where p.user_id=v_user and p.level_id=p_level_id and p.status='pending') then raise exception 'payment_already_pending_for_level' using errcode='23505'; end if;
  insert into public.payments(user_id,level_id,plan_id,payment_method_id,package_code,amount_yen,duration_months,currency,reference_no,proof_url,status)
  values(v_user,v_level.id,v_plan.id,v_method.id,upper(v_level.code)||'_'||upper(v_plan.code),v_plan.amount_yen,v_plan.duration_months,'JPY',nullif(trim(coalesce(p_reference_no,'')),''),p_proof_url,'pending') returning * into v_payment;
  return jsonb_build_object('id',v_payment.id,'status',v_payment.status,'level',v_level.code,'plan',v_plan.name,'amount_yen',v_payment.amount_yen,'submitted_at',v_payment.submitted_at);
end;$$;
revoke all on function private.submit_manual_payment(uuid,text,uuid,text,text) from public,anon; grant execute on function private.submit_manual_payment(uuid,text,uuid,text,text) to authenticated;
create or replace function public.submit_manual_payment(p_level_id uuid,p_plan_code text,p_payment_method_id uuid,p_proof_url text,p_reference_no text default null)
returns jsonb language sql security invoker set search_path='' as $$ select private.submit_manual_payment(p_level_id,p_plan_code,p_payment_method_id,p_proof_url,p_reference_no); $$;

create or replace function private.admin_list_payments(p_status text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb; begin
  if not private.takumi_is_super_admin() then raise exception 'super_admin_required' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.submitted_at desc),'[]'::jsonb) into v_result from (
    select p.id,p.user_id,u.email,pr.full_name,p.level_id,l.code as level_code,p.plan_id,pp.code as plan_code,pp.name as plan_name,p.payment_method_id,pm.label as payment_method,p.package_code,p.amount_yen,p.duration_months,p.currency,p.reference_no,p.proof_url,p.status,p.submitted_at,p.verified_at,p.verified_by,p.admin_note
    from public.payments p join auth.users u on u.id=p.user_id left join public.profiles pr on pr.id=p.user_id join public.levels l on l.id=p.level_id join public.premium_plans pp on pp.id=p.plan_id join public.payment_methods pm on pm.id=p.payment_method_id where p_status is null or p.status=p_status
  ) x; return v_result; end;$$;
revoke all on function private.admin_list_payments(text) from public,anon; grant execute on function private.admin_list_payments(text) to authenticated;
create or replace function public.admin_list_payments(p_status text default null) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_list_payments(p_status); $$;

create or replace function private.admin_set_payment_status(p_payment_id uuid,p_status text,p_admin_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_admin uuid:=(select auth.uid()); v_payment public.payments%rowtype; v_level public.levels%rowtype; v_base timestamptz; v_entitlement_id uuid;
begin
  if not private.takumi_is_super_admin() then raise exception 'super_admin_required' using errcode='42501'; end if;
  if p_status not in ('verified','rejected','refunded') then raise exception 'invalid_payment_status' using errcode='22023'; end if;
  select * into v_payment from public.payments where id=p_payment_id for update; if not found then raise exception 'payment_not_found' using errcode='P0002'; end if;
  select * into v_level from public.levels where id=v_payment.level_id;
  if p_status in ('verified','rejected') and v_payment.status<>'pending' then raise exception 'payment_is_not_pending' using errcode='22023'; end if;
  if p_status='refunded' and v_payment.status<>'verified' then raise exception 'only_verified_payment_can_be_refunded' using errcode='22023'; end if;
  if p_status='verified' then
    select greatest(now(),coalesce(max(e.ends_at),now())) into v_base from public.entitlements e where e.user_id=v_payment.user_id and e.level_id=v_payment.level_id and e.active=true and (e.ends_at is null or e.ends_at>now());
    insert into public.entitlements(user_id,level_id,source,starts_at,ends_at,active,payment_id)
    values(v_payment.user_id,v_payment.level_id,'payment',now(),case when exists(select 1 from public.entitlements e where e.user_id=v_payment.user_id and e.level_id=v_payment.level_id and e.active=true and e.ends_at is null) then null else v_base+make_interval(months=>v_payment.duration_months) end,true,v_payment.id) returning id into v_entitlement_id;
    update public.payments set status='verified',verified_at=now(),verified_by=v_admin,admin_note=nullif(trim(coalesce(p_admin_note,'')),'') where id=v_payment.id;
  elsif p_status='rejected' then update public.payments set status='rejected',verified_at=now(),verified_by=v_admin,admin_note=nullif(trim(coalesce(p_admin_note,'')),'') where id=v_payment.id;
  else update public.payments set status='refunded',verified_at=now(),verified_by=v_admin,admin_note=nullif(trim(coalesce(p_admin_note,'')),'') where id=v_payment.id; update public.entitlements set active=false where payment_id=v_payment.id;
  end if;
  return jsonb_build_object('payment_id',v_payment.id,'status',p_status,'level',v_level.code,'entitlement_id',v_entitlement_id); end;$$;
revoke all on function private.admin_set_payment_status(uuid,text,text) from public,anon; grant execute on function private.admin_set_payment_status(uuid,text,text) to authenticated;
create or replace function public.admin_set_payment_status(p_payment_id uuid,p_status text,p_admin_note text default null) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_set_payment_status(p_payment_id,p_status,p_admin_note); $$;

create or replace function private.admin_upsert_payment_method(p_id uuid,p_label text,p_bank_name text default null,p_account_name text default null,p_account_number text default null,p_instructions text default null,p_active boolean default true)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; begin
  if not private.takumi_is_super_admin() then raise exception 'super_admin_required' using errcode='42501'; end if; if nullif(trim(coalesce(p_label,'')),'') is null then raise exception 'label_required' using errcode='22023'; end if;
  if p_id is null then insert into public.payment_methods(label,bank_name,account_name,account_number,instructions,active) values(trim(p_label),nullif(trim(coalesce(p_bank_name,'')),''),nullif(trim(coalesce(p_account_name,'')),''),nullif(trim(coalesce(p_account_number,'')),''),nullif(trim(coalesce(p_instructions,'')),''),coalesce(p_active,true)) returning id into v_id;
  else update public.payment_methods set label=trim(p_label),bank_name=nullif(trim(coalesce(p_bank_name,'')),''),account_name=nullif(trim(coalesce(p_account_name,'')),''),account_number=nullif(trim(coalesce(p_account_number,'')),''),instructions=nullif(trim(coalesce(p_instructions,'')),''),active=coalesce(p_active,true),updated_at=now() where id=p_id returning id into v_id; if v_id is null then raise exception 'payment_method_not_found' using errcode='P0002'; end if; end if; return v_id; end;$$;
revoke all on function private.admin_upsert_payment_method(uuid,text,text,text,text,text,boolean) from public,anon; grant execute on function private.admin_upsert_payment_method(uuid,text,text,text,text,text,boolean) to authenticated;
create or replace function public.admin_upsert_payment_method(p_id uuid,p_label text,p_bank_name text default null,p_account_name text default null,p_account_number text default null,p_instructions text default null,p_active boolean default true) returns uuid language sql security invoker set search_path='' as $$ select private.admin_upsert_payment_method(p_id,p_label,p_bank_name,p_account_name,p_account_number,p_instructions,p_active); $$;