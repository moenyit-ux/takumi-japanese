-- Applied to Supabase project tckqxueaytwalbfgqyya on 2026-08-10.
-- Takumi admin content workflow: authoring, review, approval and publishing.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.takumi_current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.role from public.profiles p where p.id = (select auth.uid())), 'student');
$$;

create or replace function private.takumi_is_content_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.takumi_current_role() in ('content_admin', 'super_admin');
$$;

create or replace function private.takumi_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.takumi_current_role() = 'super_admin';
$$;

revoke all on function private.takumi_current_role() from public, anon;
revoke all on function private.takumi_is_content_admin() from public, anon;
revoke all on function private.takumi_is_super_admin() from public, anon;
grant execute on function private.takumi_current_role() to authenticated;
grant execute on function private.takumi_is_content_admin() to authenticated;
grant execute on function private.takumi_is_super_admin() to authenticated;

drop policy if exists sessions_admin_read_all on public.learning_sessions;
create policy sessions_admin_read_all
on public.learning_sessions
for select
to authenticated
using ((select private.takumi_is_content_admin()));

revoke all on public.content_review_notes from anon;
revoke insert, update, delete, truncate, references, trigger on public.content_review_notes from authenticated;
grant select, insert on public.content_review_notes to authenticated;

drop policy if exists review_notes_admin_select on public.content_review_notes;
create policy review_notes_admin_select
on public.content_review_notes
for select
to authenticated
using ((select private.takumi_is_content_admin()));

drop policy if exists review_notes_admin_insert on public.content_review_notes;
create policy review_notes_admin_insert
on public.content_review_notes
for insert
to authenticated
with check ((select private.takumi_is_content_admin()) and author_id = (select auth.uid()));

create or replace function private.admin_get_session_editor(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not (select private.takumi_is_content_admin()) then raise exception 'admin_required' using errcode = '42501'; end if;

  select jsonb_build_object(
    'role', private.takumi_current_role(),
    'session', jsonb_build_object(
      'id', s.id, 'level_id', s.level_id, 'session_no', s.session_no,
      'title', s.title, 'slug', s.slug, 'summary', s.summary,
      'estimated_minutes', s.estimated_minutes, 'access_tier', s.access_tier,
      'content_status', s.content_status, 'published_at', s.published_at,
      'updated_at', s.updated_at, 'level_code', l.code, 'level_name', l.name
    ),
    'blocks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'position', b.position, 'kind', b.kind, 'title', b.title,
        'body', b.body, 'audio_url', b.audio_url, 'image_url', b.image_url,
        'updated_at', b.updated_at
      ) order by b.position)
      from public.content_blocks b where b.session_id = s.id
    ), '[]'::jsonb),
    'quiz', coalesce((
      select jsonb_build_object(
        'id', q.id, 'kind', q.kind, 'title', q.title, 'pass_score', q.pass_score,
        'time_limit_minutes', q.time_limit_minutes, 'published', q.published,
        'questions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', qq.id, 'position', qq.position, 'kind', qq.kind,
            'prompt', qq.prompt, 'passage', qq.passage, 'audio_url', qq.audio_url,
            'explanation_id', qq.explanation_id, 'explanation_text', qq.explanation_text,
            'points', qq.points,
            'options', coalesce((
              select jsonb_agg(jsonb_build_object(
                'id', qo.id, 'position', qo.position, 'label', qo.label,
                'option_text', qo.option_text, 'is_correct', qo.is_correct
              ) order by qo.position)
              from public.question_options qo where qo.question_id = qq.id
            ), '[]'::jsonb)
          ) order by qq.position)
          from public.quiz_questions qq where qq.quiz_id = q.id
        ), '[]'::jsonb)
      )
      from public.quizzes q
      where q.session_id = s.id and q.kind = 'session'
      order by q.created_at limit 1
    ), '{}'::jsonb),
    'review_notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'author_id', n.author_id, 'note', n.note,
        'created_at', n.created_at, 'author_name', p.full_name
      ) order by n.created_at desc)
      from public.content_review_notes n
      left join public.profiles p on p.id = n.author_id
      where n.session_id = s.id
    ), '[]'::jsonb)
  ) into v_result
  from public.learning_sessions s
  join public.levels l on l.id = s.level_id
  where s.id = p_session_id;

  if v_result is null then raise exception 'session_not_found' using errcode = 'P0002'; end if;
  return v_result;
end;
$$;

