-- 1. Create the account in Supabase > Authentication > Users first.
-- 2. Replace the email and run this in Supabase SQL Editor.
-- 3. Use 'staff' instead of 'admin' for a regular employee.
do $$
declare
 member_email text := 'REPLACE_WITH_YOUR_ADMIN_EMAIL';
 member_role text := 'admin';
 member_id uuid;
begin
 select id into member_id from auth.users where lower(email)=lower(member_email);
 if member_id is null then raise exception 'Create the Auth user first, and enter its exact email in this script.'; end if;
 insert into public.app_members(user_id,role,active)
 values(member_id,member_role,true)
 on conflict(user_id) do update set role=excluded.role,active=true;
end $$;
