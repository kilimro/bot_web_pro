create or replace function get_all_users_with_meta()
   returns setof auth.users
   language sql
   security definer
   set search_path = public
   as $$
     select * from auth.users;
   $$;