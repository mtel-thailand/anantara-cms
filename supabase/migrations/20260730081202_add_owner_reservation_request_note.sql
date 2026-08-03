alter table public.owner_reservations
  add column request_note jsonb not null default '[]'::jsonb;

comment on column public.owner_reservations.request_note is
  'Request-information history for the owner reservation.';
