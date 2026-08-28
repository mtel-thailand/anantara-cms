begin;

-- Access model:
--   anon          -> SELECT only
--   authenticated -> SELECT, INSERT, UPDATE, DELETE

alter table public.content_pages enable row level security;
alter table public.content_fields enable row level security;
alter table public.content_field_values enable row level security;
alter table public.content_publications enable row level security;

-- Backward-compatible helper for any RPC version that still calls it.
-- It intentionally checks authentication only and does not inspect cms_role.
create or replace function public.is_cms_content_editor()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select auth.uid() is not null;
$$;

-- Anonymous users can read all content tables but cannot write.
drop policy if exists "Anonymous users can read content pages"
on public.content_pages;

create policy "Anonymous users can read content pages"
on public.content_pages
for select
to anon
using (true);

drop policy if exists "Anonymous users can read content fields"
on public.content_fields;

create policy "Anonymous users can read content fields"
on public.content_fields
for select
to anon
using (true);

drop policy if exists "Anonymous users can read content values"
on public.content_field_values;

create policy "Anonymous users can read content values"
on public.content_field_values
for select
to anon
using (true);

drop policy if exists "Anonymous users can read content publications"
on public.content_publications;

create policy "Anonymous users can read content publications"
on public.content_publications
for select
to anon
using (true);

-- Every authenticated user has full direct CRUD access.
drop policy if exists "Authenticated users can manage content pages"
on public.content_pages;

create policy "Authenticated users can manage content pages"
on public.content_pages
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage content fields"
on public.content_fields;

create policy "Authenticated users can manage content fields"
on public.content_fields
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage content values"
on public.content_field_values;

create policy "Authenticated users can manage content values"
on public.content_field_values
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage content publications"
on public.content_publications;

create policy "Authenticated users can manage content publications"
on public.content_publications
for all
to authenticated
using (true)
with check (true);

grant select
on public.content_pages,
   public.content_fields,
   public.content_field_values,
   public.content_publications
to anon;

grant select, insert, update, delete
on public.content_pages,
   public.content_fields,
   public.content_field_values,
   public.content_publications
to authenticated;

-- Keep anonymous access strictly read-only even if broader grants are added
-- elsewhere later.
revoke insert, update, delete
on public.content_pages,
   public.content_fields,
   public.content_field_values,
   public.content_publications
from anon;

revoke all on function public.is_cms_content_editor() from public;
grant execute on function public.is_cms_content_editor() to authenticated;

commit;
