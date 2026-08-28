begin;

-- Backward-compatible fix for an already-deployed publish_content_page() that
-- calls is_cms_content_editor(). Every authenticated user is allowed; no
-- app_metadata cms_role claim is required.
create or replace function public.is_cms_content_editor()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select auth.uid() is not null;
$$;

revoke all on function public.is_cms_content_editor() from public;
grant execute on function public.is_cms_content_editor() to authenticated;

commit;
