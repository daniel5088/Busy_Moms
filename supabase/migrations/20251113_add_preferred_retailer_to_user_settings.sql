-- Add preferred_retailer + updated_at to user_settings if they don't exist yet
alter table public.user_settings
  add column if not exists preferred_retailer text;

alter table public.user_settings
  add column if not exists updated_at timestamptz
  default timezone('utc'::text, now()) not null;
