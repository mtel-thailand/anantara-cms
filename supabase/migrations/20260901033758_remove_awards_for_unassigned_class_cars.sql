create or replace function public.remove_car_awards_when_class_unassigned()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.car_awards
  where car_id = new.id;

  return new;
end;
$$;

revoke execute on function public.remove_car_awards_when_class_unassigned() from public;

drop trigger if exists remove_car_awards_when_class_unassigned on public.cars;

create trigger remove_car_awards_when_class_unassigned
after update of category_id on public.cars
for each row
when (old.category_id is not null and new.category_id is null)
execute function public.remove_car_awards_when_class_unassigned();
