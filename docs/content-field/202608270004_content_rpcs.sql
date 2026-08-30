-- Read and publish APIs for the reusable content system.

create or replace function public.is_valid_content_field_value(
  p_content_type text,
  p_value jsonb
)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select case p_content_type
    when 'rich_text' then
      jsonb_typeof(p_value) = 'object'
      and (
        (
          p_value->>'format' = 'html'
          and nullif(btrim(p_value->>'content'), '') is not null
        )
        or (
          p_value->>'format' = 'rich_text_json'
          and jsonb_typeof(p_value->'document') = 'object'
        )
      )
    when 'plain_text' then
      jsonb_typeof(p_value) = 'object'
      and nullif(btrim(p_value->>'text'), '') is not null
    when 'email' then
      jsonb_typeof(p_value) = 'object'
      and p_value->>'email' ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    when 'image' then
      jsonb_typeof(p_value) = 'object'
      and nullif(btrim(p_value->>'storageKey'), '') is not null
    else false
  end;
$$;

create or replace function public.get_content_page_admin(p_page_key text)
returns table (
  page_id uuid,
  page_key text,
  page_version bigint,
  published_at timestamptz,
  field_id uuid,
  field_key text,
  content_type text,
  placement text,
  is_localized boolean,
  channel_mode text,
  required boolean,
  field_sequence integer,
  field_config jsonb,
  value_id uuid,
  locale text,
  channel text,
  field_value jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    page.id,
    page.key,
    page.version,
    page.published_at,
    field.id,
    field.key,
    field.content_type,
    field.placement,
    field.is_localized,
    field.channel_mode,
    field.required,
    field.sequence,
    field.config,
    field_value.id,
    field_value.locale,
    field_value.channel,
    field_value.value
  from public.content_pages as page
  join public.content_fields as field
    on field.page_id = page.id
  left join public.content_field_values as field_value
    on field_value.field_id = field.id
  where page.key = p_page_key
  order by
    field.sequence,
    field_value.channel nulls first,
    field_value.locale nulls first;
$$;

create or replace function public.get_content_page_public(
  p_page_key text,
  p_locale text,
  p_channel text
)
returns table (
  page_key text,
  page_version bigint,
  field_key text,
  content_type text,
  placement text,
  field_sequence integer,
  field_value jsonb
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_locale not in ('en', 'it') then
    raise exception 'Unsupported content locale.';
  end if;

  if p_channel not in ('web', 'app') then
    raise exception 'Unsupported content channel.';
  end if;

  return query
  select
    page.key,
    page.version,
    field.key,
    field.content_type,
    field.placement,
    field.sequence,
    selected_value.value
  from public.content_pages as page
  join public.content_fields as field
    on field.page_id = page.id
  join lateral (
    select candidate.value
    from public.content_field_values as candidate
    where candidate.field_id = field.id
      and candidate.locale = case
        when field.is_localized then p_locale
        else 'und'
      end
      and (
        (
          field.channel_mode = 'shared'
          and candidate.channel = 'shared'
        )
        or (
          field.channel_mode = 'per_channel'
          and candidate.channel = p_channel
        )
        or (
          field.channel_mode = 'per_channel'
          and p_channel = 'app'
          and coalesce((field.config->>'appFallbackToWeb')::boolean, false)
          and candidate.channel = 'web'
        )
      )
    order by case
      when candidate.channel = p_channel then 1
      when candidate.channel = 'shared' then 2
      when candidate.channel = 'web' then 3
      else 4
    end
    limit 1
  ) as selected_value on true
  where page.key = p_page_key
  order by field.sequence;
end;
$$;

-- Replace the prior three-argument overload that used an expected version.
drop function if exists public.publish_content_page(text, bigint, jsonb);

create or replace function public.publish_content_page(
  p_page_key text,
  p_values jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  page_record record;
  field_record record;
  value_payload jsonb;
  required_variant text;
  payload_locale text;
  payload_channel text;
  payload_value jsonb;
  next_version bigint;
  publication_snapshot jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if jsonb_typeof(p_values) <> 'array' then
    raise exception 'Content values must be an array.';
  end if;

  if jsonb_array_length(p_values) > 200 then
    raise exception 'Too many content values.';
  end if;

  select page.id
    into page_record
  from public.content_pages as page
  where page.key = p_page_key
  for update;

  if not found then
    raise exception 'Content page does not exist.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_values) as item(value)
    group by
      item.value->>'fieldKey',
      item.value->>'locale',
      item.value->>'channel'
    having count(*) > 1
  ) then
    raise exception 'Content variants must be unique.';
  end if;

  for value_payload in
    select item.value
    from jsonb_array_elements(p_values) as item(value)
  loop
    if jsonb_typeof(value_payload) <> 'object' then
      raise exception 'Each content value must be an object.';
    end if;

    select field.*
      into field_record
    from public.content_fields as field
    where field.page_id = page_record.id
      and field.key = value_payload->>'fieldKey';

    if not found then
      raise exception 'A content value references an unknown field.';
    end if;

    payload_locale := value_payload->>'locale';
    payload_channel := value_payload->>'channel';
    payload_value := value_payload->'value';

    if payload_locale is null or payload_channel is null then
      raise exception 'Content locale and channel are required.';
    end if;

    if not field_record.is_localized and payload_locale <> 'und' then
      raise exception 'The content locale does not match its field definition.';
    end if;

    if field_record.is_localized and payload_locale not in ('en', 'it') then
      raise exception 'Localized fields support only EN and IT.';
    end if;

    if (
      field_record.channel_mode = 'shared'
      and payload_channel <> 'shared'
    ) or (
      field_record.channel_mode = 'per_channel'
      and payload_channel not in ('web', 'app')
    ) then
      raise exception 'The content channel does not match its field definition.';
    end if;

    if payload_value is not null
      and payload_value <> 'null'::jsonb
      and not public.is_valid_content_field_value(
        field_record.content_type,
        payload_value
      ) then
      raise exception 'A content value has an invalid shape.';
    end if;
  end loop;

  -- The field definition explicitly declares publish baselines. This allows
  -- optional translations, such as Web Italian, to be published later.
  for field_record in
    select field.*
    from public.content_fields as field
    where field.page_id = page_record.id
      and field.required
  loop
    for required_variant in
      select jsonb_array_elements_text(
        coalesce(
          field_record.config->'requiredVariants',
          case
            when field_record.channel_mode = 'per_channel' and field_record.is_localized
              then jsonb_build_array('web:en', 'app:en')
            when field_record.channel_mode = 'shared' and field_record.is_localized
              then jsonb_build_array('shared:en')
            else jsonb_build_array('shared:und')
          end
        )
      )
    loop
      if not exists (
        select 1
        from jsonb_array_elements(p_values) as item(value)
        where item.value->>'fieldKey' = field_record.key
          and item.value->>'locale' = split_part(required_variant, ':', 2)
          and item.value->>'channel' = split_part(required_variant, ':', 1)
          and item.value->'value' is not null
          and item.value->'value' <> 'null'::jsonb
      ) then
        raise exception 'A required content value is missing.';
      end if;
    end loop;
  end loop;

  for value_payload in
    select item.value
    from jsonb_array_elements(p_values) as item(value)
  loop
    select field.*
      into field_record
    from public.content_fields as field
    where field.page_id = page_record.id
      and field.key = value_payload->>'fieldKey';

    payload_locale := value_payload->>'locale';
    payload_channel := value_payload->>'channel';
    payload_value := value_payload->'value';

    if payload_value is null or payload_value = 'null'::jsonb then
      delete from public.content_field_values as field_value
      where field_value.field_id = field_record.id
        and field_value.locale = payload_locale
        and field_value.channel = payload_channel;
    else
      insert into public.content_field_values (
        field_id,
        locale,
        channel,
        value
      )
      values (
        field_record.id,
        payload_locale,
        payload_channel,
        payload_value
      )
      on conflict (field_id, locale, channel) do update
      set value = excluded.value;
    end if;
  end loop;

  update public.content_pages as page
  set
    version = page.version + 1,
    published_at = now()
  where page.id = page_record.id
  returning page.version into next_version;

  select jsonb_build_object(
    'pageKey', p_page_key,
    'version', next_version,
    'values', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'fieldKey', field.key,
          'locale', field_value.locale,
          'channel', field_value.channel,
          'value', field_value.value
        )
        order by field.sequence, field_value.channel, field_value.locale
      ) filter (where field_value.id is not null),
      '[]'::jsonb
    )
  )
    into publication_snapshot
  from public.content_fields as field
  left join public.content_field_values as field_value
    on field_value.field_id = field.id
  where field.page_id = page_record.id;

  insert into public.content_publications (
    page_id,
    version,
    snapshot,
    published_by
  )
  values (
    page_record.id,
    next_version,
    publication_snapshot,
    auth.uid()
  );

  return publication_snapshot;
end;
$$;

revoke all on function public.is_valid_content_field_value(text, jsonb)
  from public;
revoke all on function public.get_content_page_admin(text)
  from public;
revoke all on function public.get_content_page_public(text, text, text)
  from public;
revoke all on function public.publish_content_page(text, jsonb)
  from public;

grant execute on function public.get_content_page_admin(text)
  to authenticated;
grant execute on function public.get_content_page_public(text, text, text)
  to anon, authenticated;
grant execute on function public.publish_content_page(text, jsonb)
  to authenticated;
