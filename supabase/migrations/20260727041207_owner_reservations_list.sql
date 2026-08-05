create extension if not exists pg_trgm with schema extensions;

do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'owner_reservations',
        'car_submission_vehicles'
      )
      and not relation.relrowsecurity
  ) then
    raise exception
      'RLS must be enabled on reservation list source tables';
  end if;
end;
$$;

create index if not exists owner_reservations_updated_at_id_idx
  on public.owner_reservations (updated_at desc, id);

create index if not exists owner_reservations_status_updated_at_id_idx
  on public.owner_reservations (status, updated_at desc, id);

create index if not exists owner_reservations_status_alpha_updated_at_id_idx
  on public.owner_reservations (
    (
      case status
        when 'approved'::public.owner_reservation_status then 1
        when 'received'::public.owner_reservation_status then 2
        when 'requested'::public.owner_reservation_status then 3
        when 'required'::public.owner_reservation_status then 4
      end
    ),
    updated_at desc,
    id
  );

create index if not exists owner_reservations_owner_search_trgm_idx
  on public.owner_reservations
  using gin (
    lower(
      coalesce(owner_forenames, '')
      || ' '
      || coalesce(owner_surname, '')
      || ' '
      || coalesce(owner_surname, '')
      || ' '
      || coalesce(owner_forenames, '')
      || ' '
      || coalesce(owner_email, '')
    )
      extensions.gin_trgm_ops
  );

create index if not exists car_submissions_form_owner_search_trgm_idx
  on public.car_submissions_form
  using gin (
    lower(
      first_name
      || ' '
      || name
      || ' '
      || name
      || ' '
      || first_name
      || ' '
      || email
    )
      extensions.gin_trgm_ops
  );

create index if not exists car_submission_vehicles_reservation_eligible_idx
  on public.car_submission_vehicles (submission_id)
  where deleted_at is null
    and status in (
      'approved'::public.submission_status,
      'finalized'::public.submission_status
    );

create or replace function public.get_owner_reservations_list(
  p_page integer default 1,
  p_page_size integer default 10,
  p_query text default null,
  p_status public.owner_reservation_status default null,
  p_has_deleted_at boolean default false,
  p_sort_key text default 'updated',
  p_sort_desc boolean default true
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 10), 1), 100);
  v_query text := nullif(lower(btrim(p_query)), '');
  v_sort_desc boolean := coalesce(p_sort_desc, true);
  v_result jsonb;
