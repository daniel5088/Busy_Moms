-- Test DB round-trip: backs "Test Supabase Connection"
create or replace function public.admin_test_supabase_connection()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_developer() then
    raise exception 'Forbidden: developer role required' using errcode = '42501';
  end if;

  perform 1; -- DB ping
  return jsonb_build_object(
    'ok', true,
    'message', 'DB reachable',
    'server_time', now()
  );
end;
$$;

-- Echo auth context: backs "Test Authentication"
create or replace function public.admin_test_auth()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  j jsonb := public.jwt();
begin
  if not public.is_developer() then
    raise exception 'Forbidden: developer role required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'ok', true,
    'user_id', j->>'sub',
    'email',   j->>'email',
    'role',    j->>'role',
    'iat',     j->>'iat'
  );
end;
$$;


create or replace function public.admin_test_google_calendar()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_developer() then
    raise exception 'Forbidden: developer role required' using errcode = '42501';
  end if;

  
  return jsonb_build_object(
    'ok', true,
    'message', 'Calendar check stub (replace with real ping)'
  );
end;
$$;


create or replace function public.admin_settings_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_developer() then
    raise exception 'Forbidden: developer role required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'server_time', now(),
    'db',       jsonb_build_object('status','ok'),
    'auth',     jsonb_build_object('status','ok'),
    'calendar', jsonb_build_object('status','stub')
  );
end;
$$;
