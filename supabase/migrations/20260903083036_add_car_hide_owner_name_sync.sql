alter table public.cars
  add column if not exists hide_owner_name boolean not null default false;

-- Existing finalized cars inherit the active entry-form preference. Cars that
-- have no active form remain public by default.
update public.cars as car
set hide_owner_name = false
where car.hide_owner_name is distinct from false
  and not exists (
    select 1
    from public.car_entry_forms as entry_form
    where entry_form.submission_vehicle_id = car.submission_vehicle_id
      and entry_form.deleted_at is null
  );

update public.cars as car
set hide_owner_name = entry_form.hide_owner_name
from public.car_entry_forms as entry_form
where entry_form.submission_vehicle_id = car.submission_vehicle_id
  and entry_form.deleted_at is null
  and car.hide_owner_name is distinct from entry_form.hide_owner_name;

create or replace function public.sync_car_hide_owner_name_from_entry_form()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.deleted_at is not null then
    return new;
  end if;

  update public.cars as car
  set hide_owner_name = new.hide_owner_name
  where car.submission_vehicle_id = new.submission_vehicle_id
    and car.hide_owner_name is distinct from new.hide_owner_name;

  return new;
end;
$$;

create or replace function public.sync_car_entry_form_hide_owner_name_from_car()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  entry_form_hide_owner_name boolean;
begin
  if tg_op = 'INSERT' then
    select entry_form.hide_owner_name
    into entry_form_hide_owner_name
    from public.car_entry_forms as entry_form
    where entry_form.submission_vehicle_id = new.submission_vehicle_id
      and entry_form.deleted_at is null
    limit 1;

    if found then
      new.hide_owner_name := entry_form_hide_owner_name;
    end if;

    return new;
  end if;

  if new.hide_owner_name is distinct from old.hide_owner_name then
    update public.car_entry_forms as entry_form
    set hide_owner_name = new.hide_owner_name
    where entry_form.submission_vehicle_id = new.submission_vehicle_id
      and entry_form.deleted_at is null
      and entry_form.hide_owner_name is distinct from new.hide_owner_name;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_car_hide_owner_name_from_entry_form() from public, anon, authenticated;
revoke all on function public.sync_car_entry_form_hide_owner_name_from_car() from public, anon, authenticated;

drop trigger if exists sync_car_hide_owner_name_from_entry_form on public.car_entry_forms;
create trigger sync_car_hide_owner_name_from_entry_form
after insert or update of hide_owner_name on public.car_entry_forms
for each row
execute function public.sync_car_hide_owner_name_from_entry_form();

drop trigger if exists sync_car_entry_form_hide_owner_name_from_car_before_insert on public.cars;
create trigger sync_car_entry_form_hide_owner_name_from_car_before_insert
before insert on public.cars
for each row
execute function public.sync_car_entry_form_hide_owner_name_from_car();

drop trigger if exists sync_car_entry_form_hide_owner_name_from_car_after_update on public.cars;
create trigger sync_car_entry_form_hide_owner_name_from_car_after_update
after update of hide_owner_name on public.cars
for each row
execute function public.sync_car_entry_form_hide_owner_name_from_car();
