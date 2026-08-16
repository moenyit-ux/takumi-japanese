alter table public.entitlements drop constraint if exists entitlements_source_check;
alter table public.entitlements add constraint entitlements_source_check
  check (source = any (array['manual'::text,'payment'::text,'promotion'::text,'course'::text]));

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_level text not null check (course_level = any (array['DASAR'::text,'N5'::text,'N4'::text,'N3'::text])),
  pace text not null default 'regular' check (pace = any (array['regular'::text,'accelerated'::text])),
  status text not null default 'active' check (status = any (array['active'::text,'paused'::text,'completed'::text,'cancelled'::text])),
  starts_at timestamptz not null default now(),
  ends_at timestamptz null,
  premium_level_id uuid null references public.levels(id) on delete set null,
  premium_entitlement_id uuid null unique references public.entitlements(id) on delete set null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_enrollments_date_check check (ends_at is null or ends_at > starts_at)
);

create index if not exists idx_course_enrollments_user on public.course_enrollments(user_id, created_at desc);
create index if not exists idx_course_enrollments_level_status on public.course_enrollments(course_level, status, ends_at);
create unique index if not exists idx_course_enrollments_one_current
  on public.course_enrollments(user_id, course_level)
  where status in ('active','paused');

alter table public.course_enrollments enable row level security;
revoke insert, update, delete on table public.course_enrollments from authenticated;
grant select on table public.course_enrollments to authenticated;

drop policy if exists course_enrollments_select_own on public.course_enrollments;
create policy course_enrollments_select_own on public.course_enrollments
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists course_enrollments_set_updated_at on public.course_enrollments;
create trigger course_enrollments_set_updated_at
  before update on public.course_enrollments
  for each row execute function public.set_updated_at();

