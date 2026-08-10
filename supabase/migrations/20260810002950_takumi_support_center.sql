-- Takumi Support Center: secure ticket workflow, SLA metadata, admin queue and WhatsApp settings.

alter table public.support_requests drop constraint if exists support_requests_category_check;
alter table public.support_requests add constraint support_requests_category_check check (category in ('account','payment','access','learning','content_error','technical','other'));
alter table public.support_requests
  add column if not exists response_due_at timestamptz,
  add column if not exists first_response_at timestamptz,
  add column if not exists last_customer_message_at timestamptz,
  add column if not exists last_admin_message_at timestamptz,
  add column if not exists last_message_at timestamptz not null default now(),
  add column if not exists resolved_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('student','admin','system')),
  body text not null check (char_length(body) between 1 and 5000),
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.support_settings (
  id integer primary key check (id=1),
  whatsapp_number text,
  whatsapp_enabled boolean not null default false,
  service_timezone text not null default 'Asia/Jakarta',
  service_start time not null default '08:00',
  service_end time not null default '17:00',
  response_hours_open integer not null default 3 check (response_hours_open between 1 and 24),
  response_hours_closed integer not null default 24 check (response_hours_closed between 1 and 72),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.support_settings(id) values(1) on conflict(id) do nothing;

create index if not exists idx_support_requests_queue on public.support_requests(status,priority,last_message_at desc);
create index if not exists idx_support_messages_request on public.support_messages(request_id,created_at);
alter table public.support_messages enable row level security;
alter table public.support_settings enable row level security;

drop policy if exists support_messages_select_own on public.support_messages;
create policy support_messages_select_own on public.support_messages for select to authenticated using (
  internal=false and exists(select 1 from public.support_requests r where r.id=request_id and r.user_id=(select auth.uid()))
);
drop policy if exists support_settings_select_authenticated on public.support_settings;
create policy support_settings_select_authenticated on public.support_settings for select to authenticated using(true);
drop policy if exists support_insert_own on public.support_requests;

revoke insert,update,delete,truncate,references,trigger on public.support_requests from anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.support_messages from anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.support_settings from anon,authenticated;
grant select on public.support_requests,public.support_messages,public.support_settings to authenticated;

create or replace function private.takumi_support_due_at(p_now timestamptz default now()) returns timestamptz
language plpgsql stable security definer set search_path='' as $$
declare v public.support_settings%rowtype; local_ts timestamp; h integer;
begin
  select * into v from public.support_settings where id=1;
  local_ts:=p_now at time zone v.service_timezone;
  h:=case when extract(isodow from local_ts) between 1 and 5 and local_ts::time>=v.service_start and local_ts::time<v.service_end then v.response_hours_open else v.response_hours_closed end;
  return p_now+make_interval(hours=>h);
end $$;

create or replace function private.submit_support_request(p_category text,p_subject text,p_message text) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); rid uuid; t timestamptz:=now(); pri text;
begin
  if u is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_category not in ('account','payment','access','learning','content_error','technical','other') then raise exception 'invalid_category'; end if;
  if char_length(btrim(coalesce(p_subject,'')))<5 or char_length(p_subject)>160 then raise exception 'invalid_subject'; end if;
  if char_length(btrim(coalesce(p_message,'')))<10 or char_length(p_message)>5000 then raise exception 'invalid_message'; end if;
  pri:=case when p_category in ('payment','access') then 'high' else 'normal' end;
  insert into public.support_requests(user_id,category,subject,message,priority,status,created_at,updated_at,response_due_at,last_customer_message_at,last_message_at)
  values(u,p_category,btrim(p_subject),btrim(p_message),pri,'open',t,t,private.takumi_support_due_at(t),t,t) returning id into rid;
  insert into public.support_messages(request_id,author_id,sender_role,body,created_at) values(rid,u,'student',btrim(p_message),t);
  return rid;
