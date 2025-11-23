
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  new_role text := 'user';
begin
  
  if new.email ilike '%@bmaapp.com' then
    new_role := 'developer';
  end if;

  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                              || jsonb_build_object('role', new_role)
   where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                           || jsonb_build_object(
                                'role',
                                case
                                  when email ilike '%@bmaapp.com' then 'developer'
                                  else 'user'
                                end
                              )
 where coalesce(raw_app_meta_data->>'role','') = '';
