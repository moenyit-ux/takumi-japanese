alter table public.quizzes
  add column if not exists group_no integer;

with numbered as (
  select id,
         row_number() over (
           partition by session_id
           order by created_at, id
         )::integer as next_group_no
  from public.quizzes
  where kind = 'session'
)
update public.quizzes q
set group_no = numbered.next_group_no
from numbered
where q.id = numbered.id
  and q.group_no is null;

alter table public.quizzes drop constraint if exists quizzes_group_no_check;
alter table public.quizzes
  add constraint quizzes_group_no_check
  check (group_no is null or group_no > 0);

create unique index if not exists quizzes_session_group_no_unique
  on public.quizzes (session_id, group_no)
  where kind = 'session' and session_id is not null;

create or replace function private.assign_session_quiz_group_no()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'session' and new.session_id is not null and new.group_no is null then
    select coalesce(max(q.group_no), 0) + 1
    into new.group_no
    from public.quizzes q
    where q.session_id = new.session_id
      and q.kind = 'session';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_session_quiz_group_no on public.quizzes;
create trigger trg_assign_session_quiz_group_no
before insert on public.quizzes
for each row execute function private.assign_session_quiz_group_no();

create or replace function private.admin_get_quiz_groups(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not (select private.takumi_is_content_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.learning_sessions s where s.id = p_session_id) then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'group_no', q.group_no,
    'title', q.title,
    'pass_score', q.pass_score,
    'time_limit_minutes', q.time_limit_minutes,
    'published', q.published,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qq.id,
        'position', qq.position,
        'kind', qq.kind,
        'prompt', qq.prompt,
        'passage', qq.passage,
        'audio_url', qq.audio_url,
        'explanation_id', qq.explanation_id,
        'explanation_text', qq.explanation_text,
        'points', qq.points,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', qo.id,
            'position', qo.position,
            'label', qo.label,
            'option_text', qo.option_text,
            'is_correct', qo.is_correct
          ) order by qo.position)
          from public.question_options qo
          where qo.question_id = qq.id
        ), '[]'::jsonb)
      ) order by qq.position)
      from public.quiz_questions qq
      where qq.quiz_id = q.id
    ), '[]'::jsonb)
  ) order by q.group_no, q.created_at), '[]'::jsonb)
  into v_result
  from public.quizzes q
  where q.session_id = p_session_id
    and q.kind = 'session';

  return v_result;
end;
$$;

