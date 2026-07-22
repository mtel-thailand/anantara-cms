create or replace function public.get_car_submissions_list(
  p_page integer default 1,
  p_page_size integer default 10,
  p_query text default null,
  p_status public.submission_status default null,
  p_sort_key text default 'updated',
  p_sort_desc boolean default true,
  p_excluded_statuses public.submission_status[] default array[
    'archived'::public.submission_status,
    'finalized'::public.submission_status,
    'approved'::public.submission_status
  ],
  p_is_archived boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := greatest(coalesce(p_page_size, 10), 1);
  v_offset integer := (greatest(coalesce(p_page, 1), 1) - 1) * greatest(coalesce(p_page_size, 10), 1);
  v_keyword text := nullif(btrim(p_query), '');
  v_keywords text[];
  v_sort_key text := coalesce(nullif(p_sort_key, ''), 'updated');
  v_excluded_statuses public.submission_status[] := coalesce(
    p_excluded_statuses,
    array[]::public.submission_status[]
  );
  v_total bigint;
  v_data jsonb;
  v_counts jsonb;
begin
  if v_keyword is not null then
    v_keywords := regexp_split_to_array(v_keyword, '\s+');
  else
    v_keywords := array[]::text[];
  end if;

  with base as (
    select
      v.archived_at,
      v.body_style,
      v.car_id,
      v.chassis_no,
      v.coachbuilder,
      v.created_at,
      v.deleted_at,
      v.engine_no,
      v.exterior_colour,
      v.id,
      v.images,
      v.interior_colour,
      v.internal_comment::text as internal_comment,
      v.make_of_vehicle,
      v.model,
      v.review_note::jsonb as review_note,
      v.reviewed_at,
      v.seen,
      v.sequence,
      v.status,
      v.submission_id,
      v.updated_at,
      v.vehicle_documents,
      v.vehicle_history_en,
      v.vehicle_history_it,
      v.year_of_manufacture,
      f.accept_news,
      f.accept_terms,
      f.access_token,
      v.additional_photo_link,
      f.address,
      f.created_at as form_created_at,
      f.email,
      f.first_name,
      f.form_id,
      f.id as form_row_id,
      f.name,
      f.phone_number,
      f.synced_at,
      f.zip_code,
      btrim(concat_ws(' ', f.first_name, f.name)) as owner_full_name
    from public.car_submission_vehicles v
    inner join public.car_submissions_form f on f.id = v.submission_id
    where
      v.deleted_at is null
      and case
        when coalesce(p_is_archived, false) then v.archived_at is not null
        else v.archived_at is null
      end
      and not (v.status = any(v_excluded_statuses))
      and (p_status is null or v.status = p_status)
      and case
        when v_keyword is null then true
        when v_keyword ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
          v.id::text = v_keyword or v.car_id::text = v_keyword
        else not exists (
          select 1
          from unnest(v_keywords) as keyword_part(term)
          where not (
            v.make_of_vehicle ilike '%' || replace(replace(keyword_part.term, '%', '\%'), '_', '\_') || '%' escape '\'
            or v.car_id::text ilike '%' || replace(replace(keyword_part.term, '%', '\%'), '_', '\_') || '%' escape '\'
            or f.first_name ilike '%' || replace(replace(keyword_part.term, '%', '\%'), '_', '\_') || '%' escape '\'
            or f.name ilike '%' || replace(replace(keyword_part.term, '%', '\%'), '_', '\_') || '%' escape '\'
            or btrim(concat_ws(' ', f.first_name, f.name)) ilike '%' || replace(replace(keyword_part.term, '%', '\%'), '_', '\_') || '%' escape '\'
          )
        )
      end
  ),
  numbered as (
    select
      base.*,
      count(*) over () as full_count
    from base
    order by
      case when v_sort_key = 'owner' and not p_sort_desc then owner_full_name end asc nulls last,
      case when v_sort_key = 'owner' and p_sort_desc then owner_full_name end desc nulls last,
      case when v_sort_key = 'reference' and not p_sort_desc then car_id end asc nulls last,
      case when v_sort_key = 'reference' and p_sort_desc then car_id end desc nulls last,
      case when v_sort_key = 'vehicle' and not p_sort_desc then make_of_vehicle end asc nulls last,
      case when v_sort_key = 'vehicle' and p_sort_desc then make_of_vehicle end desc nulls last,
      case when v_sort_key = 'year' and not p_sort_desc and year_of_manufacture ~ '^[0-9]+$' then year_of_manufacture::integer end asc nulls last,
      case when v_sort_key = 'year' and p_sort_desc and year_of_manufacture ~ '^[0-9]+$' then year_of_manufacture::integer end desc nulls last,
      case when v_sort_key = 'submitted' and not p_sort_desc then created_at end asc nulls last,
      case when v_sort_key = 'submitted' and p_sort_desc then created_at end desc nulls last,
      case when v_sort_key = 'status' and not p_sort_desc then status::text end asc nulls last,
      case when v_sort_key = 'status' and p_sort_desc then status::text end desc nulls last,
      case when v_sort_key = 'updated' and not p_sort_desc then updated_at end asc nulls last,
      case when v_sort_key = 'updated' and p_sort_desc then updated_at end desc nulls last,
      updated_at desc,
      id asc
    limit v_page_size
    offset v_offset
  )
  select
    coalesce(max(full_count), 0),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'archived_at', archived_at,
          'body_style', body_style,
          'car_id', car_id,
          'chassis_no', chassis_no,
          'coachbuilder', coachbuilder,
          'created_at', created_at,
          'deleted_at', deleted_at,
          'engine_no', engine_no,
          'exterior_colour', exterior_colour,
          'id', id,
          'images', images,
          'interior_colour', interior_colour,
          'internal_comment', internal_comment,
          'make_of_vehicle', make_of_vehicle,
          'model', model,
          'review_note', review_note,
          'reviewed_at', reviewed_at,
          'seen', seen,
          'sequence', sequence,
          'status', status,
          'submission_id', submission_id,
          'updated_at', updated_at,
          'vehicle_documents', vehicle_documents,
          'vehicle_history_en', vehicle_history_en,
          'vehicle_history_it', vehicle_history_it,
          'year_of_manufacture', year_of_manufacture,
          'car_submissions_form', jsonb_build_object(
            'accept_news', accept_news,
            'accept_terms', accept_terms,
            'access_token', access_token,
            'additional_photo_link', additional_photo_link,
            'address', address,
            'created_at', form_created_at,
            'email', email,
            'first_name', first_name,
            'form_id', form_id,
            'id', form_row_id,
            'name', name,
            'phone_number', phone_number,
            'synced_at', synced_at,
            'zip_code', zip_code
          )
        )
      ),
      '[]'::jsonb
    )
  into v_total, v_data
  from numbered;

  with count_statuses(status_key) as (
    values
      ('pending'),
      ('under_review'),
      ('requested_info'),
      ('info_received'),
      ('waitlist'),
      ('rejected'),
      ('approved'),
      ('finalized'),
      ('archived')
  ),
  filtered_counts as (
    select
      v.status::text as status_key,
      count(*) as amount
    from public.car_submission_vehicles v
    inner join public.car_submissions_form f on f.id = v.submission_id
    where
      v.deleted_at is null
      and case
        when coalesce(p_is_archived, false) then v.archived_at is not null
        else v.archived_at is null
      end
      and case
        when v_keyword is null then true
        when v_keyword ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
          v.id::text = v_keyword or v.car_id::text = v_keyword
        else not exists (
          select 1
          from unnest(v_keywords) as keyword_part(term)
          where not (
            v.make_of_vehicle ilike '%' || replace(replace(keyword_part.term, '%', '\%'), '_', '\_') || '%' escape '\'
            or v.car_id::text ilike '%' || replace(replace(keyword_part.term, '%', '\%'), '_', '\_') || '%' escape '\'
            or f.first_name ilike '%' || replace(replace(keyword_part.term, '%', '\%'), '_', '\_') || '%' escape '\'
            or f.name ilike '%' || replace(replace(keyword_part.term, '%', '\%'), '_', '\_') || '%' escape '\'
            or btrim(concat_ws(' ', f.first_name, f.name)) ilike '%' || replace(replace(keyword_part.term, '%', '\%'), '_', '\_') || '%' escape '\'
          )
        )
      end
    group by v.status
  )
  select coalesce(
    jsonb_object_agg(
      count_statuses.status_key,
      coalesce(filtered_counts.amount, 0)
    ),
    '{}'::jsonb
  ) || jsonb_build_object(
    'all', coalesce(sum(filtered_counts.amount), 0)
  )
  into v_counts
  from count_statuses
  left join filtered_counts using (status_key)
  where not (
    count_statuses.status_key::public.submission_status
    = any(v_excluded_statuses)
  );

  return jsonb_build_object(
    'data', v_data,
    'total', v_total,
    'counts', coalesce(v_counts, '{}'::jsonb)
  );
end;
$function$;
