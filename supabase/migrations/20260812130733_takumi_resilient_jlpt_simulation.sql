alter table public.quiz_attempts
  add column if not exists remaining_seconds integer,
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists last_saved_at timestamptz,
  add column if not exists offline_seconds integer not null default 0,
  add column if not exists resume_count integer not null default 0;

alter table public.quiz_attempts
  drop constraint if exists quiz_attempts_remaining_seconds_check,
  add constraint quiz_attempts_remaining_seconds_check check (remaining_seconds is null or remaining_seconds >= 0),
  drop constraint if exists quiz_attempts_offline_seconds_check,
  add constraint quiz_attempts_offline_seconds_check check (offline_seconds >= 0),
  drop constraint if exists quiz_attempts_resume_count_check,
  add constraint quiz_attempts_resume_count_check check (resume_count >= 0);

create unique index if not exists quiz_attempts_one_in_progress_per_quiz
  on public.quiz_attempts(user_id, quiz_id)
  where result_status = 'in_progress';

revoke all on table public.quiz_attempts from anon;
revoke all on table public.quiz_answers from anon;
revoke all on table public.quiz_attempts from authenticated;
revoke all on table public.quiz_answers from authenticated;
grant select on table public.quiz_attempts to authenticated;
grant select on table public.quiz_answers to authenticated;

drop policy if exists attempts_insert_own on public.quiz_attempts;
drop policy if exists attempts_update_own on public.quiz_attempts;
drop policy if exists answers_insert_own on public.quiz_answers;
drop policy if exists answers_update_own on public.quiz_answers;

create or replace function private.takumi_simulation_accessible(p_quiz_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.quizzes q
    where q.id = p_quiz_id
      and q.kind = 'simulation'
      and q.published = true
      and q.time_limit_minutes is not null
      and q.time_limit_minutes > 0
      and (
        (q.session_id is not null and exists (
          select 1 from public.learning_sessions s
          where s.id = q.session_id
            and s.content_status = 'published'
            and (
              s.access_tier = 'free'
              or exists (
                select 1 from public.entitlements e
                where e.user_id = p_user
                  and e.level_id = s.level_id
                  and e.active = true
                  and e.starts_at <= now()
                  and (e.ends_at is null or e.ends_at > now())
              )
            )
        ))
        or
        (q.session_id is null and exists (
          select 1 from public.entitlements e
          where e.user_id = p_user
            and e.level_id = q.level_id
            and e.active = true
            and e.starts_at <= now()
            and (e.ends_at is null or e.ends_at > now())
        ))
      )
  );
$$;

create or replace function private.takumi_tick_simulation(p_attempt_id uuid)
returns public.quiz_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_attempt public.quiz_attempts%rowtype;
  v_gap integer := 0;
  v_charge integer := 0;
  v_grace constant integer := 12;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_attempt
  from public.quiz_attempts
  where id = p_attempt_id and user_id = v_user
  for update;

  if not found then
    raise exception 'simulation_attempt_not_found' using errcode = '42501';
  end if;

  if v_attempt.result_status <> 'in_progress' then
    return v_attempt;
  end if;

  if v_attempt.last_heartbeat_at is null then
    update public.quiz_attempts
    set last_heartbeat_at = now(),
        last_saved_at = coalesce(last_saved_at, now())
    where id = p_attempt_id
    returning * into v_attempt;
    return v_attempt;
  end if;

  v_gap := greatest(0, floor(extract(epoch from (now() - v_attempt.last_heartbeat_at)))::integer);
  v_charge := least(v_gap, v_grace);

  update public.quiz_attempts
  set remaining_seconds = greatest(0, coalesce(remaining_seconds, 0) - v_charge),
      offline_seconds = offline_seconds + greatest(0, v_gap - v_grace),
      resume_count = resume_count + case when v_gap > v_grace then 1 else 0 end,
      last_heartbeat_at = now()
  where id = p_attempt_id
  returning * into v_attempt;

  return v_attempt;
end;
$$;

