do $migration$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'car_submission_vehicles'
  ) then
    alter publication supabase_realtime
      add table public.car_submission_vehicles;
  end if;
end;
$migration$;
