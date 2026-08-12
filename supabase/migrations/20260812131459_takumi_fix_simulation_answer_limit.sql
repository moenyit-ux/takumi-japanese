create or replace function private.save_simulation_progress(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_attempt public.quiz_attempts%rowtype;
  v_quiz public.quizzes%rowtype;
  v_answers jsonb := '{}'::jsonb;
  v_saved integer := 0;
  v_answer_count integer := 0;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'answers_must_be_object' using errcode = '22023';
  end if;
  select count(*) into v_answer_count from jsonb_object_keys(p_answers);
  if v_answer_count > 500 then
    raise exception 'too_many_answers' using errcode = '22023';
  end if;

  v_attempt := private.takumi_tick_simulation(p_attempt_id);
  if v_attempt.user_id <> v_user then
    raise exception 'simulation_attempt_not_found' using errcode = '42501';
  end if;
  if v_attempt.result_status <> 'in_progress' then
    raise exception 'simulation_already_submitted' using errcode = '22023';
  end if;

  select * into v_quiz from public.quizzes where id = v_attempt.quiz_id and kind = 'simulation';
  if not found then
    raise exception 'simulation_not_available' using errcode = '42501';
  end if;

  insert into public.quiz_answers as qa (attempt_id, question_id, selected_option_id, is_correct, answered_at)
  select
    v_attempt.id,
    q.id,
    o.id,
    null,
    now()
  from jsonb_each_text(p_answers) a(key, value)
  join public.quiz_questions q
    on q.quiz_id = v_attempt.quiz_id and q.id::text = a.key
  join public.question_options o
    on o.question_id = q.id and o.id::text = a.value
  on conflict (attempt_id, question_id) do update set
    selected_option_id = excluded.selected_option_id,
    is_correct = null,
    answered_at = now();

  get diagnostics v_saved = row_count;

  update public.quiz_attempts
  set last_saved_at = now()
  where id = v_attempt.id
  returning * into v_attempt;

  select coalesce(jsonb_object_agg(qa.question_id::text, qa.selected_option_id::text), '{}'::jsonb)
  into v_answers
  from public.quiz_answers qa
  where qa.attempt_id = v_attempt.id and qa.selected_option_id is not null;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'attempt_no', v_attempt.attempt_no,
    'remaining_seconds', coalesce(v_attempt.remaining_seconds, 0),
    'total_seconds', v_quiz.time_limit_minutes * 60,
    'offline_seconds', v_attempt.offline_seconds,
    'resume_count', v_attempt.resume_count,
    'saved_count', v_saved,
    'answers', coalesce(v_answers, '{}'::jsonb),
    'expired', coalesce(v_attempt.remaining_seconds, 0) <= 0
  );
end;
$$;
