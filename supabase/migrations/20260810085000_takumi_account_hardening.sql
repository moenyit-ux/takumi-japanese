create unique index if not exists idx_deletion_requests_one_active
  on public.deletion_requests(user_id)
  where status in ('requested','confirmed','processing');

create index if not exists idx_user_devices_user_active
  on public.user_devices(user_id, last_seen_at desc)
  where revoked_at is null;

revoke insert, update, delete on table public.user_devices from authenticated;
revoke insert, update, delete on table public.deletion_requests from authenticated;
grant select on table public.user_devices to authenticated;
grant select on table public.deletion_requests to authenticated;

grant usage on schema private to authenticated;

create or replace function private.takumi_register_device(p_fingerprint text, p_device_name text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.user_devices%rowtype;
  v_active integer;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_fingerprint is null or char_length(p_fingerprint) < 20 or char_length(p_fingerprint) > 128 then
    raise exception 'Invalid device fingerprint';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 0));

  select * into v_existing from public.user_devices
  where user_id = v_uid and device_fingerprint = p_fingerprint;

  if found and v_existing.revoked_at is null then
    update public.user_devices
      set last_seen_at = now(), device_name = coalesce(nullif(left(p_device_name, 120), ''), device_name)
      where id = v_existing.id returning id into v_id;
    select count(*)::integer into v_active from public.user_devices where user_id = v_uid and revoked_at is null;
    return jsonb_build_object('allowed', true, 'device_id', v_id, 'active_count', v_active, 'limit', 2);
  end if;

  select count(*)::integer into v_active from public.user_devices where user_id = v_uid and revoked_at is null;
  if v_active >= 2 then return jsonb_build_object('allowed', false, 'active_count', v_active, 'limit', 2); end if;

  if found then
    update public.user_devices
      set revoked_at = null, last_seen_at = now(), device_name = coalesce(nullif(left(p_device_name, 120), ''), device_name)
      where id = v_existing.id returning id into v_id;
  else
    insert into public.user_devices(user_id, device_fingerprint, device_name, last_seen_at)
    values (v_uid, p_fingerprint, nullif(left(p_device_name, 120), ''), now()) returning id into v_id;
  end if;

  return jsonb_build_object('allowed', true, 'device_id', v_id, 'active_count', v_active + 1, 'limit', 2);
end;
$$;

create or replace function private.takumi_revoke_own_device(p_device_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_count integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  update public.user_devices set revoked_at = now() where id = p_device_id and user_id = v_uid and revoked_at is null;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function private.takumi_request_account_deletion(p_reason text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select id into v_id from public.deletion_requests
    where user_id = v_uid and status in ('requested','confirmed','processing')
    order by requested_at desc limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.deletion_requests(user_id, reason, status)
  values (v_uid, nullif(left(p_reason, 1000), ''), 'requested') returning id into v_id;
  return v_id;
end;
$$;

create or replace function private.takumi_cancel_account_deletion(p_request_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_count integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  update public.deletion_requests set status = 'cancelled', completed_at = now()
  where id = p_request_id and user_id = v_uid and status in ('requested','confirmed');
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function private.takumi_admin_list_users()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if private.takumi_current_role() <> 'super_admin' then raise exception 'Super Admin required'; end if;
  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb) into v_result
  from (
    select u.created_at, jsonb_build_object(
      'id', u.id, 'email', u.email, 'email_confirmed_at', u.email_confirmed_at,
      'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
      'full_name', p.full_name, 'birth_year', p.birth_year, 'role', p.role,
      'devices', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'device_name', d.device_name, 'last_seen_at', d.last_seen_at, 'revoked_at', d.revoked_at) order by d.last_seen_at desc) from public.user_devices d where d.user_id = u.id), '[]'::jsonb),
      'entitlements', coalesce((select jsonb_agg(jsonb_build_object('level', l.code, 'active', e.active, 'starts_at', e.starts_at, 'ends_at', e.ends_at, 'source', e.source) order by l.code, e.created_at desc) from public.entitlements e join public.levels l on l.id = e.level_id where e.user_id = u.id), '[]'::jsonb),
      'deletion_request', (select jsonb_build_object('id', dr.id, 'status', dr.status, 'reason', dr.reason, 'requested_at', dr.requested_at, 'completed_at', dr.completed_at) from public.deletion_requests dr where dr.user_id = u.id order by dr.requested_at desc limit 1)
    ) as row_data
    from auth.users u left join public.profiles p on p.id = u.id
  ) s;
  return v_result;
end;
$$;

