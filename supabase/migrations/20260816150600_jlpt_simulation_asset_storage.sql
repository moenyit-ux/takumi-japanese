-- Applied to Supabase project tckqxueaytwalbfgqyya on 2026-08-16.
-- Allows private learning assets to be stored under simulations/<quiz_id>/... and read only by authorized learners/admins.

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
  v_quiz_id uuid;
  v_prefix text := split_part(p_name, '/', 1);
begin
  if private.takumi_is_content_admin() then
    return true;
  end if;

  if v_user is null then
    return false;
  end if;

  if v_prefix = 'sessions' then
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
  end if;

  if v_prefix = 'simulations' then
    begin
      v_quiz_id := split_part(p_name, '/', 2)::uuid;
    exception when others then
      return false;
    end;
    return private.takumi_simulation_accessible(v_quiz_id, v_user);
  end if;

  return false;
end;
$$;

revoke all on function private.takumi_can_read_learning_asset(text) from public, anon;
grant execute on function private.takumi_can_read_learning_asset(text) to authenticated;

drop policy if exists takumi_learning_assets_insert on storage.objects;
create policy takumi_learning_assets_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'learning-assets'
  and split_part(name, '/', 1) in ('sessions', 'simulations')
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
  and split_part(name, '/', 1) in ('sessions', 'simulations')
  and (select private.takumi_is_content_admin())
);