create or replace function public.admin_get_session_editor(p_session_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.admin_get_session_editor(p_session_id); $$;
revoke all on function private.admin_get_session_editor(uuid) from public, anon;
revoke all on function public.admin_get_session_editor(uuid) from public, anon;
grant execute on function private.admin_get_session_editor(uuid) to authenticated;
grant execute on function public.admin_get_session_editor(uuid) to authenticated;

create or replace function private.admin_save_session(
  p_session_id uuid, p_title text, p_summary text, p_estimated_minutes integer, p_access_tier text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_status text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not (select private.takumi_is_content_admin()) then raise exception 'admin_required' using errcode = '42501'; end if;
  select content_status into v_status from public.learning_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found' using errcode = 'P0002'; end if;
  if v_status = 'published' and not (select private.takumi_is_super_admin()) then raise exception 'published_session_requires_super_admin' using errcode = '42501'; end if;
  if nullif(btrim(coalesce(p_title, '')), '') is null then raise exception 'title_required' using errcode = '22023'; end if;
  if p_estimated_minutes is null or p_estimated_minutes < 10 or p_estimated_minutes > 240 then raise exception 'invalid_estimated_minutes' using errcode = '22023'; end if;
  if p_access_tier not in ('free', 'paid') then raise exception 'invalid_access_tier' using errcode = '22023'; end if;
  update public.learning_sessions
  set title = btrim(p_title), summary = nullif(btrim(coalesce(p_summary, '')), ''),
      estimated_minutes = p_estimated_minutes, access_tier = p_access_tier,
      created_by = coalesce(created_by, v_uid), updated_at = now()
  where id = p_session_id;
  return jsonb_build_object('ok', true, 'session_id', p_session_id);
end;
$$;

create or replace function public.admin_save_session(
  p_session_id uuid, p_title text, p_summary text, p_estimated_minutes integer, p_access_tier text
)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.admin_save_session(p_session_id,p_title,p_summary,p_estimated_minutes,p_access_tier); $$;
revoke all on function private.admin_save_session(uuid,text,text,integer,text) from public, anon;
revoke all on function public.admin_save_session(uuid,text,text,integer,text) from public, anon;
grant execute on function private.admin_save_session(uuid,text,text,integer,text) to authenticated;
grant execute on function public.admin_save_session(uuid,text,text,integer,text) to authenticated;

create or replace function private.admin_upsert_content_block(
  p_session_id uuid, p_block_id uuid, p_position integer, p_kind text,
  p_title text, p_body jsonb, p_audio_url text, p_image_url text
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_status text;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not (select private.takumi_is_content_admin()) then raise exception 'admin_required' using errcode = '42501'; end if;
  select content_status into v_status from public.learning_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found' using errcode = 'P0002'; end if;
  if v_status = 'published' and not (select private.takumi_is_super_admin()) then raise exception 'published_session_requires_super_admin' using errcode = '42501'; end if;
  if p_position is null or p_position < 1 then raise exception 'invalid_position' using errcode = '22023'; end if;
  if p_kind not in ('vocabulary','kanji','grammar','reading','listening','note','image','audio') then raise exception 'invalid_block_kind' using errcode = '22023'; end if;
  if p_block_id is null then
    insert into public.content_blocks (session_id, position, kind, title, body, audio_url, image_url)
    values (p_session_id,p_position,p_kind,nullif(btrim(coalesce(p_title,'')),''),coalesce(p_body,'{}'::jsonb),nullif(btrim(coalesce(p_audio_url,'')),''),nullif(btrim(coalesce(p_image_url,'')),''))
    returning id into v_id;
  else
    update public.content_blocks
    set position=p_position, kind=p_kind, title=nullif(btrim(coalesce(p_title,'')),''),
        body=coalesce(p_body,'{}'::jsonb), audio_url=nullif(btrim(coalesce(p_audio_url,'')),''),
        image_url=nullif(btrim(coalesce(p_image_url,'')),''), updated_at=now()
    where id=p_block_id and session_id=p_session_id returning id into v_id;
    if v_id is null then raise exception 'block_not_found' using errcode = 'P0002'; end if;
  end if;
  update public.learning_sessions set updated_at=now() where id=p_session_id;
  return v_id;
end;
$$;

create or replace function public.admin_upsert_content_block(
  p_session_id uuid, p_block_id uuid, p_position integer, p_kind text,
  p_title text, p_body jsonb, p_audio_url text, p_image_url text
)
returns uuid language sql security invoker set search_path = ''
as $$ select private.admin_upsert_content_block(p_session_id,p_block_id,p_position,p_kind,p_title,p_body,p_audio_url,p_image_url); $$;
revoke all on function private.admin_upsert_content_block(uuid,uuid,integer,text,text,jsonb,text,text) from public, anon;
revoke all on function public.admin_upsert_content_block(uuid,uuid,integer,text,text,jsonb,text,text) from public, anon;
grant execute on function private.admin_upsert_content_block(uuid,uuid,integer,text,text,jsonb,text,text) to authenticated;
grant execute on function public.admin_upsert_content_block(uuid,uuid,integer,text,text,jsonb,text,text) to authenticated;

create or replace function private.admin_delete_content_block(p_session_id uuid, p_block_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_status text;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not (select private.takumi_is_content_admin()) then raise exception 'admin_required' using errcode = '42501'; end if;
  select content_status into v_status from public.learning_sessions where id=p_session_id for update;
  if not found then raise exception 'session_not_found' using errcode = 'P0002'; end if;
  if v_status='published' and not (select private.takumi_is_super_admin()) then raise exception 'published_session_requires_super_admin' using errcode = '42501'; end if;
  delete from public.content_blocks where id=p_block_id and session_id=p_session_id;
  if not found then raise exception 'block_not_found' using errcode='P0002'; end if;
  update public.learning_sessions set updated_at=now() where id=p_session_id;
  return true;
end;
$$;

create or replace function public.admin_delete_content_block(p_session_id uuid,p_block_id uuid)
returns boolean language sql security invoker set search_path=''
as $$ select private.admin_delete_content_block(p_session_id,p_block_id); $$;
revoke all on function private.admin_delete_content_block(uuid,uuid) from public,anon;
revoke all on function public.admin_delete_content_block(uuid,uuid) from public,anon;
grant execute on function private.admin_delete_content_block(uuid,uuid) to authenticated;
grant execute on function public.admin_delete_content_block(uuid,uuid) to authenticated;

create or replace function private.admin_upsert_question(
  p_quiz_id uuid, p_question_id uuid, p_position integer, p_kind text,
  p_prompt text, p_passage text, p_audio_url text, p_explanation_id text,
  p_explanation_text text, p_points numeric, p_options jsonb
)
returns uuid language plpgsql security definer set search_path = ''
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
  into v_option_count,v_correct_count from jsonb_array_elements(p_options);
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
  select v_question_id,ordinality::integer,coalesce(nullif(btrim(value->>'label'),''),chr(64+ordinality::integer)),
         btrim(coalesce(value->>'option_text','')),coalesce((value->>'is_correct')::boolean,false)
  from jsonb_array_elements(p_options) with ordinality
  where nullif(btrim(coalesce(value->>'option_text','')),'') is not null;
  if (select count(*) from public.question_options where question_id=v_question_id)<2 then raise exception 'option_text_required' using errcode='22023'; end if;
  update public.learning_sessions set updated_at=now() where id=v_session_id;
  return v_question_id;
end;
$$;

create or replace function public.admin_upsert_question(
  p_quiz_id uuid,p_question_id uuid,p_position integer,p_kind text,p_prompt text,p_passage text,p_audio_url text,
  p_explanation_id text,p_explanation_text text,p_points numeric,p_options jsonb
)
returns uuid language sql security invoker set search_path=''
as $$ select private.admin_upsert_question(p_quiz_id,p_question_id,p_position,p_kind,p_prompt,p_passage,p_audio_url,p_explanation_id,p_explanation_text,p_points,p_options); $$;
revoke all on function private.admin_upsert_question(uuid,uuid,integer,text,text,text,text,text,text,numeric,jsonb) from public,anon;
revoke all on function public.admin_upsert_question(uuid,uuid,integer,text,text,text,text,text,text,numeric,jsonb) from public,anon;
grant execute on function private.admin_upsert_question(uuid,uuid,integer,text,text,text,text,text,text,numeric,jsonb) to authenticated;
grant execute on function public.admin_upsert_question(uuid,uuid,integer,text,text,text,text,text,text,numeric,jsonb) to authenticated;

create or replace function private.admin_delete_question(p_quiz_id uuid,p_question_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_session_id uuid; v_status text;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not (select private.takumi_is_content_admin()) then raise exception 'admin_required' using errcode='42501'; end if;
  select q.session_id,s.content_status into v_session_id,v_status from public.quizzes q join public.learning_sessions s on s.id=q.session_id where q.id=p_quiz_id for update of s;
  if not found then raise exception 'quiz_not_found' using errcode='P0002'; end if;
  if v_status='published' and not (select private.takumi_is_super_admin()) then raise exception 'published_session_requires_super_admin' using errcode='42501'; end if;
  if exists(select 1 from public.quiz_answers a where a.question_id=p_question_id) then raise exception 'question_has_attempt_history' using errcode='23503'; end if;
  delete from public.question_options where question_id=p_question_id;
  delete from public.quiz_questions where id=p_question_id and quiz_id=p_quiz_id;
  if not found then raise exception 'question_not_found' using errcode='P0002'; end if;
  update public.learning_sessions set updated_at=now() where id=v_session_id;
  return true;
end;
$$;

create or replace function public.admin_delete_question(p_quiz_id uuid,p_question_id uuid)
returns boolean language sql security invoker set search_path=''
as $$ select private.admin_delete_question(p_quiz_id,p_question_id); $$;
revoke all on function private.admin_delete_question(uuid,uuid) from public,anon;
revoke all on function public.admin_delete_question(uuid,uuid) from public,anon;
grant execute on function private.admin_delete_question(uuid,uuid) to authenticated;
grant execute on function public.admin_delete_question(uuid,uuid) to authenticated;

create or replace function private.admin_set_content_status(p_session_id uuid,p_status text,p_note text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
  v_current text;
  v_quiz_id uuid;
  v_block_count integer;
  v_question_count integer;
  v_invalid_question_count integer;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  v_role := private.takumi_current_role();
  if v_role not in ('content_admin','super_admin') then raise exception 'admin_required' using errcode='42501'; end if;
  if p_status not in ('draft','review','changes_requested','approved','published','archived') then raise exception 'invalid_status' using errcode='22023'; end if;
  select content_status into v_current from public.learning_sessions where id=p_session_id for update;
  if not found then raise exception 'session_not_found' using errcode='P0002'; end if;
  if v_role='content_admin' and not ((v_current in ('draft','changes_requested') and p_status in ('draft','review')) or (v_current='review' and p_status='review')) then raise exception 'content_admin_transition_not_allowed' using errcode='42501'; end if;
  if p_status in ('approved','published','changes_requested','archived') and v_role<>'super_admin' then raise exception 'super_admin_required' using errcode='42501'; end if;
  if p_status='published' then
    select count(*) into v_block_count from public.content_blocks where session_id=p_session_id;
    if v_block_count<1 then raise exception 'publish_requires_content' using errcode='22023'; end if;
    select id into v_quiz_id from public.quizzes where session_id=p_session_id and kind='session' order by created_at limit 1;
    if v_quiz_id is null then raise exception 'publish_requires_session_quiz' using errcode='22023'; end if;
    select count(*) into v_question_count from public.quiz_questions where quiz_id=v_quiz_id;
    if v_question_count<1 then raise exception 'publish_requires_questions' using errcode='22023'; end if;
    select count(*) into v_invalid_question_count from public.quiz_questions qq where qq.quiz_id=v_quiz_id and ((select count(*) from public.question_options qo where qo.question_id=qq.id)<2 or (select count(*) from public.question_options qo where qo.question_id=qq.id and qo.is_correct)<>1);
    if v_invalid_question_count>0 then raise exception 'publish_requires_valid_options' using errcode='22023'; end if;
    update public.quizzes set published=true,updated_at=now() where session_id=p_session_id and kind='session';
  else
    update public.quizzes set published=false,updated_at=now() where session_id=p_session_id and kind='session';
  end if;
  update public.learning_sessions set content_status=p_status,
    approved_by=case when p_status in ('approved','published') then v_uid when p_status in ('draft','review','changes_requested') then null else approved_by end,
    published_at=case when p_status='published' then coalesce(published_at,now()) else null end,
    updated_at=now() where id=p_session_id;
  if nullif(btrim(coalesce(p_note,'')),'') is not null then insert into public.content_review_notes (session_id,author_id,note) values (p_session_id,v_uid,btrim(p_note)); end if;
  return jsonb_build_object('ok',true,'from',v_current,'status',p_status);
end;
$$;

create or replace function public.admin_set_content_status(p_session_id uuid,p_status text,p_note text default null)
returns jsonb language sql security invoker set search_path=''
as $$ select private.admin_set_content_status(p_session_id,p_status,p_note); $$;
revoke all on function private.admin_set_content_status(uuid,text,text) from public,anon;
revoke all on function public.admin_set_content_status(uuid,text,text) from public,anon;
grant execute on function private.admin_set_content_status(uuid,text,text) to authenticated;
grant execute on function public.admin_set_content_status(uuid,text,text) to authenticated;