create or replace function private.takumi_sync_course_entitlement(p_enrollment_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_enrollment public.course_enrollments%rowtype;
  v_level_id uuid;
  v_entitlement_id uuid;
  v_active boolean;
begin
  select * into v_enrollment
  from public.course_enrollments
  where id = p_enrollment_id;
  if not found then return; end if;

  select l.id into v_level_id
  from public.levels l
  where upper(l.code) = v_enrollment.course_level
  limit 1;

  if v_enrollment.premium_entitlement_id is not null
     and (v_level_id is null or v_enrollment.premium_level_id is distinct from v_level_id) then
    update public.entitlements
      set active = false
      where id = v_enrollment.premium_entitlement_id and source = 'course';
    update public.course_enrollments
      set premium_level_id = null, premium_entitlement_id = null
      where id = v_enrollment.id;
    v_enrollment.premium_entitlement_id := null;
    v_enrollment.premium_level_id := null;
  end if;

  if v_level_id is null then
    update public.course_enrollments
      set premium_level_id = null
      where id = v_enrollment.id and premium_level_id is not null;
    return;
  end if;

  v_active := v_enrollment.status = 'active';

  if v_enrollment.premium_entitlement_id is null then
    insert into public.entitlements(user_id, level_id, source, starts_at, ends_at, active, payment_id)
    values(v_enrollment.user_id, v_level_id, 'course', v_enrollment.starts_at, v_enrollment.ends_at, v_active, null)
    returning id into v_entitlement_id;

    update public.course_enrollments
      set premium_level_id = v_level_id, premium_entitlement_id = v_entitlement_id
      where id = v_enrollment.id;
  else
    update public.entitlements
      set user_id = v_enrollment.user_id,
          level_id = v_level_id,
          starts_at = v_enrollment.starts_at,
          ends_at = v_enrollment.ends_at,
          active = v_active,
          payment_id = null
      where id = v_enrollment.premium_entitlement_id and source = 'course';

    update public.course_enrollments
      set premium_level_id = v_level_id
      where id = v_enrollment.id and premium_level_id is distinct from v_level_id;
  end if;
end;
$$;

create or replace function private.takumi_course_enrollment_sync_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.takumi_sync_course_entitlement(new.id);
  return new;
end;
$$;

drop trigger if exists course_enrollments_sync_premium on public.course_enrollments;
create trigger course_enrollments_sync_premium
  after insert or update of user_id, course_level, status, starts_at, ends_at
  on public.course_enrollments
  for each row execute function private.takumi_course_enrollment_sync_trigger();

create or replace function private.takumi_level_sync_course_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  for v_id in
    select ce.id from public.course_enrollments ce
    where ce.course_level = upper(new.code)
      and ce.status in ('active','paused')
  loop
    perform private.takumi_sync_course_entitlement(v_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists levels_sync_course_premium on public.levels;
create trigger levels_sync_course_premium
  after insert or update of code on public.levels
  for each row execute function private.takumi_level_sync_course_trigger();

create or replace function private.takumi_admin_upsert_course_enrollment(
  p_enrollment_id uuid,
  p_user_id uuid,
  p_course_level text,
  p_pace text,
  p_status text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_course_level text := upper(trim(coalesce(p_course_level,'')));
  v_pace text := lower(trim(coalesce(p_pace,'regular')));
  v_status text := lower(trim(coalesce(p_status,'active')));
  v_starts_at timestamptz := coalesce(p_starts_at, now());
  v_ends_at timestamptz := p_ends_at;
  v_result jsonb;
begin
  if private.takumi_current_role() <> 'super_admin' then raise exception 'Super Admin required'; end if;
  if not exists(select 1 from public.profiles p where p.id = p_user_id and p.role = 'student') then
    raise exception 'Student profile not found';
  end if;
  if v_course_level not in ('DASAR','N5','N4','N3') then raise exception 'Invalid course level'; end if;
  if v_pace not in ('regular','accelerated') then raise exception 'Invalid course pace'; end if;
  if v_status not in ('active','paused','completed','cancelled') then raise exception 'Invalid course status'; end if;

  if v_ends_at is null and v_pace = 'regular' then
    v_ends_at := case v_course_level
      when 'N5' then v_starts_at + interval '6 months'
      when 'N4' then v_starts_at + interval '9 months'
      when 'N3' then v_starts_at + interval '12 months'
      else null
    end;
  end if;
  if v_ends_at is not null and v_ends_at <= v_starts_at then raise exception 'End date must be after start date'; end if;

  update public.course_enrollments
    set status = 'completed'
    where user_id = p_user_id
      and course_level = v_course_level
      and status in ('active','paused')
      and ends_at is not null and ends_at <= now();

  if p_enrollment_id is null then
    if exists(select 1 from public.course_enrollments ce where ce.user_id=p_user_id and ce.course_level=v_course_level and ce.status in ('active','paused')) then
      raise exception 'Student already has a current enrollment for this level';
    end if;
    insert into public.course_enrollments(user_id,course_level,pace,status,starts_at,ends_at,created_by)
    values(p_user_id,v_course_level,v_pace,v_status,v_starts_at,v_ends_at,auth.uid())
    returning id into v_id;
  else
    update public.course_enrollments
      set course_level=v_course_level, pace=v_pace, status=v_status, starts_at=v_starts_at, ends_at=v_ends_at
      where id=p_enrollment_id and user_id=p_user_id
      returning id into v_id;
    if v_id is null then raise exception 'Course enrollment not found'; end if;
  end if;

  select jsonb_build_object(
    'id', ce.id,
    'user_id', ce.user_id,
    'course_level', ce.course_level,
    'pace', ce.pace,
    'status', ce.status,
    'starts_at', ce.starts_at,
    'ends_at', ce.ends_at,
    'premium_level', l.code,
    'premium_ready', ce.premium_entitlement_id is not null
  ) into v_result
  from public.course_enrollments ce
  left join public.levels l on l.id=ce.premium_level_id
  where ce.id=v_id;
  return v_result;
end;
$$;

create or replace function private.takumi_admin_set_course_enrollment_status(p_enrollment_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_status text := lower(trim(coalesce(p_status,''))); v_result jsonb;
begin
  if private.takumi_current_role() <> 'super_admin' then raise exception 'Super Admin required'; end if;
  if v_status not in ('active','paused','completed','cancelled') then raise exception 'Invalid course status'; end if;
  update public.course_enrollments set status=v_status where id=p_enrollment_id;
  if not found then raise exception 'Course enrollment not found'; end if;
  select jsonb_build_object('id',ce.id,'status',ce.status,'course_level',ce.course_level) into v_result
    from public.course_enrollments ce where ce.id=p_enrollment_id;
  return v_result;
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
      'id', u.id,
      'email', u.email,
      'email_confirmed_at', u.email_confirmed_at,
      'created_at', u.created_at,
      'last_sign_in_at', u.last_sign_in_at,
      'full_name', p.full_name,
      'birth_year', p.birth_year,
      'role', p.role,
      'devices', coalesce((
        select jsonb_agg(jsonb_build_object('id',d.id,'device_name',d.device_name,'last_seen_at',d.last_seen_at,'revoked_at',d.revoked_at) order by d.last_seen_at desc)
        from public.user_devices d where d.user_id=u.id
      ), '[]'::jsonb),
      'entitlements', coalesce((
        select jsonb_agg(jsonb_build_object('level',l.code,'active',e.active,'starts_at',e.starts_at,'ends_at',e.ends_at,'source',e.source) order by l.code,e.created_at desc)
        from public.entitlements e join public.levels l on l.id=e.level_id where e.user_id=u.id
      ), '[]'::jsonb),
      'course_enrollments', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',ce.id,
          'course_level',ce.course_level,
          'pace',ce.pace,
          'status',ce.status,
          'starts_at',ce.starts_at,
          'ends_at',ce.ends_at,
          'premium_level',pl.code,
          'premium_ready',ce.premium_entitlement_id is not null,
          'created_at',ce.created_at
        ) order by ce.created_at desc)
        from public.course_enrollments ce
        left join public.levels pl on pl.id=ce.premium_level_id
        where ce.user_id=u.id
      ), '[]'::jsonb),
      'deletion_request', (
        select jsonb_build_object('id',dr.id,'status',dr.status,'reason',dr.reason,'requested_at',dr.requested_at,'completed_at',dr.completed_at)
        from public.deletion_requests dr where dr.user_id=u.id order by dr.requested_at desc limit 1
      )
    ) as row_data
    from auth.users u left join public.profiles p on p.id=u.id
  ) s;
  return v_result;
