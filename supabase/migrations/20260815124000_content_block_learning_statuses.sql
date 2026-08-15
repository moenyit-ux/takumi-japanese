create table if not exists public.content_block_learning_statuses (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_block_id uuid not null references public.content_blocks(id) on delete cascade,
  learning_status text not null default 'not_started' check (learning_status in ('not_started','review','learned')),
  updated_at timestamptz not null default now(),
  primary key (user_id, content_block_id)
);

alter table public.content_block_learning_statuses enable row level security;

drop policy if exists content_block_learning_status_select_own on public.content_block_learning_statuses;
create policy content_block_learning_status_select_own
  on public.content_block_learning_statuses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function private.set_content_block_learning_status(
  p_content_block_id uuid,
  p_learning_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_session_id uuid;
  v_allowed boolean := false;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_learning_status not in ('not_started', 'review', 'learned') then
    raise exception 'invalid_learning_status' using errcode = '22023';
  end if;

  select s.id,
         (
           s.content_status = 'published'
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
         )
    into v_session_id, v_allowed
  from public.content_blocks cb
  join public.learning_sessions s on s.id = cb.session_id
  where cb.id = p_content_block_id;

  if v_session_id is null or not v_allowed then
    raise exception 'session_not_available' using errcode = '42501';
  end if;

  insert into public.content_block_learning_statuses as cbls
    (user_id, content_block_id, learning_status)
  values
    (v_user, p_content_block_id, p_learning_status)
  on conflict (user_id, content_block_id) do update set
    learning_status = excluded.learning_status,
    updated_at = now();

  return jsonb_build_object(
    'content_block_id', p_content_block_id,
    'learning_status', p_learning_status,
    'session_id', v_session_id
  );
end;
$$;

create or replace function public.set_content_block_learning_status(
  p_content_block_id uuid,
  p_learning_status text
)
returns jsonb
language sql
set search_path = ''
as $$
  select private.set_content_block_learning_status(p_content_block_id, p_learning_status);
$$;

revoke all on function public.set_content_block_learning_status(uuid, text) from public;
revoke all on function public.set_content_block_learning_status(uuid, text) from anon;
grant execute on function public.set_content_block_learning_status(uuid, text) to authenticated;

grant select on public.content_block_learning_statuses to authenticated;