create or replace function public.admin_get_quiz_groups(p_session_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.admin_get_quiz_groups(p_session_id);
$$;

revoke all on function private.admin_get_quiz_groups(uuid) from public, anon;
revoke all on function public.admin_get_quiz_groups(uuid) from public, anon;
grant execute on function private.admin_get_quiz_groups(uuid) to authenticated;
grant execute on function public.admin_get_quiz_groups(uuid) to authenticated;

create or replace function private.admin_create_quiz_group(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_level_id uuid;
  v_level_code text;
  v_content_status text;
  v_group_no integer;
  v_quiz_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not (select private.takumi_is_content_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select s.level_id, l.code, s.content_status
  into v_level_id, v_level_code, v_content_status
  from public.learning_sessions s
  join public.levels l on l.id = s.level_id
  where s.id = p_session_id
  for update of s;

  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;
  if v_content_status = 'published' and not (select private.takumi_is_super_admin()) then
    raise exception 'published_session_requires_super_admin' using errcode = '42501';
  end if;

  select coalesce(max(q.group_no), 0) + 1
  into v_group_no
  from public.quizzes q
  where q.session_id = p_session_id
    and q.kind = 'session';

  insert into public.quizzes
    (level_id, session_id, kind, title, pass_score, time_limit_minutes, published, group_no)
  values
    (v_level_id, p_session_id, 'session', 'Kuis ' || v_level_code || ' ' || v_group_no, 70, null, false, v_group_no)
  returning id into v_quiz_id;

  update public.learning_sessions set updated_at = now() where id = p_session_id;

  return jsonb_build_object(
    'id', v_quiz_id,
    'group_no', v_group_no,
    'title', 'Kuis ' || v_level_code || ' ' || v_group_no
  );
end;
$$;

create or replace function public.admin_create_quiz_group(p_session_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.admin_create_quiz_group(p_session_id);
$$;

revoke all on function private.admin_create_quiz_group(uuid) from public, anon;
revoke all on function public.admin_create_quiz_group(uuid) from public, anon;
grant execute on function private.admin_create_quiz_group(uuid) to authenticated;
grant execute on function public.admin_create_quiz_group(uuid) to authenticated;

create or replace function private.admin_delete_quiz_group(p_quiz_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_content_status text;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not (select private.takumi_is_content_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select q.session_id, s.content_status
  into v_session_id, v_content_status
  from public.quizzes q
  join public.learning_sessions s on s.id = q.session_id
  where q.id = p_quiz_id
    and q.kind = 'session'
  for update of s;

  if not found then
    raise exception 'quiz_group_not_found' using errcode = 'P0002';
  end if;
  if v_content_status = 'published' and not (select private.takumi_is_super_admin()) then
    raise exception 'published_session_requires_super_admin' using errcode = '42501';
  end if;
  if exists (select 1 from public.quiz_attempts a where a.quiz_id = p_quiz_id) then
    raise exception 'quiz_group_has_attempt_history' using errcode = '23503';
  end if;
  if exists (
    select 1
    from public.bookmarks b
    join public.quiz_questions qq on qq.id = b.question_id
    where qq.quiz_id = p_quiz_id
  ) then
    raise exception 'quiz_group_has_attempt_history' using errcode = '23503';
  end if;

  delete from public.question_options qo
  using public.quiz_questions qq
  where qo.question_id = qq.id
    and qq.quiz_id = p_quiz_id;
  delete from public.quiz_questions where quiz_id = p_quiz_id;
  delete from public.quizzes where id = p_quiz_id;

  update public.learning_sessions set updated_at = now() where id = v_session_id;
  return true;
end;
$$;

create or replace function public.admin_delete_quiz_group(p_quiz_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.admin_delete_quiz_group(p_quiz_id);
$$;

revoke all on function private.admin_delete_quiz_group(uuid) from public, anon;
revoke all on function public.admin_delete_quiz_group(uuid) from public, anon;
grant execute on function private.admin_delete_quiz_group(uuid) to authenticated;
grant execute on function public.admin_delete_quiz_group(uuid) to authenticated;

create or replace function private.admin_set_quiz_group_published(p_quiz_id uuid, p_published boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question_count integer;
  v_invalid_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not (select private.takumi_is_super_admin()) then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.quizzes q where q.id = p_quiz_id and q.kind = 'session') then
    raise exception 'quiz_group_not_found' using errcode = 'P0002';
  end if;

  if p_published then
    select count(*) into v_question_count
    from public.quiz_questions qq
    where qq.quiz_id = p_quiz_id;

    select count(*) into v_invalid_count
    from public.quiz_questions qq
    where qq.quiz_id = p_quiz_id
      and (
        (select count(*) from public.question_options qo where qo.question_id = qq.id) < 2
        or (select count(*) from public.question_options qo where qo.question_id = qq.id and qo.is_correct) <> 1
      );

    if v_question_count = 0 then
      raise exception 'publish_requires_questions' using errcode = '22023';
    end if;
    if v_invalid_count > 0 then
      raise exception 'publish_requires_valid_options' using errcode = '22023';
    end if;
  end if;

  update public.quizzes
  set published = p_published,
      updated_at = now()
  where id = p_quiz_id;

  return true;
end;
$$;

create or replace function public.admin_set_quiz_group_published(p_quiz_id uuid, p_published boolean)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.admin_set_quiz_group_published(p_quiz_id, p_published);
$$;

revoke all on function private.admin_set_quiz_group_published(uuid, boolean) from public, anon;
revoke all on function public.admin_set_quiz_group_published(uuid, boolean) from public, anon;
grant execute on function private.admin_set_quiz_group_published(uuid, boolean) to authenticated;
grant execute on function public.admin_set_quiz_group_published(uuid, boolean) to authenticated;
