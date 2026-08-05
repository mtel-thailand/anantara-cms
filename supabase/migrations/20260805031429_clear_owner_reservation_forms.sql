create or replace function public.clear_owner_reservation_forms()
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_deleted_at timestamptz := statement_timestamp();
  v_owner_reservation_count integer;
  v_approved_vehicle_count integer;
begin
  update public.owner_reservations
  set deleted_at = v_deleted_at
  where deleted_at is null;

  get diagnostics v_owner_reservation_count = row_count;

  update public.car_submission_vehicles
  set deleted_at = v_deleted_at
  where deleted_at is null
    and status = 'approved'::public.submission_status;

  get diagnostics v_approved_vehicle_count = row_count;

  return jsonb_build_object(
    'owner_reservation_count', v_owner_reservation_count,
    'approved_vehicle_count', v_approved_vehicle_count
  );
end;
$$;

revoke all on function public.clear_owner_reservation_forms()
from public, anon;

grant execute on function public.clear_owner_reservation_forms()
to authenticated;
