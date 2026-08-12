alter table public.quiz_attempts
  add column if not exists left_page_at timestamptz;

create or replace function private.takumi_tick_simulation(p_attempt_id uuid)
returns public.quiz_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_attempt public.quiz_attempts%rowtype;
  v_gap integer := 0;
  v_charge integer := 0;
  v_offline integer := 0;
  v_resume integer := 0;
  v_grace constant integer := 12;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_attempt
  from public.quiz_attempts
  where id = p_attempt_id and user_id = v_user
  for update;

  if not found then
    raise exception 'simulation_attempt_not_found' using errcode = '42501';
  end if;

  if v_attempt.result_status <> 'in_progress' then
    return v_attempt;
  end if;

  if v_attempt.last_heartbeat_at is null then
    update public.quiz_attempts
    set last_heartbeat_at = now(),
        last_saved_at = coalesce(last_saved_at, now()),
        left_page_at = null
    where id = p_attempt_id
    returning * into v_attempt;
    return v_attempt;
  end if;

  v_gap := greatest(0, floor(extract(epoch from (now() - v_attempt.last_heartbeat_at)))::integer);

  if v_attempt.left_page_at is not null then
    v_charge := v_gap;
    v_offline := 0;
    v_resume := 0;
  else
    v_charge := least(v_gap, v_grace);
    v_offline := greatest(0, v_gap - v_grace);
    v_resume := case when v_gap > v_grace then 1 else 0 end;
  end if;

  update public.quiz_attempts
  set remaining_seconds = greatest(0, coalesce(remaining_seconds, 0) - v_charge),
      offline_seconds = offline_seconds + v_offline,
      resume_count = resume_count + v_resume,
      last_heartbeat_at = now(),
      left_page_at = null
  where id = p_attempt_id
  returning * into v_attempt;

  return v_attempt;
end;
$$;

create or replace function private.mark_simulation_page_left(p_attempt_id uuid)
returns boolean
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

  v_attempt := private.takumi_tick_simulation(p_attempt_id);
  if v_attempt.result_status <> 'in_progress' then
    return false;
  end if;

  update public.quiz_attempts
  set left_page_at = now(),
      last_heartbeat_at = now(),
      last_saved_at = now()
  where id = p_attempt_id and user_id = v_user and result_status = 'in_progress';

  return found;
end;
$$;

create or replace function public.mark_simulation_page_left(p_attempt_id uuid)
returns boolean
language sql
set search_path = ''
as $$
  select private.mark_simulation_page_left(p_attempt_id);
$$;

revoke all on function public.mark_simulation_page_left(uuid) from public, anon;
grant execute on function public.mark_simulation_page_left(uuid) to authenticated;
