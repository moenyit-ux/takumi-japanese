create or replace function private.takumi_register_device(
  p_fingerprint text,
  p_device_name text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

  select * into v_existing
  from public.user_devices
  where user_id = v_uid and device_fingerprint = p_fingerprint;

  if found then
    if v_existing.revoked_at is not null then
      select count(*)::integer into v_active
      from public.user_devices where user_id = v_uid and revoked_at is null;
      return jsonb_build_object('allowed', false, 'reason', 'revoked', 'active_count', v_active, 'limit', 2);
    end if;

    update public.user_devices
      set last_seen_at = now(), device_name = coalesce(nullif(left(p_device_name, 120), ''), device_name)
      where id = v_existing.id returning id into v_id;

    select count(*)::integer into v_active
    from public.user_devices where user_id = v_uid and revoked_at is null;
    return jsonb_build_object('allowed', true, 'device_id', v_id, 'active_count', v_active, 'limit', 2);
  end if;

  select count(*)::integer into v_active
  from public.user_devices where user_id = v_uid and revoked_at is null;

  if v_active >= 2 then
    return jsonb_build_object('allowed', false, 'reason', 'limit', 'active_count', v_active, 'limit', 2);
  end if;

  insert into public.user_devices(user_id, device_fingerprint, device_name, last_seen_at)
  values (v_uid, p_fingerprint, nullif(left(p_device_name, 120), ''), now()) returning id into v_id;

  return jsonb_build_object('allowed', true, 'device_id', v_id, 'active_count', v_active + 1, 'limit', 2);
end;
$$;