-- Consolidate session read policies and make quiz access use an initplan-friendly auth.uid() check.

drop policy if exists sessions_admin_read_all on public.learning_sessions;
drop policy if exists sessions_read_published_or_free on public.learning_sessions;

drop policy if exists sessions_anon_read_published on public.learning_sessions;
create policy sessions_anon_read_published
on public.learning_sessions
for select
to anon
using (content_status = 'published');

drop policy if exists sessions_authenticated_read_published_or_admin on public.learning_sessions;
create policy sessions_authenticated_read_published_or_admin
on public.learning_sessions
for select
to authenticated
using (
  content_status = 'published'
  or (select private.takumi_is_content_admin())
);

drop policy if exists quizzes_read_free_or_entitled on public.quizzes;
create policy quizzes_read_free_or_entitled
on public.quizzes
for select
to authenticated
using (
  published = true
  and (
    exists (
      select 1 from public.learning_sessions s
      where s.id = quizzes.session_id
        and s.content_status = 'published'
        and s.access_tier = 'free'
    )
    or exists (
      select 1 from public.entitlements e
      where e.user_id = (select auth.uid())
        and e.level_id = quizzes.level_id
        and e.active = true
        and e.starts_at <= now()
        and (e.ends_at is null or e.ends_at > now())
    )
  )
);
