create or replace function private.takumi_admin_finalize_account_deletion(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_user uuid;
  v_role text;
  v_requested_at timestamptz;
  v_payment_count integer;
  v_deleted integer;
begin
  if private.takumi_current_role() <> 'super_admin' then raise exception 'Super Admin required'; end if;

  select dr.user_id, dr.requested_at, p.role into v_user, v_requested_at, v_role
  from public.deletion_requests dr join public.profiles p on p.id = dr.user_id
  where dr.id = p_request_id and dr.status in ('confirmed','processing');

  if v_user is null then raise exception 'Deletion request is not ready'; end if;
  if v_user = v_admin then raise exception 'Super Admin cannot delete their own account here'; end if;
  if v_role <> 'student' then raise exception 'Admin/content accounts must transfer responsibilities before deletion'; end if;
  if exists (select 1 from storage.objects o where o.owner = v_user) then raise exception 'Storage objects must be removed before deleting this account'; end if;

  select count(*)::integer into v_payment_count from public.payments where user_id = v_user;
  insert into private.account_deletion_audit(request_id, user_hash, requested_at, retained_payment_count, processed_by)
  values (p_request_id, pg_catalog.encode(extensions.digest(v_user::text, 'sha256'), 'hex'), v_requested_at, v_payment_count, v_admin);

  update public.payments set user_id = null, proof_url = null, anonymized_at = now() where user_id = v_user;
  delete from auth.users where id = v_user;
  get diagnostics v_deleted = row_count;
  if v_deleted <> 1 then raise exception 'Auth user deletion failed'; end if;

  return jsonb_build_object('deleted', true, 'retained_payments', v_payment_count);
end;
$$;