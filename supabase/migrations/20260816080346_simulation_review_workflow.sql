alter table public.quizzes
  add column if not exists review_status text not null default 'saved',
  add column if not exists review_note text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.quizzes drop constraint if exists quizzes_review_status_check;
alter table public.quizzes
  add constraint quizzes_review_status_check
  check (review_status in ('saved','needs_revision','approved'));

update public.quizzes
set review_status = case when published then 'approved' else 'saved' end
where kind = 'simulation';

create or replace function private.admin_list_simulation_packages(p_level_code text)
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

  select jsonb_build_object(
    'level', jsonb_build_object('id', l.id, 'code', l.code, 'name', l.name),
    'packages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'title', q.title,
          'pass_score', q.pass_score,
          'time_limit_minutes', q.time_limit_minutes,
          'section_label', q.section_label,
          'published', q.published,
          'review_status', q.review_status,
          'review_note', q.review_note,
          'question_count', (select count(*) from public.quiz_questions qq where qq.quiz_id = q.id),
          'language_count', (select count(*) from public.quiz_questions qq where qq.quiz_id = q.id and qq.kind = 'multiple_choice'),
          'reading_count', (select count(*) from public.quiz_questions qq where qq.quiz_id = q.id and qq.kind = 'reading'),
          'listening_count', (select count(*) from public.quiz_questions qq where qq.quiz_id = q.id and qq.kind = 'listening')
        )
        order by coalesce(nullif(regexp_replace(q.title, '^.*Paket[[:space:]]+([0-9]+).*$','\1'), q.title)::integer, 999), q.created_at
      )
      from public.quizzes q
      where q.level_id = l.id and q.kind = 'simulation'
    ), '[]'::jsonb)
  ) into v_result
  from public.levels l
  where l.code = p_level_code;

  if v_result is null then
    raise exception 'level_not_found' using errcode = 'P0002';
  end if;
  return v_result;
end;
$$;

create or replace function private.admin_get_simulation_editor(p_quiz_id uuid)
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

  select jsonb_build_object(
    'role', private.takumi_current_role(),
    'level', jsonb_build_object('id', l.id, 'code', l.code, 'name', l.name),
    'quiz', jsonb_build_object(
      'id', q.id,
      'title', q.title,
      'pass_score', q.pass_score,
      'time_limit_minutes', q.time_limit_minutes,
      'section_label', q.section_label,
      'published', q.published,
      'review_status', q.review_status,
      'review_note', q.review_note,
      'reviewed_by', q.reviewed_by,
      'reviewed_at', q.reviewed_at,
      'attempt_count', (select count(*) from public.quiz_attempts a where a.quiz_id = q.id),
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
    )
  ) into v_result
  from public.quizzes q
  join public.levels l on l.id = q.level_id
  where q.id = p_quiz_id and q.kind = 'simulation';

  if v_result is null then
    raise exception 'simulation_not_found' using errcode = 'P0002';
  end if;
  return v_result;
end;
$$;

create or replace function private.admin_set_simulation_review_status(
  p_quiz_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_language_count integer;
  v_reading_count integer;
  v_listening_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not (select private.takumi_is_super_admin()) then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;
  if p_status not in ('needs_revision','approved') then
    raise exception 'invalid_simulation_review_status' using errcode = '22023';
  end if;
  if p_status = 'needs_revision' and nullif(btrim(coalesce(p_note,'')),'') is null then
    raise exception 'revision_note_required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.quizzes q where q.id = p_quiz_id and q.kind = 'simulation') then
    raise exception 'simulation_not_found' using errcode = 'P0002';
  end if;

  if p_status = 'approved' then
    select
      count(*) filter (where qq.kind = 'multiple_choice'),
      count(*) filter (where qq.kind = 'reading'),
      count(*) filter (where qq.kind = 'listening')
    into v_language_count, v_reading_count, v_listening_count
    from public.quiz_questions qq
    where qq.quiz_id = p_quiz_id;

    if coalesce(v_language_count,0) = 0 or coalesce(v_reading_count,0) = 0 or coalesce(v_listening_count,0) = 0 then
      raise exception 'simulation_requires_all_sections' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.quiz_questions qq
      where qq.quiz_id = p_quiz_id
        and (
          (select count(*) from public.question_options qo where qo.question_id = qq.id) < 2
          or (select count(*) from public.question_options qo where qo.question_id = qq.id and qo.is_correct) <> 1
        )
    ) then
      raise exception 'publish_requires_valid_options' using errcode = '22023';
    end if;
  end if;

  update public.quizzes
  set review_status = p_status,
      review_note = case when p_status = 'approved' then null else nullif(btrim(coalesce(p_note,'')),'') end,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      published = (p_status = 'approved'),
      updated_at = now()
  where id = p_quiz_id and kind = 'simulation'
  returning jsonb_build_object(
    'id', id,
    'review_status', review_status,
    'review_note', review_note,
    'reviewed_by', reviewed_by,
    'reviewed_at', reviewed_at,
    'published', published
  ) into v_result;

  if v_result is null then
    raise exception 'simulation_not_found' using errcode = 'P0002';
  end if;
  return v_result;
end;
$$;

create or replace function public.admin_set_simulation_review_status(
  p_quiz_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.admin_set_simulation_review_status(p_quiz_id,p_status,p_note);
$$;

revoke all on function private.admin_set_simulation_review_status(uuid,text,text) from public, anon;
revoke all on function public.admin_set_simulation_review_status(uuid,text,text) from public, anon;
grant execute on function private.admin_set_simulation_review_status(uuid,text,text) to authenticated;
grant execute on function public.admin_set_simulation_review_status(uuid,text,text) to authenticated;

create or replace function private.reset_simulation_review_from_question()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quiz_id uuid;
begin
  if tg_op = 'DELETE' then
    v_quiz_id := old.quiz_id;
  else
    v_quiz_id := new.quiz_id;
  end if;

  update public.quizzes
  set review_status = 'saved',
      review_note = null,
      reviewed_by = null,
      reviewed_at = null,
      published = false,
      updated_at = now()
  where id = v_quiz_id
    and kind = 'simulation'
    and (review_status <> 'saved' or published or review_note is not null or reviewed_by is not null or reviewed_at is not null);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.reset_simulation_review_from_option()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question_id uuid;
  v_quiz_id uuid;
begin
  if tg_op = 'DELETE' then
    v_question_id := old.question_id;
  else
    v_question_id := new.question_id;
  end if;

  select qq.quiz_id into v_quiz_id
  from public.quiz_questions qq
  where qq.id = v_question_id;

  if v_quiz_id is not null then
    update public.quizzes
    set review_status = 'saved',
        review_note = null,
        reviewed_by = null,
        reviewed_at = null,
        published = false,
        updated_at = now()
    where id = v_quiz_id
      and kind = 'simulation'
      and (review_status <> 'saved' or published or review_note is not null or reviewed_by is not null or reviewed_at is not null);
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_reset_simulation_review_question on public.quiz_questions;
create trigger trg_reset_simulation_review_question
after insert or update or delete on public.quiz_questions
for each row execute function private.reset_simulation_review_from_question();

drop trigger if exists trg_reset_simulation_review_option on public.question_options;
create trigger trg_reset_simulation_review_option
after insert or update or delete on public.question_options
for each row execute function private.reset_simulation_review_from_option();

revoke all on function private.reset_simulation_review_from_question() from public, anon, authenticated;
revoke all on function private.reset_simulation_review_from_option() from public, anon, authenticated;