end $$;
create or replace function public.submit_support_request(p_category text,p_subject text,p_message text) returns uuid language sql security invoker set search_path='' as $$ select private.submit_support_request(p_category,p_subject,p_message) $$;

create or replace function private.reply_support_request(p_request_id uuid,p_message text) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); s text; t timestamptz:=now();
begin
  if u is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if char_length(btrim(coalesce(p_message,'')))<1 or char_length(p_message)>5000 then raise exception 'invalid_message'; end if;
  select status into s from public.support_requests where id=p_request_id and user_id=u for update;
  if s is null then raise exception 'support_request_not_found'; end if;
  if s='closed' then raise exception 'support_request_closed'; end if;
  insert into public.support_messages(request_id,author_id,sender_role,body,created_at) values(p_request_id,u,'student',btrim(p_message),t);
  update public.support_requests set status='open',resolved_at=null,closed_at=null,last_customer_message_at=t,last_message_at=t,response_due_at=private.takumi_support_due_at(t),updated_at=t where id=p_request_id;
end $$;
create or replace function public.reply_support_request(p_request_id uuid,p_message text) returns void language sql security invoker set search_path='' as $$ select private.reply_support_request(p_request_id,p_message) $$;

create or replace function private.my_support_requests() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(to_jsonb(x) order by x.last_message_at desc),'[]'::jsonb) from (
  select r.id,r.category,r.subject,r.priority,r.status,r.created_at,r.updated_at,r.response_due_at,r.first_response_at,r.last_customer_message_at,r.last_admin_message_at,r.last_message_at,r.resolved_at,r.closed_at,
         (r.last_admin_message_at is null or r.last_customer_message_at>r.last_admin_message_at) needs_response,
         coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'sender_role',m.sender_role,'body',m.body,'created_at',m.created_at) order by m.created_at) from public.support_messages m where m.request_id=r.id and m.internal=false),'[]'::jsonb) messages
  from public.support_requests r where r.user_id=(select auth.uid())
) x $$;
create or replace function public.my_support_requests() returns jsonb language sql security invoker set search_path='' as $$ select private.my_support_requests() $$;

create or replace function private.admin_list_support_requests(p_status text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare out_json jsonb;
begin
  if not private.takumi_is_content_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if p_status is not null and p_status not in ('open','in_progress','resolved','closed') then raise exception 'invalid_status'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.queue_rank,x.last_message_at desc),'[]'::jsonb) into out_json from (
    select r.id,r.user_id,u.email,p.full_name,r.category,r.subject,r.priority,r.status,r.created_at,r.updated_at,r.response_due_at,r.first_response_at,r.last_customer_message_at,r.last_admin_message_at,r.last_message_at,r.resolved_at,r.closed_at,r.assigned_to,
           (r.last_admin_message_at is null or r.last_customer_message_at>r.last_admin_message_at) needs_response,
           ((r.last_admin_message_at is null or r.last_customer_message_at>r.last_admin_message_at) and now()>r.response_due_at) overdue,
           case when r.priority='critical' then 0 when r.priority='high' then 1 else 2 end queue_rank,
           coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'sender_role',m.sender_role,'body',m.body,'created_at',m.created_at,'internal',m.internal) order by m.created_at) from public.support_messages m where m.request_id=r.id),'[]'::jsonb) messages
    from public.support_requests r left join auth.users u on u.id=r.user_id left join public.profiles p on p.id=r.user_id
    where p_status is null or r.status=p_status order by r.last_message_at desc limit 200
  ) x;
  return out_json;
end $$;
create or replace function public.admin_list_support_requests(p_status text default null) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_list_support_requests(p_status) $$;