create or replace function private.start_or_resume_simulation(p_quiz_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_quiz public.quizzes%rowtype;
  v_attempt public.quiz_attempts%rowtype;
  v_attempt_no integer;
  v_answers jsonb := '{}'::jsonb;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_quiz
  from public.quizzes
  where id = p_quiz_id and kind = 'simulation' and published = true;

  if not found or v_quiz.time_limit_minutes is null or v_quiz.time_limit_minutes <= 0 then
    raise exception 'simulation_not_available' using errcode = '42501';
  end if;

  if not private.takumi_simulation_accessible(p_quiz_id, v_user) then
    raise exception 'simulation_not_available' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_user::text || ':simulation:' || p_quiz_id::text));

  select * into v_attempt
  from public.quiz_attempts
  where user_id = v_user
    and quiz_id = p_quiz_id
    and result_status = 'in_progress'
  order by attempt_no desc
  limit 1
  for update;

  if not found then
    select coalesce(max(attempt_no), 0) + 1 into v_attempt_no
    from public.quiz_attempts
    where user_id = v_user and quiz_id = p_quiz_id;

    insert into public.quiz_attempts
      (user_id, quiz_id, attempt_no, started_at, result_status, remaining_seconds, last_heartbeat_at, last_saved_at)
    values
      (v_user, p_quiz_id, v_attempt_no, now(), 'in_progress', v_quiz.time_limit_minutes * 60, now(), now())
    returning * into v_attempt;
  else
    v_attempt := private.takumi_tick_simulation(v_attempt.id);
  end if;

  select coalesce(jsonb_object_agg(qa.question_id::text, qa.selected_option_id::text), '{}'::jsonb)
  into v_answers
  from public.quiz_answers qa
  where qa.attempt_id = v_attempt.id and qa.selected_option_id is not null;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'attempt_no', v_attempt.attempt_no,
    'remaining_seconds', coalesce(v_attempt.remaining_seconds, v_quiz.time_limit_minutes * 60),
    'total_seconds', v_quiz.time_limit_minutes * 60,
    'offline_seconds', v_attempt.offline_seconds,
    'resume_count', v_attempt.resume_count,
    'answers', coalesce(v_answers, '{}'::jsonb),
    'expired', coalesce(v_attempt.remaining_seconds, 0) <= 0
  );
end;
$$;

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
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'answers_must_be_object' using errcode = '22023';
  end if;
  if jsonb_object_length(p_answers) > 500 then
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

