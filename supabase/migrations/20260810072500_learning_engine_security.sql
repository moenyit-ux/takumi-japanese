-- Applied to Supabase project tckqxueaytwalbfgqyya on 2026-08-10.
-- Keeps grading/progress trusted and prevents answer keys from being exposed to students.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

revoke insert, update, delete, truncate, references, trigger on public.levels, public.learning_sessions, public.content_blocks, public.quizzes, public.quiz_questions, public.question_options from anon, authenticated;

revoke select on public.quiz_questions, public.question_options from anon, authenticated;
grant select (id, quiz_id, position, kind, prompt, passage, audio_url, points, created_at) on public.quiz_questions to authenticated;
grant select (id, question_id, position, label, option_text, created_at) on public.question_options to authenticated;

revoke update on public.profiles from authenticated;
grant update (full_name, birth_year) on public.profiles to authenticated;

revoke insert, update, delete on public.session_progress, public.quiz_attempts, public.quiz_answers from authenticated;

drop policy if exists blocks_read_free_or_entitled on public.content_blocks;
create policy blocks_read_published_free_or_entitled on public.content_blocks for select to authenticated using (
  exists (
    select 1 from public.learning_sessions s
    where s.id = content_blocks.session_id
      and s.content_status = 'published'
      and (
        s.access_tier = 'free'
        or exists (
          select 1 from public.entitlements e
          where e.user_id = (select auth.uid()) and e.level_id = s.level_id and e.active = true
            and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())
        )
      )
  )
);

drop policy if exists questions_read_free_or_entitled on public.quiz_questions;
create policy questions_read_free_or_entitled on public.quiz_questions for select to authenticated using (
  exists (
    select 1 from public.quizzes q
    where q.id = quiz_questions.quiz_id and q.published = true
      and (
        exists (
          select 1 from public.learning_sessions s
          where s.id = q.session_id and s.content_status = 'published' and s.access_tier = 'free'
        )
        or exists (
          select 1 from public.entitlements e
          where e.user_id = (select auth.uid()) and e.level_id = q.level_id and e.active = true
            and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())
        )
      )
  )
);

drop policy if exists options_read_free_or_entitled on public.question_options;
create policy options_read_free_or_entitled on public.question_options for select to authenticated using (
  exists (
    select 1 from public.quiz_questions qq join public.quizzes q on q.id = qq.quiz_id
    where qq.id = question_options.question_id and q.published = true
      and (
        exists (
          select 1 from public.learning_sessions s
          where s.id = q.session_id and s.content_status = 'published' and s.access_tier = 'free'
        )
        or exists (
          select 1 from public.entitlements e
          where e.user_id = (select auth.uid()) and e.level_id = q.level_id and e.active = true
            and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())
        )
      )
  )
);

create or replace function private.save_session_progress(p_session_id uuid, p_read_percent integer, p_last_block_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_allowed boolean := false;
  v_read integer := greatest(0, least(100, coalesce(p_read_percent, 0)));
  v_existing public.session_progress%rowtype;
  v_final_read integer;
  v_pass_score integer;
  v_status text;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '42501'; end if;

  select exists (
    select 1 from public.learning_sessions s
    where s.id = p_session_id and s.content_status = 'published'
      and (
        s.access_tier = 'free'
        or exists (
          select 1 from public.entitlements e
          where e.user_id = v_user and e.level_id = s.level_id and e.active = true
            and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())
        )
      )
  ) into v_allowed;

  if not v_allowed then raise exception 'session_not_available' using errcode = '42501'; end if;

  if p_last_block_id is not null and not exists (
    select 1 from public.content_blocks b where b.id = p_last_block_id and b.session_id = p_session_id
  ) then raise exception 'invalid_last_block' using errcode = '22023'; end if;

  select * into v_existing from public.session_progress
  where user_id = v_user and session_id = p_session_id for update;

  v_final_read := greatest(coalesce(v_existing.read_percent, 0), v_read);
  select q.pass_score into v_pass_score from public.quizzes q
  where q.session_id = p_session_id and q.kind = 'session' and q.published = true
  order by q.created_at limit 1;

  if coalesce(v_existing.status, '') = 'completed'
     or (v_final_read = 100 and v_pass_score is not null and coalesce(v_existing.highest_score, -1) >= v_pass_score)
  then v_status := 'completed'; else v_status := 'in_progress'; end if;

  insert into public.session_progress as sp
    (user_id, session_id, read_percent, last_block_id, status, highest_score, completed_at)
  values
    (v_user, p_session_id, v_final_read, p_last_block_id, v_status, v_existing.highest_score,
     case when v_status = 'completed' then coalesce(v_existing.completed_at, now()) else v_existing.completed_at end)
  on conflict (user_id, session_id) do update set
    read_percent = greatest(sp.read_percent, excluded.read_percent),
    last_block_id = coalesce(excluded.last_block_id, sp.last_block_id),
    status = case when sp.status = 'completed' or excluded.status = 'completed' then 'completed' else 'in_progress' end,
    completed_at = case when sp.status = 'completed' or excluded.status = 'completed' then coalesce(sp.completed_at, excluded.completed_at, now()) else sp.completed_at end,
    updated_at = now();

  return jsonb_build_object('session_id', p_session_id, 'read_percent', v_final_read, 'status', v_status);