begin
  if p_sort_key is null or p_sort_key not in ('status', 'updated') then
    raise exception 'Unsupported owner reservation sort key: %', p_sort_key
      using errcode = '22023';
  end if;

  with paged as (
    select
      reservation.id,
      reservation.submission_id,
      reservation.owner_title,
      coalesce(
        nullif(btrim(reservation.owner_forenames), ''),
        submission.first_name
      ) as owner_forenames,
      coalesce(
        nullif(btrim(reservation.owner_surname), ''),
        submission.name
      ) as owner_surname,
      coalesce(
        nullif(btrim(reservation.owner_email), ''),
        submission.email
      ) as owner_email,
      reservation.status,
      reservation.seen,
      reservation.created_at,
      reservation.updated_at,
      case reservation.status
        when 'approved'::public.owner_reservation_status then 1
        when 'received'::public.owner_reservation_status then 2
        when 'requested'::public.owner_reservation_status then 3
        when 'required'::public.owner_reservation_status then 4
      end as status_sort_rank
    from public.owner_reservations as reservation
    left join public.car_submissions_form as submission
      on submission.id = reservation.submission_id
    where
      (p_status is null or reservation.status = p_status)
      and (reservation.deleted_at is not null) = coalesce(p_has_deleted_at, false)
      and (
        v_query is null
        or lower(
          coalesce(reservation.owner_forenames, '')
          || ' '
          || coalesce(reservation.owner_surname, '')
          || ' '
          || coalesce(reservation.owner_surname, '')
          || ' '
          || coalesce(reservation.owner_forenames, '')
          || ' '
          || coalesce(reservation.owner_email, '')
        ) like '%' || v_query || '%'
        or lower(
          submission.first_name
          || ' '
          || submission.name
          || ' '
          || submission.name
          || ' '
          || submission.first_name
          || ' '
          || submission.email
        ) like '%' || v_query || '%'
      )
    order by
      case
        when p_sort_key = 'status' and not v_sort_desc
          then case reservation.status
            when 'approved'::public.owner_reservation_status then 1
            when 'received'::public.owner_reservation_status then 2
            when 'requested'::public.owner_reservation_status then 3
            when 'required'::public.owner_reservation_status then 4
          end
      end asc,
      case
        when p_sort_key = 'status' and v_sort_desc
          then case reservation.status
            when 'approved'::public.owner_reservation_status then 1
            when 'received'::public.owner_reservation_status then 2
            when 'requested'::public.owner_reservation_status then 3
            when 'required'::public.owner_reservation_status then 4
          end
      end desc,
      case
        when p_sort_key = 'updated' and not v_sort_desc
          then reservation.updated_at
      end asc,
      case
        when p_sort_key = 'updated' and v_sort_desc
          then reservation.updated_at
      end desc,
      reservation.updated_at desc,
      reservation.id asc
    limit v_page_size
    offset (v_page - 1) * v_page_size
  ),
  page_data as (
    select
      paged.id,
      paged.submission_id,
      paged.owner_title,
      paged.owner_forenames,
      paged.owner_surname,
      paged.owner_email,
      paged.status,
      paged.seen,
      paged.created_at,
      paged.updated_at,
      paged.status_sort_rank,
      vehicle_counts.approved_vehicle_count,
      vehicle_counts.finalized_vehicle_count
    from paged
    cross join lateral (
      select
        count(*) filter (
          where vehicle.status = 'approved'::public.submission_status
        )::integer as approved_vehicle_count,
        count(*) filter (
          where vehicle.status = 'finalized'::public.submission_status
            and vehicle.archived_at is null
        )::integer as finalized_vehicle_count
        from public.car_submission_vehicles as vehicle
        where vehicle.submission_id = paged.submission_id
          and vehicle.deleted_at is null
          and vehicle.status in (
            'approved'::public.submission_status,
            'finalized'::public.submission_status
          )
    ) as vehicle_counts
  )
  select jsonb_build_object(
    'data', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', page_data.id,
            'submission_id', page_data.submission_id,
            'owner_title', page_data.owner_title,
            'owner_forenames', page_data.owner_forenames,
            'owner_surname', page_data.owner_surname,
            'owner_email', page_data.owner_email,
            'status', page_data.status,
            'seen', page_data.seen,
            'created_at', page_data.created_at,
            'updated_at', page_data.updated_at,
            'approved_vehicle_count', page_data.approved_vehicle_count,
            'finalized_vehicle_count', page_data.finalized_vehicle_count
          )
          order by
            case
              when p_sort_key = 'status' and not v_sort_desc
                then page_data.status_sort_rank
            end asc,
            case
              when p_sort_key = 'status' and v_sort_desc
                then page_data.status_sort_rank
            end desc,
            case
              when p_sort_key = 'updated' and not v_sort_desc
                then page_data.updated_at
            end asc,
            case
              when p_sort_key = 'updated' and v_sort_desc
                then page_data.updated_at
            end desc,
            page_data.updated_at desc,
            page_data.id asc
        )
        from page_data
      ),
      '[]'::jsonb
    ),
    'total', (
      select count(*)
      from public.owner_reservations as reservation
      left join public.car_submissions_form as submission
        on submission.id = reservation.submission_id
      where
        (p_status is null or reservation.status = p_status)
        and (reservation.deleted_at is not null) = coalesce(p_has_deleted_at, false)
        and (
          v_query is null
          or lower(
            coalesce(reservation.owner_forenames, '')
            || ' '
            || coalesce(reservation.owner_surname, '')
            || ' '
            || coalesce(reservation.owner_surname, '')
            || ' '
            || coalesce(reservation.owner_forenames, '')
            || ' '
            || coalesce(reservation.owner_email, '')
          ) like '%' || v_query || '%'
          or lower(
            submission.first_name
            || ' '
            || submission.name
            || ' '
            || submission.name
            || ' '
            || submission.first_name
            || ' '
            || submission.email
          ) like '%' || v_query || '%'
        )
    ),
    'status_counts', (
      select jsonb_build_object(
        'all', count(*),
        'required', count(*) filter (
          where reservation.status = 'required'::public.owner_reservation_status
        ),
        'requested', count(*) filter (
          where reservation.status = 'requested'::public.owner_reservation_status
        ),
        'received', count(*) filter (
          where reservation.status = 'received'::public.owner_reservation_status
        ),
        'approved', count(*) filter (
          where reservation.status = 'approved'::public.owner_reservation_status
        )
      )
      from public.owner_reservations as reservation
      left join public.car_submissions_form as submission
        on submission.id = reservation.submission_id
      where
        (reservation.deleted_at is not null) = coalesce(p_has_deleted_at, false)
        and (
          v_query is null
          or lower(
            coalesce(reservation.owner_forenames, '')
            || ' '
            || coalesce(reservation.owner_surname, '')
            || ' '
            || coalesce(reservation.owner_surname, '')
            || ' '
            || coalesce(reservation.owner_forenames, '')
            || ' '
            || coalesce(reservation.owner_email, '')
          ) like '%' || v_query || '%'
          or lower(
            submission.first_name
            || ' '
            || submission.name
            || ' '
            || submission.name
            || ' '
            || submission.first_name
            || ' '
            || submission.email
          ) like '%' || v_query || '%'
        )
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_owner_reservations_list(
  integer,
  integer,
  text,
  public.owner_reservation_status,
  boolean,
  text,
  boolean
) from public, anon;

grant execute on function public.get_owner_reservations_list(
  integer,
  integer,
  text,
  public.owner_reservation_status,
  boolean,
  text,
  boolean
) to authenticated;
