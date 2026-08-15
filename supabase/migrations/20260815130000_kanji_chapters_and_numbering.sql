create unique index if not exists content_blocks_kanji_chapter_position_uidx
on public.content_blocks (
  session_id,
  (coalesce(nullif(body->>'chapter_number','')::integer, 1)),
  position
)
where kind = 'kanji';

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
  v_chapter integer;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not (select private.takumi_is_content_admin()) then raise exception 'admin_required' using errcode = '42501'; end if;

  select content_status into v_status from public.learning_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found' using errcode = 'P0002'; end if;
  if v_status = 'published' and not (select private.takumi_is_super_admin()) then raise exception 'published_session_requires_super_admin' using errcode = '42501'; end if;
  if p_position is null or p_position < 1 then raise exception 'invalid_position' using errcode = '22023'; end if;
  if p_kind not in ('vocabulary','kanji','grammar','reading','listening','note','image','audio') then raise exception 'invalid_block_kind' using errcode = '22023'; end if;

  if p_kind in ('vocabulary', 'kanji') then
    begin
      v_chapter := greatest(1, coalesce(nullif(p_body->>'chapter_number','')::integer, 1));
    exception when invalid_text_representation then
      raise exception 'invalid_chapter_number' using errcode = '22023';
    end;

    if exists (
      select 1
      from public.content_blocks b
      where b.session_id = p_session_id
        and b.kind = p_kind
        and coalesce(nullif(b.body->>'chapter_number','')::integer, 1) = v_chapter
        and b.position = p_position
        and (p_block_id is null or b.id <> p_block_id)
    ) then
      if p_kind = 'vocabulary' then
        raise exception 'duplicate_vocabulary_number_in_chapter' using errcode = '23505';
      else
        raise exception 'duplicate_kanji_number_in_chapter' using errcode = '23505';
      end if;
    end if;
  end if;

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
