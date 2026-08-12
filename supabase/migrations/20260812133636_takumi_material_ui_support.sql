alter table public.bookmarks
  add column if not exists content_block_id uuid references public.content_blocks(id) on delete cascade;

alter table public.bookmarks
  alter column question_id drop not null;

alter table public.bookmarks
  drop constraint if exists bookmarks_target_check;

alter table public.bookmarks
  add constraint bookmarks_target_check check (
    (question_id is not null and content_block_id is null)
    or (question_id is null and content_block_id is not null)
  );

create unique index if not exists bookmarks_user_content_block_key
  on public.bookmarks(user_id, content_block_id)
  where content_block_id is not null;

create or replace function private.get_attempt_review(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_attempt public.quiz_attempts%rowtype;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_attempt
  from public.quiz_attempts
  where id = p_attempt_id
    and user_id = v_user
    and submitted_at is not null;

  if not found then
    raise exception 'attempt_review_not_available' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'attempt_no', v_attempt.attempt_no,
    'score', v_attempt.score,
    'result_status', v_attempt.result_status,
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'position', q.position,
          'kind', q.kind,
          'prompt', q.prompt,
          'selected_option_id', a.selected_option_id,
          'selected_option_text', selected_option.option_text,
          'correct_option_id', correct_option.id,
          'correct_option_text', correct_option.option_text,
          'is_correct', coalesce(a.is_correct, false),
          'explanation_id', q.explanation_id,
          'explanation_text', q.explanation_text
        ) order by q.position
      )
      from public.quiz_answers a
      join public.quiz_questions q on q.id = a.question_id
      left join public.question_options selected_option on selected_option.id = a.selected_option_id
      left join lateral (
        select o.id, o.option_text
        from public.question_options o
        where o.question_id = q.id and o.is_correct = true
        order by o.position
        limit 1
      ) correct_option on true
      where a.attempt_id = v_attempt.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_attempt_review(p_attempt_id uuid)
returns jsonb
language sql
set search_path = ''
as $$
  select private.get_attempt_review(p_attempt_id);
$$;

revoke all on function public.get_attempt_review(uuid) from public, anon;
grant execute on function public.get_attempt_review(uuid) to authenticated;