end;
$$;

revoke all on function private.takumi_sync_course_entitlement(uuid) from public,anon;
revoke all on function private.takumi_admin_upsert_course_enrollment(uuid,uuid,text,text,text,timestamptz,timestamptz) from public,anon;
revoke all on function private.takumi_admin_set_course_enrollment_status(uuid,text) from public,anon;
grant execute on function private.takumi_admin_upsert_course_enrollment(uuid,uuid,text,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function private.takumi_admin_set_course_enrollment_status(uuid,text) to authenticated;

create or replace function public.admin_upsert_course_enrollment(
  p_enrollment_id uuid,
  p_user_id uuid,
  p_course_level text,
  p_pace text,
  p_status text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.takumi_admin_upsert_course_enrollment(p_enrollment_id,p_user_id,p_course_level,p_pace,p_status,p_starts_at,p_ends_at);
$$;

create or replace function public.admin_set_course_enrollment_status(p_enrollment_id uuid,p_status text)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.takumi_admin_set_course_enrollment_status(p_enrollment_id,p_status);
$$;

revoke all on function public.admin_upsert_course_enrollment(uuid,uuid,text,text,text,timestamptz,timestamptz) from public,anon;
revoke all on function public.admin_set_course_enrollment_status(uuid,text) from public,anon;
grant execute on function public.admin_upsert_course_enrollment(uuid,uuid,text,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.admin_set_course_enrollment_status(uuid,text) to authenticated;