end;
$$;

revoke all on function private.save_session_progress(uuid, integer, uuid) from public, anon;
grant execute on function private.save_session_progress(uuid, integer, uuid) to authenticated;

create or replace function public.save_session_progress(p_session_id uuid, p_read_percent integer, p_last_block_id uuid default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.save_session_progress(p_session_id, p_read_percent, p_last_block_id);
$$;
revoke all on function public.save_session_progress(uuid, integer, uuid) from public, anon;
grant execute on function public.save_session_progress(uuid, integer, uuid) to authenticated;

create or replace function private.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb, p_time_spent_seconds integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_quiz public.quizzes%rowtype;
  v_allowed boolean := false;
  v_question_count integer := 0;
  v_wrong_count integer := 0;
  v_total_points numeric := 0;
  v_correct_points numeric := 0;
  v_score numeric(5,2) := 0;
  v_attempt_no integer;
  v_attempt_id uuid;
  v_passed boolean;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'answers_must_be_object' using errcode = '22023'; end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id and published = true;
  if not found then raise exception 'quiz_not_available' using errcode = '42501'; end if;

  if v_quiz.session_id is not null then
    select exists (
      select 1 from public.learning_sessions s
      where s.id = v_quiz.session_id and s.content_status = 'published'
        and (
          s.access_tier = 'free'
          or exists (
            select 1 from public.entitlements e
            where e.user_id = v_user and e.level_id = s.level_id and e.active = true
              and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())
          )
        )
    ) into v_allowed;
  else
    select exists (
      select 1 from public.entitlements e
      where e.user_id = v_user and e.level_id = v_quiz.level_id and e.active = true
        and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())
    ) into v_allowed;
  end if;

  if not v_allowed then raise exception 'quiz_not_available' using errcode = '42501'; end if;

  select count(*), coalesce(sum(q.points), 0),
         coalesce(sum(case when coalesce(o.is_correct, false) then q.points else 0 end), 0),
         count(*) filter (where not coalesce(o.is_correct, false))
  into v_question_count, v_total_points, v_correct_points, v_wrong_count
  from public.quiz_questions q
  left join public.question_options o on o.question_id = q.id and o.id::text = (p_answers ->> q.id::text)
  where q.quiz_id = p_quiz_id;

  if v_question_count = 0 or v_total_points <= 0 then raise exception 'quiz_has_no_questions' using errcode = '22023'; end if;

  v_score := round((v_correct_points / v_total_points) * 100, 2);
  v_passed := v_score >= v_quiz.pass_score;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_user::text || ':' || p_quiz_id::text));
  select coalesce(max(attempt_no), 0) + 1 into v_attempt_no from public.quiz_attempts where user_id = v_user and quiz_id = p_quiz_id;

  insert into public.quiz_attempts (user_id, quiz_id, attempt_no, started_at, submitted_at, score, result_status, time_spent_seconds)
  values (v_user, p_quiz_id, v_attempt_no, now(), now(), v_score,
          case when v_passed then 'passed' else 'failed' end,
          case when p_time_spent_seconds is null then null else greatest(0, p_time_spent_seconds) end)
  returning id into v_attempt_id;

  insert into public.quiz_answers (attempt_id, question_id, selected_option_id, is_correct)
  select v_attempt_id, q.id, o.id, coalesce(o.is_correct, false)
  from public.quiz_questions q
  left join public.question_options o on o.question_id = q.id and o.id::text = (p_answers ->> q.id::text)
  where q.quiz_id = p_quiz_id;

  insert into public.bookmarks as b (user_id, question_id, source, category)
  select v_user, q.id, 'auto_wrong', 'review'
  from public.quiz_questions q
  left join public.question_options o on o.question_id = q.id and o.id::text = (p_answers ->> q.id::text)
  where q.quiz_id = p_quiz_id and not coalesce(o.is_correct, false)
  on conflict (user_id, question_id) do update set
    category = 'review', source = case when b.source = 'manual' then 'manual' else 'auto_wrong' end;

  if v_quiz.session_id is not null then
    insert into public.session_progress as sp (user_id, session_id, read_percent, status, highest_score)
    values (v_user, v_quiz.session_id, 0, 'in_progress', v_score)
    on conflict (user_id, session_id) do update set
      highest_score = greatest(coalesce(sp.highest_score, 0), excluded.highest_score), updated_at = now();

    update public.session_progress set status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now()
    where user_id = v_user and session_id = v_quiz.session_id and read_percent = 100 and highest_score >= v_quiz.pass_score;
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt_id, 'attempt_no', v_attempt_no, 'score', v_score,
    'pass_score', v_quiz.pass_score, 'passed', v_passed,
    'wrong_count', v_wrong_count, 'question_count', v_question_count
  );
end;
$$;

revoke all on function private.submit_quiz_attempt(uuid, jsonb, integer) from public, anon;
grant execute on function private.submit_quiz_attempt(uuid, jsonb, integer) to authenticated;

create or replace function public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb, p_time_spent_seconds integer default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.submit_quiz_attempt(p_quiz_id, p_answers, p_time_spent_seconds);
$$;
revoke all on function public.submit_quiz_attempt(uuid, jsonb, integer) from public, anon;
grant execute on function public.submit_quiz_attempt(uuid, jsonb, integer) to authenticated;
