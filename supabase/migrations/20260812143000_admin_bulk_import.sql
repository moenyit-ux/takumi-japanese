-- Applied to Supabase project tckqxueaytwalbfgqyya on 2026-08-12.
-- Atomic append-only bulk import for reviewed Takumi session content and questions.

create or replace function private.admin_import_session_bundle(
  p_session_id uuid,
  p_bundle jsonb,
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_quiz_id uuid;
  v_blocks jsonb := coalesce(p_bundle->'blocks', '[]'::jsonb);
  v_questions jsonb := coalesce(p_bundle->'questions', '[]'::jsonb);
  v_block jsonb;
  v_body jsonb;
  v_question jsonb;
  v_options jsonb;
  v_option jsonb;
  v_kind text;
  v_prompt text;
  v_block_count integer;
  v_question_count integer;
  v_option_count integer;
  v_correct_count integer;
  v_blank_option_count integer;
  v_block_base integer;
  v_question_base integer;
  v_block_no integer := 0;
  v_question_no integer := 0;
  v_option_no integer;
  v_question_id uuid;
  v_required text;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not (select private.takumi_is_content_admin()) then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_bundle is null or jsonb_typeof(p_bundle) <> 'object' then raise exception 'import_bundle_must_be_object' using errcode = '22023'; end if;
  if jsonb_typeof(v_blocks) <> 'array' or jsonb_typeof(v_questions) <> 'array' then raise exception 'import_collections_must_be_arrays' using errcode = '22023'; end if;

  v_block_count := jsonb_array_length(v_blocks);
  v_question_count := jsonb_array_length(v_questions);
  if v_block_count = 0 and v_question_count = 0 then raise exception 'import_bundle_empty' using errcode = '22023'; end if;
  if v_block_count > 500 then raise exception 'too_many_import_blocks' using errcode = '22023'; end if;
  if v_question_count > 300 then raise exception 'too_many_import_questions' using errcode = '22023'; end if;

  select content_status into v_status from public.learning_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found' using errcode = 'P0002'; end if;
  if v_status = 'published' and not (select private.takumi_is_super_admin()) then raise exception 'published_session_requires_super_admin' using errcode = '42501'; end if;

  select q.id into v_quiz_id from public.quizzes q where q.session_id = p_session_id and q.kind = 'session' order by q.created_at limit 1;
  if v_question_count > 0 and v_quiz_id is null then raise exception 'session_quiz_not_found' using errcode = 'P0002'; end if;

  for v_block in select value from jsonb_array_elements(v_blocks)
  loop
    if jsonb_typeof(v_block) <> 'object' then raise exception 'import_block_must_be_object' using errcode = '22023'; end if;
    v_kind := nullif(btrim(coalesce(v_block->>'kind', '')), '');
    if v_kind not in ('vocabulary','kanji','grammar','reading','listening','note','image','audio') then raise exception 'invalid_block_kind' using errcode = '22023'; end if;
    v_body := coalesce(v_block->'body', '{}'::jsonb);
    if jsonb_typeof(v_body) <> 'object' then raise exception 'import_block_body_must_be_object' using errcode = '22023'; end if;

    if v_kind = 'vocabulary' then
      v_required := coalesce(nullif(btrim(v_body->>'term'), ''), nullif(btrim(v_body->>'word'), ''), nullif(btrim(v_body->>'japanese'), ''));
      if v_required is null then raise exception 'vocabulary_term_required' using errcode = '22023'; end if;
      v_required := coalesce(nullif(btrim(v_body->>'meaning'), ''), nullif(btrim(v_body->>'translation'), ''), nullif(btrim(v_body->>'indonesian'), ''));
      if v_required is null then raise exception 'vocabulary_meaning_required' using errcode = '22023'; end if;
    elsif v_kind = 'kanji' then
      v_required := coalesce(nullif(btrim(v_body->>'kanji'), ''), nullif(btrim(v_body->>'character'), ''));
      if v_required is null then raise exception 'kanji_character_required' using errcode = '22023'; end if;
      v_required := coalesce(nullif(btrim(v_body->>'meaning'), ''), nullif(btrim(v_body->>'translation'), ''), nullif(btrim(v_body->>'indonesian'), ''));
      if v_required is null then raise exception 'kanji_meaning_required' using errcode = '22023'; end if;
    elsif v_kind = 'grammar' then
      v_required := coalesce(nullif(btrim(v_body->>'pattern'), ''), nullif(btrim(v_block->>'title'), ''));
      if v_required is null then raise exception 'grammar_pattern_required' using errcode = '22023'; end if;
    elsif v_kind = 'reading' then
      v_required := coalesce(nullif(btrim(v_body->>'passage'), ''), nullif(btrim(v_body->>'text'), ''));
      if v_required is null then raise exception 'reading_passage_required' using errcode = '22023'; end if;
    elsif v_kind = 'listening' then
      v_required := coalesce(nullif(btrim(v_body->>'script'), ''), nullif(btrim(v_body->>'transcript'), ''), nullif(btrim(v_block->>'audio_url'), ''));
      if v_required is null then raise exception 'listening_script_or_audio_required' using errcode = '22023'; end if;
    end if;
  end loop;

  for v_question in select value from jsonb_array_elements(v_questions)
  loop
    if jsonb_typeof(v_question) <> 'object' then raise exception 'import_question_must_be_object' using errcode = '22023'; end if;
    v_kind := nullif(btrim(coalesce(v_question->>'kind', '')), '');
    if v_kind not in ('multiple_choice','reading','listening') then raise exception 'invalid_question_kind' using errcode = '22023'; end if;
    v_prompt := nullif(btrim(coalesce(v_question->>'prompt', '')), '');
    if v_prompt is null then raise exception 'prompt_required' using errcode = '22023'; end if;
    if coalesce((v_question->>'points')::numeric, 1) <= 0 then raise exception 'invalid_points' using errcode = '22023'; end if;
    v_options := coalesce(v_question->'options', '[]'::jsonb);
    if jsonb_typeof(v_options) <> 'array' then raise exception 'options_must_be_array' using errcode = '22023'; end if;
    select count(*),
           count(*) filter (where coalesce(value->>'is_correct', 'false') = 'true'),
           count(*) filter (where nullif(btrim(coalesce(value->>'option_text', '')), '') is null)
      into v_option_count, v_correct_count, v_blank_option_count
    from jsonb_array_elements(v_options);
    if v_option_count < 2 or v_option_count > 6 then raise exception 'invalid_option_count' using errcode = '22023'; end if;
    if v_blank_option_count > 0 then raise exception 'option_text_required' using errcode = '22023'; end if;
    if v_correct_count <> 1 then raise exception 'exactly_one_correct_option_required' using errcode = '22023'; end if;
  end loop;

  select coalesce(max(position), 0) into v_block_base from public.content_blocks where session_id = p_session_id;
  select coalesce(max(qq.position), 0) into v_question_base from public.quiz_questions qq where qq.quiz_id = v_quiz_id;

  if p_dry_run then
    return jsonb_build_object('ok', true, 'dry_run', true, 'blocks', v_block_count, 'questions', v_question_count, 'block_start_position', v_block_base + 1, 'question_start_position', v_question_base + 1);
  end if;

  for v_block in select value from jsonb_array_elements(v_blocks)
  loop
    v_block_no := v_block_no + 1;
    insert into public.content_blocks (session_id, position, kind, title, body, audio_url, image_url)
    values (
      p_session_id,
      v_block_base + v_block_no,
      btrim(v_block->>'kind'),
      nullif(btrim(coalesce(v_block->>'title', '')), ''),
      coalesce(v_block->'body', '{}'::jsonb),
      nullif(btrim(coalesce(v_block->>'audio_url', '')), ''),
      nullif(btrim(coalesce(v_block->>'image_url', '')), '')
    );
  end loop;

  for v_question in select value from jsonb_array_elements(v_questions)
  loop
    v_question_no := v_question_no + 1;
    insert into public.quiz_questions (quiz_id, position, kind, prompt, passage, audio_url, explanation_id, explanation_text, points)
    values (
      v_quiz_id,
      v_question_base + v_question_no,
      btrim(v_question->>'kind'),
      btrim(v_question->>'prompt'),
      nullif(btrim(coalesce(v_question->>'passage', '')), ''),
      nullif(btrim(coalesce(v_question->>'audio_url', '')), ''),
      nullif(btrim(coalesce(v_question->>'explanation_id', '')), ''),
      nullif(btrim(coalesce(v_question->>'explanation_text', '')), ''),
      coalesce((v_question->>'points')::numeric, 1)
    ) returning id into v_question_id;

    v_option_no := 0;
    v_options := v_question->'options';
    for v_option in select value from jsonb_array_elements(v_options)
    loop
      v_option_no := v_option_no + 1;
      insert into public.question_options (question_id, position, label, option_text, is_correct)
      values (
        v_question_id,
        v_option_no,
        coalesce(nullif(btrim(coalesce(v_option->>'label', '')), ''), chr(64 + v_option_no)),
        btrim(v_option->>'option_text'),
        coalesce(v_option->>'is_correct', 'false') = 'true'
      );
    end loop;
  end loop;

  update public.learning_sessions set updated_at = now() where id = p_session_id;
  if v_quiz_id is not null and v_question_count > 0 then update public.quizzes set updated_at = now() where id = v_quiz_id; end if;

  return jsonb_build_object('ok', true, 'dry_run', false, 'blocks', v_block_count, 'questions', v_question_count, 'block_start_position', v_block_base + 1, 'question_start_position', v_question_base + 1);
end;
$$;

create or replace function public.admin_import_session_bundle(
  p_session_id uuid,
  p_bundle jsonb,
  p_dry_run boolean default true
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.admin_import_session_bundle(p_session_id, p_bundle, p_dry_run); $$;

revoke all on function private.admin_import_session_bundle(uuid, jsonb, boolean) from public, anon;
revoke all on function public.admin_import_session_bundle(uuid, jsonb, boolean) from public, anon;
grant execute on function private.admin_import_session_bundle(uuid, jsonb, boolean) to authenticated;
grant execute on function public.admin_import_session_bundle(uuid, jsonb, boolean) to authenticated;
