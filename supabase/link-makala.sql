-- Give Makala her own login.
--
-- BEFORE RUNNING:
--   1. Create her account:  Supabase Dashboard → Authentication → Add user
--      Use "Auto Confirm User" so she can sign in immediately.
--   2. Put that email in v_makala_email below.
--
-- This links the existing (account-less) "Makala" family_member row to her new
-- auth user, so RLS recognizes her and she can accept/decline swaps.

do $$
declare
  v_makala_email text := 'CHANGE_ME@example.com';  -- <-- Makala's Add-user email
  v_uid uuid;
  v_member uuid;
begin
  select id into v_uid from auth.users where email = v_makala_email;
  if v_uid is null then
    raise exception
      'No auth user with email %. Create it in Authentication → Add user first.',
      v_makala_email;
  end if;

  select id into v_member
  from public.family_members
  where display_name = 'Makala' and user_id is null
  limit 1;

  if v_member is null then
    raise notice 'No account-less Makala row found (maybe already linked). Nothing to do.';
    return;
  end if;

  update public.family_members set user_id = v_uid where id = v_member;
  raise notice 'Linked Makala (member %) to auth user %', v_member, v_makala_email;
end $$;
