
create or replace function public.jwt() returns jsonb
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;


create or replace function public.is_developer() returns boolean
language sql stable as $$
  select (public.jwt()->>'role') = 'developer';
$$;
