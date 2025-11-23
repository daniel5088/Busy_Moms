
create table if not exists public.system_logs (
  id bigserial primary key,
  level text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.system_checks (
  id bigserial primary key,
  check_name text not null,
  status text not null,
  details jsonb,
  created_at timestamptz not null default now()
);


alter table public.system_logs   enable row level security;
alter table public.system_checks enable row level security;


drop policy if exists "dev-select-logs"   on public.system_logs;
drop policy if exists "dev-insert-logs"   on public.system_logs;
drop policy if exists "dev-select-checks" on public.system_checks;

create policy "dev-select-logs"
  on public.system_logs for select
  using (public.is_developer());

create policy "dev-insert-logs"
  on public.system_logs for insert
  with check (public.is_developer());

create policy "dev-select-checks"
  on public.system_checks for select
  using (public.is_developer());
