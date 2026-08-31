create or replace function public.car_classes_revision()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select md5(
    jsonb_build_object(
      'classes', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', category.id,
              'name', category.name,
              'sequence', category.seq
            )
            order by category.seq, category.id
          )
          from public.car_categories as category
          where category.enable is true
        ),
        '[]'::jsonb
      ),
      'cars', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', car.id,
              'submissionVehicleId', car.submission_vehicle_id,
              'categoryId', car.category_id,
              'sequence', car.seq
            )
            order by car.id
          )
          from public.cars as car
          join public.car_submission_vehicles as vehicle
            on vehicle.id = car.submission_vehicle_id
          where vehicle.status = 'finalized'
            and vehicle.archived_at is null
            and vehicle.deleted_at is null
        ),
        '[]'::jsonb
      )
    )::text
  );
$$;

create or replace function public.publish_car_classes(
  p_expected_revision text,
  p_classes jsonb,
  p_cars jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  class_payload jsonb;
  car_payload jsonb;
  active_class_ids bigint[];
  payload_class_ids bigint[] := '{}'::bigint[];
  eligible_car_ids uuid[];
  payload_car_ids uuid[] := '{}'::uuid[];
  live_class_ids jsonb := '{}'::jsonb;
  class_sequences integer[] := '{}'::integer[];
  v_class_id text;
  v_category_id text;
  v_name text;
  v_sequence integer;
  v_removed boolean;
  v_database_class_id bigint;
  v_affected_count integer;
begin
  if jsonb_typeof(p_classes) <> 'array' or jsonb_typeof(p_cars) <> 'array' then
    raise exception 'Class and car payloads must be arrays.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('public.publish_car_classes', 0));
  lock table public.car_categories, public.cars, public.car_submission_vehicles
    in share row exclusive mode;

  if public.car_classes_revision() <> p_expected_revision then
    raise exception 'The class configuration changed. Refresh and try again.';
  end if;

  select coalesce(array_agg(category.id::bigint order by category.id), '{}'::bigint[])
    into active_class_ids
  from public.car_categories as category
  where category.enable is true;

  for class_payload in select value from jsonb_array_elements(p_classes)
  loop
    v_class_id := class_payload ->> 'id';
    v_name := nullif(btrim(class_payload ->> 'name'), '');
    v_removed := coalesce((class_payload ->> 'removed')::boolean, false);
    v_sequence := (class_payload ->> 'sequence')::integer;

    if v_class_id is null
      or v_name is null
      or v_sequence is null
      or v_sequence < 1
      or (v_class_id !~ '^[0-9]+$' and v_class_id !~ '^temp-[0-9a-f-]+$') then
      raise exception 'The class payload is invalid.';
    end if;

    if v_class_id ~ '^[0-9]+$' then
      payload_class_ids := array_append(payload_class_ids, v_class_id::bigint);
    end if;

    if not v_removed then
      if live_class_ids ? v_class_id then
        raise exception 'Class IDs must be unique.';
      end if;

      live_class_ids := live_class_ids || jsonb_build_object(v_class_id, null);
      class_sequences := array_append(class_sequences, v_sequence);
    end if;
  end loop;

  if cardinality(payload_class_ids) <> cardinality(active_class_ids)
    or exists (
      select 1
      from unnest(payload_class_ids) as payload_id
      where not payload_id = any(active_class_ids)
    )
    or cardinality(payload_class_ids) <> (
      select count(distinct payload_id)
      from unnest(payload_class_ids) as payload_id
    ) then
    raise exception 'The class list changed. Refresh and try again.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_classes)
    group by value ->> 'id'
    having count(*) > 1
  ) then
    raise exception 'Class IDs must be unique.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_classes)
    where coalesce((value ->> 'removed')::boolean, false) is false
    group by lower(btrim(value ->> 'name'))
    having count(*) > 1
  ) then
    raise exception 'Class names must be unique.';
  end if;

  if exists (
    select 1
    from unnest(class_sequences) with ordinality as sequence_value(sequence, position)
    where sequence <> position
  ) then
    raise exception 'Live class order must be consecutive.';
  end if;

  if exists (
    with assigned_cars as (
      select
        value ->> 'categoryId' as category_id,
        (value ->> 'sequence')::integer as sequence
      from jsonb_array_elements(p_cars)
      where value ->> 'categoryId' is not null
    ), grouped_sequences as (
      select category_id, array_agg(sequence order by sequence) as sequences
      from assigned_cars
      group by category_id
    )
    select 1
    from grouped_sequences
    cross join lateral unnest(sequences) with ordinality as sequence_value(sequence, position)
    where sequence <> position
  ) then
    raise exception 'Car order must be consecutive within each class.';
  end if;

  select coalesce(array_agg(car.id order by car.id), '{}'::uuid[])
    into eligible_car_ids
  from public.cars as car
  join public.car_submission_vehicles as vehicle
    on vehicle.id = car.submission_vehicle_id
  where vehicle.status = 'finalized'
    and vehicle.archived_at is null
    and vehicle.deleted_at is null;

  for car_payload in select value from jsonb_array_elements(p_cars)
  loop
    if car_payload ->> 'id' is null
      or (car_payload ->> 'categoryId' is null and car_payload ->> 'sequence' is not null)
      or (car_payload ->> 'categoryId' is not null and car_payload ->> 'sequence' is null)
      or (
        car_payload ->> 'sequence' is not null
        and (car_payload ->> 'sequence')::integer < 1
      ) then
      raise exception 'The car payload is invalid.';
    end if;

    payload_car_ids := array_append(payload_car_ids, (car_payload ->> 'id')::uuid);
  end loop;

  if cardinality(payload_car_ids) <> cardinality(eligible_car_ids)
    or exists (
      select 1
      from unnest(payload_car_ids) as payload_id
      where not payload_id = any(eligible_car_ids)
    )
    or cardinality(payload_car_ids) <> (
      select count(distinct payload_id)
      from unnest(payload_car_ids) as payload_id
    ) then
    raise exception 'The finalized car list changed. Refresh and try again.';
  end if;

  for class_payload in select value from jsonb_array_elements(p_classes)
  loop
    v_class_id := class_payload ->> 'id';
    v_removed := coalesce((class_payload ->> 'removed')::boolean, false);

    if v_class_id !~ '^temp-' or v_removed then
      continue;
    end if;

    insert into public.car_categories (enable, name, seq)
    values (
      true,
      btrim(class_payload ->> 'name'),
      (class_payload ->> 'sequence')::integer
    )
    returning id::bigint into v_database_class_id;

    live_class_ids := live_class_ids || jsonb_build_object(
      v_class_id,
      v_database_class_id
    );
  end loop;

  for class_payload in select value from jsonb_array_elements(p_classes)
  loop
    v_class_id := class_payload ->> 'id';
    if v_class_id !~ '^[0-9]+$' then
      continue;
    end if;

    update public.car_categories
    set
      enable = not coalesce((class_payload ->> 'removed')::boolean, false),
      name = btrim(class_payload ->> 'name'),
      seq = (class_payload ->> 'sequence')::integer
    where id = v_class_id::bigint;

    get diagnostics v_affected_count = row_count;
    if v_affected_count <> 1 then
      raise exception 'A class could not be published.';
    end if;

    if not coalesce((class_payload ->> 'removed')::boolean, false) then
      live_class_ids := live_class_ids || jsonb_build_object(
        v_class_id,
        v_class_id::bigint
      );
    end if;
  end loop;

  for car_payload in select value from jsonb_array_elements(p_cars)
  loop
    v_category_id := car_payload ->> 'categoryId';

    if v_category_id is null then
      update public.cars
      set category_id = null, seq = null
      where id = (car_payload ->> 'id')::uuid;
    else
      if not (live_class_ids ? v_category_id) then
        raise exception 'A car references an unavailable class.';
      end if;

      update public.cars
      set
        category_id = (live_class_ids ->> v_category_id)::bigint,
        seq = (car_payload ->> 'sequence')::integer
      where id = (car_payload ->> 'id')::uuid;
    end if;

    get diagnostics v_affected_count = row_count;
    if v_affected_count <> 1 then
      raise exception 'A car assignment could not be published.';
    end if;
  end loop;
end;
$$;

revoke execute on function public.car_classes_revision() from public;
revoke execute on function public.publish_car_classes(text, jsonb, jsonb) from public;
grant execute on function public.car_classes_revision() to authenticated;
grant execute on function public.publish_car_classes(text, jsonb, jsonb) to authenticated;
