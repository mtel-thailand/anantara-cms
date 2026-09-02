BEGIN;

create table if not exists public.gallery_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_it text,
  sequence integer not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint gallery_groups_name_not_blank check (btrim(name) <> ''),
  constraint gallery_groups_sequence_positive check (sequence > 0)
);

alter table public.gallery_image
  add column if not exists gallery_group_id uuid;

do $$
declare
  default_group_id uuid;
begin
  select id
    into default_group_id
    from public.gallery_groups
    order by sequence, id
    limit 1;

  if default_group_id is null then
    insert into public.gallery_groups (name, name_it, sequence)
    values ('Gallery', 'Galleria', 1)
    returning id into default_group_id;
  end if;

  update public.gallery_image
  set gallery_group_id = default_group_id
  where gallery_group_id is null;
end
$$;

alter table public.gallery_image
  alter column gallery_group_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gallery_image_gallery_group_id_fkey'
      and conrelid = 'public.gallery_image'::regclass
  ) then
    alter table public.gallery_image
      add constraint gallery_image_gallery_group_id_fkey
      foreign key (gallery_group_id)
      references public.gallery_groups(id)
      on delete cascade;
  end if;
end
$$;

create index if not exists gallery_groups_sequence_idx
  on public.gallery_groups (sequence, id);

create index if not exists gallery_image_group_sequence_idx
  on public.gallery_image (gallery_group_id, sequence, id);

alter table public.gallery_groups enable row level security;
alter table public.gallery_image enable row level security;

revoke all on table public.gallery_groups from public, anon, authenticated;
revoke all on table public.gallery_image from public, anon, authenticated;

grant select on table public.gallery_groups to anon, authenticated;
grant select, insert, update, delete on table public.gallery_groups to authenticated;
grant select on table public.gallery_image to anon, authenticated;
grant insert, update, delete on table public.gallery_image to authenticated;

drop policy if exists "Gallery groups are publicly readable" on public.gallery_groups;
drop policy if exists "Authenticated users access all policy" on public.gallery_groups;
drop policy if exists "Content editors can insert gallery groups" on public.gallery_groups;
drop policy if exists "Content editors can update gallery groups" on public.gallery_groups;
drop policy if exists "Content editors can delete gallery groups" on public.gallery_groups;

create policy "Gallery groups are publicly readable"
  on public.gallery_groups
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users access all policy"
  on public.gallery_groups
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Gallery images are publicly readable" on public.gallery_image;
drop policy if exists "Authenticated users access all policy" on public.gallery_image;
drop policy if exists "Content editors can insert gallery images" on public.gallery_image;
drop policy if exists "Content editors can update gallery images" on public.gallery_image;
drop policy if exists "Content editors can delete gallery images" on public.gallery_image;

create policy "Gallery images are publicly readable"
  on public.gallery_image
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users access all policy"
  on public.gallery_image
  for all
  to authenticated
  using (true)
  with check (true);

COMMIT;
