create or replace function public.get_car_class_car_details(
  p_submission_vehicle_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'id', vehicle.id,
    'archived_at', vehicle.archived_at,
    'car_entry_form_id', entry_form.id,
    'category_id', car.category_id,
    'class_name', category.name,
    'class_sequence', category.seq,
    'created_at', vehicle.created_at,
    'description_en', vehicle.vehicle_history_en,
    'description_it', vehicle.vehicle_history_it,
    'hide_owner_name', coalesce(entry_form.hide_owner_name, false),
    'images', vehicle.images,
    'make', vehicle.make_of_vehicle,
    'model', vehicle.model,
    'owner_email', submission.email,
    'owner_first_name', submission.first_name,
    'owner_form_needs_attention', coalesce(reservation.status <> 'approved', false),
    'owner_last_name', submission.name,
    'owner_reservation_id', reservation.id,
    'status', vehicle.status,
    'updated_at', vehicle.updated_at,
    'vehicle_ref', vehicle.vehicle_ref,
    'year', car.year
  )
  from public.car_submission_vehicles as vehicle
  join public.car_submissions_form as submission
    on submission.id = vehicle.submission_id
  left join public.cars as car
    on car.submission_vehicle_id = vehicle.id
  left join public.car_categories as category
    on category.id = car.category_id
  left join lateral (
    select owner_reservation.id, owner_reservation.status
    from public.owner_reservations as owner_reservation
    where owner_reservation.submission_id = vehicle.submission_id
    order by owner_reservation.updated_at desc
    limit 1
  ) as reservation on true
  left join public.car_entry_forms as entry_form
    on entry_form.submission_vehicle_id = vehicle.id
    and entry_form.deleted_at is null
  where vehicle.id = p_submission_vehicle_id
  limit 1;
$$;

revoke execute on function public.get_car_class_car_details(uuid) from public;
grant execute on function public.get_car_class_car_details(uuid) to authenticated;
