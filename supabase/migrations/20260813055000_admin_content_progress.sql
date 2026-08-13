-- Takumi admin dashboard: expose safe per-session authoring progress to content admins.

create or replace function private.admin_content_progress()
returns table (
  session_id uuid,
  block_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not (select private.takumi_is_content_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return query
  select
    s.id as session_id,
    count(b.id)::bigint as block_count
  from public.learning_sessions s
  left join public.content_blocks b on b.session_id = s.id
  group by s.id;
end;
$$;

create or replace function public.admin_content_progress()
returns table (
  session_id uuid,
  block_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.admin_content_progress();
$$;

revoke all on function private.admin_content_progress() from public, anon;
revoke all on function public.admin_content_progress() from public, anon;
grant execute on function private.admin_content_progress() to authenticated;
grant execute on function public.admin_content_progress() to authenticated;
