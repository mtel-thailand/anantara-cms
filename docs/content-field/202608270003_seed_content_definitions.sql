-- Generic pages only. CMS labels/descriptions live in feature code.
insert into public.content_pages (key)
values
  ('cars.classes'),
  ('sponsors'),
  ('judges'),
  ('awards.best_of_show'),
  ('awards.best_in_class'),
  ('awards.special_awards'),
  ('gallery')
on conflict (key) do nothing;

-- Earlier versions of this seed named the desktop-only Sponsors footer "body".
-- Keep existing installations compatible when this seed is re-applied.
update public.content_fields as field
set
  key = 'footer',
  placement = 'footer',
  config = '{"appFallbackToWeb":true,"requiredVariants":["web:en"]}'::jsonb
from public.content_pages as page
where field.page_id = page.id
  and page.key = 'sponsors'
  and field.key = 'body'
  and not exists (
    select 1
    from public.content_fields as existing_field
    where existing_field.page_id = page.id
      and existing_field.key = 'footer'
  );

insert into public.content_fields (
  page_id, key, content_type, placement, is_localized,
  channel_mode, required, sequence, config
)
select
  page.id, definition.field_key, definition.content_type,
  definition.placement, definition.is_localized,
  definition.channel_mode, definition.required,
  definition.sequence, definition.config
from (
  values
    ('cars.classes', 'hero', 'rich_text', 'header', true, 'per_channel', true, 1, '{"appFallbackToWeb":true,"requiredVariants":["web:en","app:en"]}'::jsonb),
    ('sponsors', 'header', 'rich_text', 'header', true, 'per_channel', true, 1, '{"appFallbackToWeb":true,"requiredVariants":["web:en","app:en"]}'::jsonb),
    ('sponsors', 'footer', 'rich_text', 'footer', true, 'per_channel', true, 2, '{"appFallbackToWeb":true,"requiredVariants":["web:en"]}'::jsonb),
    ('judges', 'hero', 'rich_text', 'header', true, 'per_channel', true, 1, '{"appFallbackToWeb":true,"requiredVariants":["web:en","app:en"]}'::jsonb),
    ('awards.best_of_show', 'description', 'plain_text', 'header', true, 'shared', true, 1, '{}'::jsonb),
    ('awards.best_in_class', 'description', 'plain_text', 'header', true, 'shared', true, 1, '{}'::jsonb),
    ('awards.special_awards', 'description', 'plain_text', 'header', true, 'shared', true, 1, '{}'::jsonb),
    ('gallery', 'contact_email', 'email', 'metadata', false, 'shared', true, 1, '{}'::jsonb),
    ('gallery', 'introduction', 'rich_text', 'header', true, 'per_channel', true, 2, '{"appFallbackToWeb":true,"requiredVariants":["web:en","app:en"]}'::jsonb)
) as definition(
  page_key, field_key, content_type, placement, is_localized,
  channel_mode, required, sequence, config
)
join public.content_pages as page on page.key = definition.page_key
on conflict (page_id, key) do update
set
  content_type = excluded.content_type,
  placement = excluded.placement,
  is_localized = excluded.is_localized,
  channel_mode = excluded.channel_mode,
  required = excluded.required,
  sequence = excluded.sequence,
  config = excluded.config;

-- Static pages are intentionally excluded; this migration neither creates,
-- reads nor changes the project's existing static-page structure.
