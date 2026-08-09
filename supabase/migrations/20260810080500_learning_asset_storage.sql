-- Private learning asset storage for Takumi images and audio.
-- Applied to Supabase project tckqxueaytwalbfgqyya on 2026-08-10.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'learning-assets',
  'learning-assets',
  false,
  20971520,
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/ogg'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.takumi_can_read_learning_asset(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_session_id uuid;
begin
  if private.takumi_is_content_admin() then
    return true;
  end if;

  if v_user is null or split_part(p_name, '/', 1) <> 'sessions' then
    return false;
  end if;

  begin
    v_session_id := split_part(p_name, '/', 2)::uuid;
  exception when others then
    return false;
  end;

  return exists (
    select 1
    from public.learning_sessions s
    where s.id = v_session_id
      and s.content_status = 'published'
      and (
        s.access_tier = 'free'
        or exists (
          select 1
          from public.entitlements e
          where e.user_id = v_user
            and e.level_id = s.level_id
            and e.active = true
            and e.starts_at <= now()
            and (e.ends_at is null or e.ends_at > now())
        )
      )
  );
end;
$$;

revoke all on function private.takumi_can_read_learning_asset(text) from public, anon;
grant execute on function private.takumi_can_read_learning_asset(text) to authenticated;

drop policy if exists takumi_learning_assets_select on storage.objects;
create policy takumi_learning_assets_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'learning-assets'
  and (select private.takumi_can_read_learning_asset(name))
);

drop policy if exists takumi_learning_assets_insert on storage.objects;
create policy takumi_learning_assets_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'learning-assets'
  and split_part(name, '/', 1) = 'sessions'
  and (select private.takumi_is_content_admin())
);

drop policy if exists takumi_learning_assets_update on storage.objects;
create policy takumi_learning_assets_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'learning-assets'
  and (select private.takumi_is_content_admin())
)
with check (
  bucket_id = 'learning-assets'
  and split_part(name, '/', 1) = 'sessions'
  and (select private.takumi_is_content_admin())
);

drop policy if exists takumi_learning_assets_delete on storage.objects;
create policy takumi_learning_assets_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'learning-assets'
  and (select private.takumi_is_content_admin())
);
