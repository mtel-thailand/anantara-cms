-- EXAMPLE DATA ONLY. Use instead of 202608270003_seed_content_definitions.sql.

insert into public.content_pages (id, key, version, published_at)
values
  ('10000000-0000-4000-8000-000000000001', 'cars.classes', 1, now()),
  ('10000000-0000-4000-8000-000000000002', 'sponsors', 1, now()),
  ('10000000-0000-4000-8000-000000000003', 'judges', 1, now()),
  ('10000000-0000-4000-8000-000000000004', 'awards.best_of_show', 1, now()),
  ('10000000-0000-4000-8000-000000000005', 'awards.best_in_class', 1, now()),
  ('10000000-0000-4000-8000-000000000006', 'awards.special_awards', 1, now()),
  ('10000000-0000-4000-8000-000000000007', 'gallery', 1, now());

insert into public.content_fields (
  id, page_id, key, content_type, placement, is_localized,
  channel_mode, required, sequence, config
)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'hero', 'rich_text', 'header', true, 'per_channel', true, 1, '{"appFallbackToWeb":true}'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'header', 'rich_text', 'header', true, 'per_channel', true, 1, '{"appFallbackToWeb":true}'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'body', 'rich_text', 'content', true, 'per_channel', true, 2, '{"appFallbackToWeb":true}'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'hero', 'rich_text', 'header', true, 'per_channel', true, 1, '{"appFallbackToWeb":true}'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000004', 'description', 'plain_text', 'header', true, 'shared', true, 1, '{}'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000005', 'description', 'plain_text', 'header', true, 'shared', true, 1, '{}'),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000006', 'description', 'plain_text', 'header', true, 'shared', true, 1, '{}'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000007', 'contact_email', 'email', 'metadata', false, 'shared', true, 1, '{}'),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000007', 'introduction', 'rich_text', 'header', true, 'per_channel', true, 2, '{"appFallbackToWeb":true}');

-- Four variants for every per-channel localized rich-text field.
insert into public.content_field_values (id, field_id, locale, channel, value)
select
  md5(field.id::text || ':' || locale.code || ':' || channel.code)::uuid,
  field.id,
  locale.code,
  channel.code,
  jsonb_build_object(
    'format', 'html',
    'content', format('<h1>%s</h1><p>%s %s example</p>', field.key, locale.code, channel.code)
  )
from public.content_fields as field
cross join (values ('en'), ('it')) as locale(code)
cross join (values ('web'), ('app')) as channel(code)
where field.content_type = 'rich_text';

-- Award descriptions use one value per language shared by Web/App.
insert into public.content_field_values (id, field_id, locale, channel, value)
select
  md5(field.id::text || ':' || locale.code || ':shared')::uuid,
  field.id,
  locale.code,
  'shared',
  jsonb_build_object('text', case locale.code
    when 'en' then 'Example award description.'
    else 'Descrizione di esempio del premio.'
  end)
from public.content_fields as field
cross join (values ('en'), ('it')) as locale(code)
where field.content_type = 'plain_text';

insert into public.content_field_values (id, field_id, locale, channel, value)
values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000008',
  'und',
  'shared',
  '{"email":"gallery@anantaraconcorsoroma.com"}'
);

-- Static pages are not included because the project already owns their schema.
