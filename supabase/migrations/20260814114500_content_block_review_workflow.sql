alter table public.content_blocks
  add column if not exists review_status text not null default 'saved',
  add column if not exists review_note text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.content_blocks drop constraint if exists content_blocks_review_status_check;
alter table public.content_blocks
  add constraint content_blocks_review_status_check
  check (review_status in ('saved','needs_revision','approved'));

create or replace function private.admin_get_session_editor(p_session_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
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
        'review_status', b.review_status, 'review_note', b.review_note,
        'reviewed_by', b.reviewed_by, 'reviewed_at', b.reviewed_at,
        'updated_at', b.updated_at
      ) order by b.position)
      from public.content_blocks b where b.session_id = s.id
    ), '[]'::jsonb),
    'quiz', coalesce((
      select jsonb_build_object(
        'id', q.id, 'kind', q.kind, 'title', q.title,
        'pass_score', q.pass_score, 'time_limit_minutes', q.time_limit_minutes,
        'published', q.published,
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
$function$;

create or replace function private.admin_upsert_content_block(
  p_session_id uuid, p_block_id uuid, p_position integer, p_kind text,
  p_title text, p_body jsonb, p_audio_url text, p_image_url text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
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
    insert into public.content_blocks (session_id, position, kind, title, body, audio_url, image_url, review_status)
    values (p_session_id, p_position, p_kind, nullif(btrim(coalesce(p_title,'')),''), coalesce(p_body,'{}'::jsonb), nullif(btrim(coalesce(p_audio_url,'')),''), nullif(btrim(coalesce(p_image_url,'')),''), 'saved')
    returning id into v_id;
  else
    update public.content_blocks
    set position = p_position,
        kind = p_kind,
        title = nullif(btrim(coalesce(p_title,'')),''),
        body = coalesce(p_body,'{}'::jsonb),
        audio_url = nullif(btrim(coalesce(p_audio_url,'')),''),
        image_url = nullif(btrim(coalesce(p_image_url,'')),''),
        review_status = 'saved',
        reviewed_by = null,
        reviewed_at = null,
        updated_at = now()
    where id = p_block_id and session_id = p_session_id
    returning id into v_id;
    if v_id is null then raise exception 'block_not_found' using errcode = 'P0002'; end if;
  end if;

  update public.learning_sessions set updated_at = now() where id = p_session_id;
  return v_id;
end;
$function$;

create or replace function private.admin_set_content_block_review_status(
  p_session_id uuid,
  p_block_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not (select private.takumi_is_content_admin()) then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_status not in ('saved','needs_revision','approved') then raise exception 'invalid_block_review_status' using errcode = '22023'; end if;
  if p_status in ('needs_revision','approved') and not (select private.takumi_is_super_admin()) then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;
  if p_status = 'needs_revision' and nullif(btrim(coalesce(p_note,'')),'') is null then
    raise exception 'revision_note_required' using errcode = '22023';
  end if;

  update public.content_blocks
  set review_status = p_status,
      review_note = case when p_status = 'approved' then null else nullif(btrim(coalesce(p_note, review_note, '')),'') end,
      reviewed_by = case when p_status = 'saved' then null else (select auth.uid()) end,
      reviewed_at = case when p_status = 'saved' then null else now() end,
      updated_at = now()
  where id = p_block_id and session_id = p_session_id
  returning jsonb_build_object(
    'id', id, 'review_status', review_status, 'review_note', review_note,
    'reviewed_by', reviewed_by, 'reviewed_at', reviewed_at
  ) into v_result;

  if v_result is null then raise exception 'block_not_found' using errcode = 'P0002'; end if;
  update public.learning_sessions set updated_at = now() where id = p_session_id;
  return v_result;
end;
$function$;

create or replace function public.admin_set_content_block_review_status(
  p_session_id uuid,
  p_block_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language sql
set search_path to ''
as $function$
  select private.admin_set_content_block_review_status(p_session_id,p_block_id,p_status,p_note);
$function$;

grant execute on function public.admin_set_content_block_review_status(uuid,uuid,text,text) to authenticated;