create or replace function private.admin_reply_support_request(p_request_id uuid,p_message text) returns void
language plpgsql security definer set search_path='' as $$
declare a uuid:=(select auth.uid()); t timestamptz:=now();
begin
  if not private.takumi_is_content_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if char_length(btrim(coalesce(p_message,'')))<1 or char_length(p_message)>5000 then raise exception 'invalid_message'; end if;
  if not exists(select 1 from public.support_requests where id=p_request_id) then raise exception 'support_request_not_found'; end if;
  insert into public.support_messages(request_id,author_id,sender_role,body,created_at) values(p_request_id,a,'admin',btrim(p_message),t);
  update public.support_requests set first_response_at=coalesce(first_response_at,t),last_admin_message_at=t,last_message_at=t,assigned_to=coalesce(assigned_to,a),status=case when status='open' then 'in_progress' else status end,updated_at=t where id=p_request_id;
end $$;
create or replace function public.admin_reply_support_request(p_request_id uuid,p_message text) returns void language sql security invoker set search_path='' as $$ select private.admin_reply_support_request(p_request_id,p_message) $$;

create or replace function private.admin_update_support_request(p_request_id uuid,p_status text,p_priority text) returns void
language plpgsql security definer set search_path='' as $$
declare t timestamptz:=now();
begin
  if not private.takumi_is_content_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if p_status not in ('open','in_progress','resolved','closed') then raise exception 'invalid_status'; end if;
  if p_priority not in ('normal','high','critical') then raise exception 'invalid_priority'; end if;
  update public.support_requests set status=p_status,priority=p_priority,assigned_to=coalesce(assigned_to,(select auth.uid())),updated_at=t,
    resolved_at=case when p_status='resolved' then coalesce(resolved_at,t) when p_status in ('open','in_progress') then null else resolved_at end,
    closed_at=case when p_status='closed' then coalesce(closed_at,t) when p_status in ('open','in_progress') then null else closed_at end where id=p_request_id;
  if not found then raise exception 'support_request_not_found'; end if;
end $$;
create or replace function public.admin_update_support_request(p_request_id uuid,p_status text,p_priority text) returns void language sql security invoker set search_path='' as $$ select private.admin_update_support_request(p_request_id,p_status,p_priority) $$;

create or replace function private.admin_update_support_settings(p_whatsapp_number text,p_whatsapp_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare n text;
begin
  if not private.takumi_is_super_admin() then raise exception 'super_admin_required' using errcode='42501'; end if;
  n:=nullif(regexp_replace(coalesce(p_whatsapp_number,''),'[^0-9]','','g'),'');
  if p_whatsapp_enabled and (n is null or char_length(n)<8 or char_length(n)>20) then raise exception 'invalid_whatsapp_number'; end if;
  update public.support_settings set whatsapp_number=n,whatsapp_enabled=(p_whatsapp_enabled and n is not null),updated_at=now(),updated_by=(select auth.uid()) where id=1;
end $$;
create or replace function public.admin_update_support_settings(p_whatsapp_number text,p_whatsapp_enabled boolean) returns void language sql security invoker set search_path='' as $$ select private.admin_update_support_settings(p_whatsapp_number,p_whatsapp_enabled) $$;

revoke all on function public.submit_support_request(text,text,text) from public;
revoke all on function public.reply_support_request(uuid,text) from public;
revoke all on function public.my_support_requests() from public;
revoke all on function public.admin_list_support_requests(text) from public;
revoke all on function public.admin_reply_support_request(uuid,text) from public;
revoke all on function public.admin_update_support_request(uuid,text,text) from public;
revoke all on function public.admin_update_support_settings(text,boolean) from public;
grant execute on function public.submit_support_request(text,text,text),public.reply_support_request(uuid,text),public.my_support_requests(),public.admin_list_support_requests(text),public.admin_reply_support_request(uuid,text),public.admin_update_support_request(uuid,text,text),public.admin_update_support_settings(text,boolean) to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.submit_support_request(text,text,text),private.reply_support_request(uuid,text),private.my_support_requests(),private.admin_list_support_requests(text),private.admin_reply_support_request(uuid,text),private.admin_update_support_request(uuid,text,text),private.admin_update_support_settings(text,boolean) to authenticated;
