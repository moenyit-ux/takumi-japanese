alter table public.session_progress
  add column if not exists learning_status text not null default 'not_started';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.session_progress'::regclass
      and conname = 'session_progress_learning_status_check'
  ) then
    alter table public.session_progress
      add constraint session_progress_learning_status_check
      check (learning_status = any (array['not_started'::text, 'review'::text, 'learned'::text]));
  end if;
end $$;

create or replace function private.set_material_learning_status(
  p_session_id uuid,
  p_learning_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_allowed boolean := false;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_learning_status not in ('not_started', 'review', 'learned') then
    raise exception 'invalid_learning_status' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.learning_sessions s
    where s.id = p_session_id
      and s.content_status = 'published'
      and (
        s.access_tier = 'free'
        or exists (
          select 1
          from public.entitlements e
          where e.user_id = v_user
            and e.level_id = s.level_id
            and e.active = true
            and e.starts_at <= now()
            and (e.ends_at is null or e.ends_at > now())
        )
      )
  ) into v_allowed;

  if not v_allowed then
    raise exception 'session_not_available' using errcode = '42501';
  end if;

  insert into public.session_progress as sp
    (user_id, session_id, read_percent, status, learning_status)
  values
    (v_user, p_session_id, 0, 'not_started', p_learning_status)
  on conflict (user_id, session_id) do update set
    learning_status = excluded.learning_status,
    updated_at = now();

  return jsonb_build_object(
    'session_id', p_session_id,
    'learning_status', p_learning_status
  );
end;
$$;

create or replace function public.set_material_learning_status(
  p_session_id uuid,
  p_learning_status text
)
returns jsonb
language sql
set search_path = ''
as $$
  select private.set_material_learning_status(p_session_id, p_learning_status);
$$;

revoke all on function public.set_material_learning_status(uuid, text) from public, anon;
grant execute on function public.set_material_learning_status(uuid, text) to authenticated;

create or replace function private.admin_create_material(
  p_level_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text;
  v_session_id uuid;
  v_session_no integer;
  v_title text;
  v_slug text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not (select private.takumi_is_content_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select code into v_code
  from public.levels
  where id = p_level_id;

  if not found then
    raise exception 'level_not_found' using errcode = 'P0002';
  end if;

  select s.id, s.session_no
  into v_session_id, v_session_no
  from public.learning_sessions s
  where s.level_id = p_level_id
    and s.created_by is null
    and s.content_status = 'draft'
    and not exists (
      select 1 from public.content_blocks b where b.session_id = s.id
    )
    and not exists (
      select 1 from public.session_progress sp where sp.session_id = s.id
    )
  order by s.session_no
  limit 1
  for update of s skip locked;

  if v_session_id is null then
    select coalesce(max(s.session_no), 0) + 1
    into v_session_no
    from public.learning_sessions s
    where s.level_id = p_level_id;

    v_title := 'Materi ' || v_code || ' ' || lpad(v_session_no::text, 2, '0');
    v_slug := 'materi-' || lower(v_code) || '-' || lpad(v_session_no::text, 3, '0');

    insert into public.learning_sessions
      (level_id, session_no, title, slug, summary, estimated_minutes, access_tier, content_status, created_by)
    values
      (p_level_id, v_session_no, v_title, v_slug, null, 30, 'paid', 'draft', v_uid)
    returning id into v_session_id;

    insert into public.quizzes
      (level_id, session_id, kind, title, pass_score, time_limit_minutes, published)
    values
      (p_level_id, v_session_id, 'session', 'Latihan ' || v_title, 70, null, false);
  else
    v_title := 'Materi ' || v_code || ' ' || lpad(v_session_no::text, 2, '0');

    update public.learning_sessions
    set title = v_title,
        summary = null,
        estimated_minutes = 30,
        created_by = v_uid,
        updated_at = now()
    where id = v_session_id;

    update public.quizzes
    set title = 'Latihan ' || v_title,
        updated_at = now()
    where session_id = v_session_id
      and kind = 'session';
  end if;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_session_id,
    'session_no', v_session_no,
    'title', v_title,
    'level_code', v_code
  );
end;
$$;

create or replace function public.admin_create_material(
  p_level_id uuid
)
returns jsonb
language sql
set search_path = ''
as $$
  select private.admin_create_material(p_level_id);
$$;

revoke all on function public.admin_create_material(uuid) from public, anon;
grant execute on function public.admin_create_material(uuid) to authenticated;
