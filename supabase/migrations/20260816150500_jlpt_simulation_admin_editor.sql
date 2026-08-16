-- Applied to Supabase project tckqxueaytwalbfgqyya on 2026-08-16.
-- Admin RPCs for listing, reading, creating, editing, and deleting JLPT simulation questions.

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

create or replace function public.admin_list_simulation_packages(p_level_code text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.admin_list_simulation_packages(p_level_code);
$$;

revoke all on function private.admin_list_simulation_packages(text) from public, anon;
revoke all on function public.admin_list_simulation_packages(text) from public, anon;
grant execute on function private.admin_list_simulation_packages(text) to authenticated;
grant execute on function public.admin_list_simulation_packages(text) to authenticated;

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

create or replace function public.admin_get_simulation_editor(p_quiz_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.admin_get_simulation_editor(p_quiz_id);
$$;

revoke all on function private.admin_get_simulation_editor(uuid) from public, anon;
revoke all on function public.admin_get_simulation_editor(uuid) from public, anon;
grant execute on function private.admin_get_simulation_editor(uuid) to authenticated;
grant execute on function public.admin_get_simulation_editor(uuid) to authenticated;

create or replace function private.admin_upsert_simulation_question(
  p_quiz_id uuid,
  p_question_id uuid,
  p_position integer,
  p_kind text,
  p_prompt text,
  p_passage text,
  p_audio_url text,
  p_explanation_id text,
  p_explanation_text text,
  p_points numeric,
  p_options jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question_id uuid;
  v_correct_count integer;
  v_option_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not (select private.takumi_is_content_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.quizzes q where q.id = p_quiz_id and q.kind = 'simulation') then
    raise exception 'simulation_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.quiz_attempts a where a.quiz_id = p_quiz_id) then
    raise exception 'simulation_has_attempt_history' using errcode = '23503';
  end if;
  if p_position is null or p_position < 1 then
    raise exception 'invalid_position' using errcode = '22023';
  end if;
  if p_kind not in ('multiple_choice', 'reading', 'listening') then
    raise exception 'invalid_question_kind' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_prompt, '')), '') is null then
    raise exception 'prompt_required' using errcode = '22023';
  end if;
  if p_points is null or p_points <= 0 then
    raise exception 'invalid_points' using errcode = '22023';
  end if;
  if p_options is null or jsonb_typeof(p_options) <> 'array' then
    raise exception 'options_must_be_array' using errcode = '22023';
  end if;

  select count(*), count(*) filter (where coalesce((value->>'is_correct')::boolean, false))
  into v_option_count, v_correct_count
  from jsonb_array_elements(p_options);

  if v_option_count < 2 then
    raise exception 'at_least_two_options_required' using errcode = '22023';
  end if;
  if v_correct_count <> 1 then
    raise exception 'exactly_one_correct_option_required' using errcode = '22023';
  end if;

  if p_question_id is null then
    insert into public.quiz_questions
      (quiz_id, position, kind, prompt, passage, audio_url, explanation_id, explanation_text, points)
    values
      (p_quiz_id, p_position, p_kind, btrim(p_prompt),
       nullif(btrim(coalesce(p_passage, '')), ''),
       nullif(btrim(coalesce(p_audio_url, '')), ''),
       nullif(btrim(coalesce(p_explanation_id, '')), ''),
       nullif(btrim(coalesce(p_explanation_text, '')), ''),
       p_points)
    returning id into v_question_id;
  else
    update public.quiz_questions
    set position = p_position,
        kind = p_kind,
        prompt = btrim(p_prompt),
        passage = nullif(btrim(coalesce(p_passage, '')), ''),
        audio_url = nullif(btrim(coalesce(p_audio_url, '')), ''),
        explanation_id = nullif(btrim(coalesce(p_explanation_id, '')), ''),
        explanation_text = nullif(btrim(coalesce(p_explanation_text, '')), ''),
        points = p_points
    where id = p_question_id and quiz_id = p_quiz_id
    returning id into v_question_id;

    if v_question_id is null then
      raise exception 'question_not_found' using errcode = 'P0002';
    end if;
    delete from public.question_options where question_id = v_question_id;
  end if;

  insert into public.question_options (question_id, position, label, option_text, is_correct)
  select
    v_question_id,
    ordinality::integer,
    coalesce(nullif(btrim(value->>'label'), ''), chr(64 + ordinality::integer)),
    btrim(coalesce(value->>'option_text', '')),
    coalesce((value->>'is_correct')::boolean, false)
  from jsonb_array_elements(p_options) with ordinality
  where nullif(btrim(coalesce(value->>'option_text', '')), '') is not null;

  if (select count(*) from public.question_options where question_id = v_question_id) < 2 then
    raise exception 'option_text_required' using errcode = '22023';
  end if;

  update public.quizzes set updated_at = now() where id = p_quiz_id;
  return v_question_id;
end;
$$;

create or replace function public.admin_upsert_simulation_question(
  p_quiz_id uuid,
  p_question_id uuid,
  p_position integer,
  p_kind text,
  p_prompt text,
  p_passage text,
  p_audio_url text,
  p_explanation_id text,
  p_explanation_text text,
  p_points numeric,
  p_options jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.admin_upsert_simulation_question(
    p_quiz_id, p_question_id, p_position, p_kind, p_prompt, p_passage,
    p_audio_url, p_explanation_id, p_explanation_text, p_points, p_options
  );
$$;

revoke all on function private.admin_upsert_simulation_question(uuid,uuid,integer,text,text,text,text,text,text,numeric,jsonb) from public, anon;
revoke all on function public.admin_upsert_simulation_question(uuid,uuid,integer,text,text,text,text,text,text,numeric,jsonb) from public, anon;
grant execute on function private.admin_upsert_simulation_question(uuid,uuid,integer,text,text,text,text,text,text,numeric,jsonb) to authenticated;
grant execute on function public.admin_upsert_simulation_question(uuid,uuid,integer,text,text,text,text,text,text,numeric,jsonb) to authenticated;

create or replace function private.admin_delete_simulation_question(p_quiz_id uuid, p_question_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not (select private.takumi_is_content_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.quizzes q where q.id = p_quiz_id and q.kind = 'simulation') then
    raise exception 'simulation_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.quiz_attempts a where a.quiz_id = p_quiz_id) then
    raise exception 'simulation_has_attempt_history' using errcode = '23503';
  end if;

  delete from public.question_options where question_id = p_question_id;
  delete from public.quiz_questions where id = p_question_id and quiz_id = p_quiz_id;
  if not found then
    raise exception 'question_not_found' using errcode = 'P0002';
  end if;
  update public.quizzes set updated_at = now() where id = p_quiz_id;
  return true;
end;
$$;

create or replace function public.admin_delete_simulation_question(p_quiz_id uuid, p_question_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.admin_delete_simulation_question(p_quiz_id, p_question_id);
$$;

revoke all on function private.admin_delete_simulation_question(uuid,uuid) from public, anon;
revoke all on function public.admin_delete_simulation_question(uuid,uuid) from public, anon;
grant execute on function private.admin_delete_simulation_question(uuid,uuid) to authenticated;
grant execute on function public.admin_delete_simulation_question(uuid,uuid) to authenticated;
