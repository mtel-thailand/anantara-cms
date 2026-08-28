-- Reusable page-content schema for EN/IT and Web/App variants.
-- Static pages are intentionally excluded and keep the project's own schema.
-- This migration stores only published values. Editable drafts stay in the CMS
-- client until publish, matching the project's existing local-first pattern.

create table public.content_pages (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  version bigint not null default 1 check (version > 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint content_pages_key_format_check
    check (key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$')
);

create table public.content_fields (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null
    references public.content_pages(id)
    on delete cascade,
  key text not null,
  content_type text not null,
  placement text not null default 'content',
  is_localized boolean not null default true,
  channel_mode text not null default 'per_channel',
  required boolean not null default false,
  sequence integer not null default 1 check (sequence > 0),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint content_fields_key_format_check
    check (key ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'),
  constraint content_fields_type_check
    check (content_type in ('rich_text', 'plain_text', 'email', 'image')),
  constraint content_fields_placement_check
    check (placement in ('header', 'content', 'footer', 'metadata')),
  constraint content_fields_channel_mode_check
    check (channel_mode in ('shared', 'per_channel')),
  constraint content_fields_config_object_check
    check (jsonb_typeof(config) = 'object'),
  constraint content_fields_page_key_unique
    unique (page_id, key),
  constraint content_fields_page_sequence_unique
    unique (page_id, sequence)
);

create table public.content_field_values (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null
    references public.content_fields(id)
    on delete cascade,
  locale text not null,
  channel text not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint content_field_values_locale_check
    check (locale in ('en', 'it', 'und')),
  constraint content_field_values_channel_check
    check (channel in ('web', 'app', 'shared')),
  constraint content_field_values_object_check
    check (jsonb_typeof(value) = 'object'),
  constraint content_field_values_variant_unique
    unique (field_id, locale, channel)
);

create table public.content_publications (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null
    references public.content_pages(id)
    on delete cascade,
  version bigint not null check (version > 0),
  snapshot jsonb not null,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),

  constraint content_publications_snapshot_object_check
    check (jsonb_typeof(snapshot) = 'object'),
  constraint content_publications_page_version_unique
    unique (page_id, version)
);

create index content_fields_page_sequence_idx
  on public.content_fields (page_id, sequence);

create index content_field_values_lookup_idx
  on public.content_field_values (field_id, channel, locale);

create index content_publications_page_version_idx
  on public.content_publications (page_id, version desc);

create or replace function public.set_content_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger content_pages_set_updated_at
before update on public.content_pages
for each row execute function public.set_content_updated_at();

create trigger content_fields_set_updated_at
before update on public.content_fields
for each row execute function public.set_content_updated_at();

create trigger content_field_values_set_updated_at
before update on public.content_field_values
for each row execute function public.set_content_updated_at();