create or replace function private.finish_simulation_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_attempt public.quiz_attempts%rowtype;
  v_quiz public.quizzes%rowtype;
  v_question_count integer := 0;
  v_wrong_count integer := 0;
  v_total_points numeric := 0;
  v_correct_points numeric := 0;
  v_score numeric(5,2) := 0;
  v_passed boolean := false;
  v_total_seconds integer := 0;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_user::text || ':finish:' || p_attempt_id::text));

  select * into v_attempt
  from public.quiz_attempts
  where id = p_attempt_id and user_id = v_user
  for update;

  if not found then
    raise exception 'simulation_attempt_not_found' using errcode = '42501';
  end if;

  select * into v_quiz from public.quizzes where id = v_attempt.quiz_id and kind = 'simulation';
  if not found then
    raise exception 'simulation_not_available' using errcode = '42501';
  end if;
  v_total_seconds := coalesce(v_quiz.time_limit_minutes, 0) * 60;

  if v_attempt.result_status <> 'in_progress' then
    select count(*) filter (where not coalesce(qa.is_correct, false))
    into v_wrong_count
    from public.quiz_answers qa
    where qa.attempt_id = v_attempt.id;
    select count(*) into v_question_count from public.quiz_questions q where q.quiz_id = v_attempt.quiz_id;
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'attempt_no', v_attempt.attempt_no,
      'score', v_attempt.score,
      'pass_score', v_quiz.pass_score,
      'passed', v_attempt.result_status = 'passed',
      'wrong_count', v_wrong_count,
      'question_count', v_question_count,
      'time_spent_seconds', v_attempt.time_spent_seconds,
      'offline_seconds', v_attempt.offline_seconds,
      'resume_count', v_attempt.resume_count
    );
  end if;

  v_attempt := private.takumi_tick_simulation(v_attempt.id);

  insert into public.quiz_answers (attempt_id, question_id, selected_option_id, is_correct, answered_at)
  select v_attempt.id, q.id, null, false, now()
  from public.quiz_questions q
  where q.quiz_id = v_attempt.quiz_id
    and not exists (
      select 1 from public.quiz_answers qa
      where qa.attempt_id = v_attempt.id and qa.question_id = q.id
    );

  update public.quiz_answers qa
  set is_correct = coalesce((
        select o.is_correct
        from public.question_options o
        where o.id = qa.selected_option_id and o.question_id = qa.question_id
      ), false)
  where qa.attempt_id = v_attempt.id;

  select
    count(*),
    coalesce(sum(q.points), 0),
    coalesce(sum(case when coalesce(qa.is_correct, false) then q.points else 0 end), 0),
    count(*) filter (where not coalesce(qa.is_correct, false))
  into v_question_count, v_total_points, v_correct_points, v_wrong_count
  from public.quiz_questions q
  left join public.quiz_answers qa
    on qa.attempt_id = v_attempt.id and qa.question_id = q.id
  where q.quiz_id = v_attempt.quiz_id;

  if v_question_count = 0 or v_total_points <= 0 then
    raise exception 'quiz_has_no_questions' using errcode = '22023';
  end if;

  v_score := round((v_correct_points / v_total_points) * 100, 2);
  v_passed := v_score >= v_quiz.pass_score;

  update public.quiz_attempts
  set submitted_at = now(),
      score = v_score,
      result_status = case when v_passed then 'passed' else 'failed' end,
      time_spent_seconds = greatest(0, v_total_seconds - coalesce(v_attempt.remaining_seconds, 0)),
      last_saved_at = now()
  where id = v_attempt.id
  returning * into v_attempt;

  insert into public.bookmarks as b (user_id, question_id, source, category)
  select v_user, qa.question_id, 'auto_wrong', 'review'
  from public.quiz_answers qa
  where qa.attempt_id = v_attempt.id and not coalesce(qa.is_correct, false)
  on conflict (user_id, question_id) do update set
    category = 'review',
    source = case when b.source = 'manual' then 'manual' else 'auto_wrong' end;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'attempt_no', v_attempt.attempt_no,
    'score', v_score,
    'pass_score', v_quiz.pass_score,
    'passed', v_passed,
    'wrong_count', v_wrong_count,
    'question_count', v_question_count,
    'time_spent_seconds', v_attempt.time_spent_seconds,
    'offline_seconds', v_attempt.offline_seconds,
    'resume_count', v_attempt.resume_count
  );
end;
$$;

create or replace function public.start_or_resume_simulation(p_quiz_id uuid)
returns jsonb
language sql
set search_path = ''
as $$
  select private.start_or_resume_simulation(p_quiz_id);
$$;

create or replace function public.save_simulation_progress(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language sql
set search_path = ''
as $$
  select private.save_simulation_progress(p_attempt_id, p_answers);
$$;

create or replace function public.finish_simulation_attempt(p_attempt_id uuid)
returns jsonb
language sql
set search_path = ''
as $$
  select private.finish_simulation_attempt(p_attempt_id);
$$;

create or replace function public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb, p_time_spent_seconds integer default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.quizzes q
    where q.id = p_quiz_id and q.kind = 'simulation'
  ) then
    raise exception 'simulation_requires_resumable_engine' using errcode = '22023';
  end if;
  return private.submit_quiz_attempt(p_quiz_id, p_answers, p_time_spent_seconds);
end;
$$;

revoke all on function public.start_or_resume_simulation(uuid) from public, anon;
revoke all on function public.save_simulation_progress(uuid, jsonb) from public, anon;
revoke all on function public.finish_simulation_attempt(uuid) from public, anon;
grant execute on function public.start_or_resume_simulation(uuid) to authenticated;
grant execute on function public.save_simulation_progress(uuid, jsonb) to authenticated;
grant execute on function public.finish_simulation_attempt(uuid) to authenticated;
