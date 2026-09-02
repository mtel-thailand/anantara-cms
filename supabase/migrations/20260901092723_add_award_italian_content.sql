alter table public.car_awards
  add column if not exists award_label_it text default null;

alter table public.special_awards
  add column if not exists award_label_it text default null,
  add column if not exists award_description_it text default null;