create or replace function private.takumi_admin_set_user_role(p_user_id uuid, p_role text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_current text; v_super_count integer;
begin
  if private.takumi_current_role() <> 'super_admin' then raise exception 'Super Admin required'; end if;
  if p_role not in ('student','content_admin','super_admin') then raise exception 'Invalid role'; end if;
  select role into v_current from public.profiles where id = p_user_id;
  if v_current is null then raise exception 'User profile not found'; end if;
  if v_current = 'super_admin' and p_role <> 'super_admin' then
    select count(*)::integer into v_super_count from public.profiles where role = 'super_admin';
    if v_super_count <= 1 then raise exception 'Cannot demote the last Super Admin'; end if;
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  return true;
end;
$$;

create or replace function private.takumi_admin_revoke_device(p_device_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if private.takumi_current_role() <> 'super_admin' then raise exception 'Super Admin required'; end if;
  update public.user_devices set revoked_at = now() where id = p_device_id and revoked_at is null;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function private.takumi_admin_set_deletion_status(p_request_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if private.takumi_current_role() <> 'super_admin' then raise exception 'Super Admin required'; end if;
  if p_status not in ('confirmed','processing','cancelled') then raise exception 'Invalid deletion status'; end if;
  update public.deletion_requests
    set status = p_status, completed_at = case when p_status = 'cancelled' then now() else null end
    where id = p_request_id and status <> 'completed';
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

revoke all on function private.takumi_register_device(text,text) from public;
revoke all on function private.takumi_revoke_own_device(uuid) from public;
revoke all on function private.takumi_request_account_deletion(text) from public;
revoke all on function private.takumi_cancel_account_deletion(uuid) from public;
revoke all on function private.takumi_admin_list_users() from public;
revoke all on function private.takumi_admin_set_user_role(uuid,text) from public;
revoke all on function private.takumi_admin_revoke_device(uuid) from public;
revoke all on function private.takumi_admin_set_deletion_status(uuid,text) from public;

grant execute on function private.takumi_register_device(text,text) to authenticated;
grant execute on function private.takumi_revoke_own_device(uuid) to authenticated;
grant execute on function private.takumi_request_account_deletion(text) to authenticated;
grant execute on function private.takumi_cancel_account_deletion(uuid) to authenticated;
grant execute on function private.takumi_admin_list_users() to authenticated;
grant execute on function private.takumi_admin_set_user_role(uuid,text) to authenticated;
grant execute on function private.takumi_admin_revoke_device(uuid) to authenticated;
grant execute on function private.takumi_admin_set_deletion_status(uuid,text) to authenticated;

create or replace function public.register_current_device(p_fingerprint text, p_device_name text default null)
returns jsonb language sql security invoker set search_path = '' as $$ select private.takumi_register_device(p_fingerprint, p_device_name); $$;
create or replace function public.revoke_own_device(p_device_id uuid)
returns boolean language sql security invoker set search_path = '' as $$ select private.takumi_revoke_own_device(p_device_id); $$;
create or replace function public.request_account_deletion(p_reason text default null)
returns uuid language sql security invoker set search_path = '' as $$ select private.takumi_request_account_deletion(p_reason); $$;
create or replace function public.cancel_account_deletion(p_request_id uuid)
returns boolean language sql security invoker set search_path = '' as $$ select private.takumi_cancel_account_deletion(p_request_id); $$;
create or replace function public.admin_list_users()
returns jsonb language sql security invoker set search_path = '' as $$ select private.takumi_admin_list_users(); $$;
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns boolean language sql security invoker set search_path = '' as $$ select private.takumi_admin_set_user_role(p_user_id, p_role); $$;
create or replace function public.admin_revoke_device(p_device_id uuid)
returns boolean language sql security invoker set search_path = '' as $$ select private.takumi_admin_revoke_device(p_device_id); $$;
create or replace function public.admin_set_deletion_status(p_request_id uuid, p_status text)
returns boolean language sql security invoker set search_path = '' as $$ select private.takumi_admin_set_deletion_status(p_request_id, p_status); $$;

revoke all on function public.register_current_device(text,text) from public, anon;
revoke all on function public.revoke_own_device(uuid) from public, anon;
revoke all on function public.request_account_deletion(text) from public, anon;
revoke all on function public.cancel_account_deletion(uuid) from public, anon;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_set_user_role(uuid,text) from public, anon;
revoke all on function public.admin_revoke_device(uuid) from public, anon;
revoke all on function public.admin_set_deletion_status(uuid,text) from public, anon;

grant execute on function public.register_current_device(text,text) to authenticated;
grant execute on function public.revoke_own_device(uuid) to authenticated;
grant execute on function public.request_account_deletion(text) to authenticated;
grant execute on function public.cancel_account_deletion(uuid) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_user_role(uuid,text) to authenticated;
grant execute on function public.admin_revoke_device(uuid) to authenticated;
grant execute on function public.admin_set_deletion_status(uuid,text) to authenticated;