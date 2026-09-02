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
    ('awards.best_of_show', 'description', 'plain_text', 'header', false, 'shared', true, 1, '{"requiredVariants":["shared:und"]}'::jsonb),
    ('awards.best_in_class', 'description', 'plain_text', 'header', false, 'shared', true, 1, '{"requiredVariants":["shared:und"]}'::jsonb),
    ('awards.special_awards', 'description', 'plain_text', 'header', false, 'shared', true, 1, '{"requiredVariants":["shared:und"]}'::jsonb),
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

-- Award descriptions used to be stored as localized Web/App rich text. Move
-- the best available legacy value into one shared, unlocalized plain-text row.
insert into public.content_field_values (field_id, locale, channel, value)
select
  field.id,
  'und',
  'shared',
  jsonb_build_object(
    'text',
    coalesce(legacy.value->>'text', legacy.value->>'content')
  )
from public.content_fields as field
join public.content_pages as page on page.id = field.page_id
cross join lateral (
  select field_value.value
  from public.content_field_values as field_value
  where field_value.field_id = field.id
    and nullif(
      btrim(coalesce(field_value.value->>'text', field_value.value->>'content')),
      ''
    ) is not null
  order by
    case
      when field_value.channel = 'app' and field_value.locale = 'en' then 1
      when field_value.channel = 'web' and field_value.locale = 'en' then 2
      else 3
    end
  limit 1
) as legacy
where page.key in (
  'awards.best_of_show',
  'awards.best_in_class',
  'awards.special_awards'
)
  and field.key = 'description'
on conflict (field_id, locale, channel) do nothing;

delete from public.content_field_values as field_value
using public.content_fields as field, public.content_pages as page
where field_value.field_id = field.id
  and field.page_id = page.id
  and page.key in (
    'awards.best_of_show',
    'awards.best_in_class',
    'awards.special_awards'
  )
  and field.key = 'description'
  and (field_value.channel, field_value.locale) <> ('shared', 'und');

-- Static pages are intentionally excluded; this migration neither creates,
-- reads nor changes the project's existing static-page structure.
