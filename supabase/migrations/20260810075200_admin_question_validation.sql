-- Harden admin question validation so blank options cannot satisfy publish/edit checks.

create or replace function private.admin_upsert_question(
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
  v_session_id uuid;
  v_status text;
  v_correct_count integer;
  v_option_count integer;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not (select private.takumi_is_content_admin()) then raise exception 'admin_required' using errcode='42501'; end if;

  select q.session_id,s.content_status into v_session_id,v_status
  from public.quizzes q join public.learning_sessions s on s.id=q.session_id
  where q.id=p_quiz_id and q.kind='session' for update of s;
  if not found then raise exception 'session_quiz_not_found' using errcode='P0002'; end if;
  if v_status='published' and not (select private.takumi_is_super_admin()) then raise exception 'published_session_requires_super_admin' using errcode='42501'; end if;
  if p_position is null or p_position<1 then raise exception 'invalid_position' using errcode='22023'; end if;
  if p_kind not in ('multiple_choice','reading','listening') then raise exception 'invalid_question_kind' using errcode='22023'; end if;
  if nullif(btrim(coalesce(p_prompt,'')),'') is null then raise exception 'prompt_required' using errcode='22023'; end if;
  if p_points is null or p_points<=0 then raise exception 'invalid_points' using errcode='22023'; end if;
  if p_options is null or jsonb_typeof(p_options)<>'array' then raise exception 'options_must_be_array' using errcode='22023'; end if;

  select count(*),count(*) filter(where coalesce((value->>'is_correct')::boolean,false))
  into v_option_count,v_correct_count
  from jsonb_array_elements(p_options)
  where nullif(btrim(coalesce(value->>'option_text','')),'') is not null;

  if v_option_count<2 then raise exception 'at_least_two_options_required' using errcode='22023'; end if;
  if v_correct_count<>1 then raise exception 'exactly_one_correct_option_required' using errcode='22023'; end if;
  if p_question_id is not null and exists(select 1 from public.quiz_answers a where a.question_id=p_question_id) then raise exception 'question_has_attempt_history' using errcode='23503'; end if;

  if p_question_id is null then
    insert into public.quiz_questions (quiz_id,position,kind,prompt,passage,audio_url,explanation_id,explanation_text,points)
    values (p_quiz_id,p_position,p_kind,btrim(p_prompt),nullif(btrim(coalesce(p_passage,'')),''),nullif(btrim(coalesce(p_audio_url,'')),''),nullif(btrim(coalesce(p_explanation_id,'')),''),nullif(btrim(coalesce(p_explanation_text,'')),''),p_points)
    returning id into v_question_id;
  else
    update public.quiz_questions set position=p_position,kind=p_kind,prompt=btrim(p_prompt),
      passage=nullif(btrim(coalesce(p_passage,'')),''),audio_url=nullif(btrim(coalesce(p_audio_url,'')),''),
      explanation_id=nullif(btrim(coalesce(p_explanation_id,'')),''),explanation_text=nullif(btrim(coalesce(p_explanation_text,'')),''),points=p_points
    where id=p_question_id and quiz_id=p_quiz_id returning id into v_question_id;
    if v_question_id is null then raise exception 'question_not_found' using errcode='P0002'; end if;
    delete from public.question_options where question_id=v_question_id;
  end if;

  insert into public.question_options (question_id,position,label,option_text,is_correct)
  select v_question_id,row_number() over(order by ordinality)::integer,
         coalesce(nullif(btrim(value->>'label'),''),chr(64+row_number() over(order by ordinality)::integer)),
         btrim(value->>'option_text'),coalesce((value->>'is_correct')::boolean,false)
  from jsonb_array_elements(p_options) with ordinality
  where nullif(btrim(coalesce(value->>'option_text','')),'') is not null;

  update public.learning_sessions set updated_at=now() where id=v_session_id;
  return v_question_id;
end;
$$;
