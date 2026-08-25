-- Keel seed — one family, its members, the child, and an active 2-2-3
-- rotation, linked to your existing auth user.
--
-- BEFORE RUNNING:
--   1. Create your login:  Supabase Dashboard → Authentication → Add user
--      Use "Auto Confirm User" so you can sign in immediately.
--   2. Put that same email in v_login_email below (line marked <-- ).
--
-- Safe to re-run: it no-ops if you already belong to a family.

-- A co-parent who doesn't use the app can exist without a login.
alter table public.family_members alter column user_id drop not null;

do $$
declare
  v_login_email text := 'CHANGE_ME@example.com';  -- <-- your Add-user email
  v_uid    uuid;
  v_family uuid;
  v_aaron  uuid;
  v_makala uuid;
begin
  select id into v_uid from auth.users where email = v_login_email;
  if v_uid is null then
    raise exception
      'No auth user with email %. Create it in Authentication → Add user first.',
      v_login_email;
  end if;

  if exists (select 1 from public.family_members where user_id = v_uid) then
    raise notice 'User already belongs to a family; nothing to seed.';
    return;
  end if;

  insert into public.families (name)
    values ('Our family') returning id into v_family;

  insert into public.family_members (family_id, user_id, display_name, color)
    values (v_family, v_uid, 'Aaron', '#45607A') returning id into v_aaron;

  insert into public.family_members (family_id, user_id, display_name, color)
    values (v_family, null, 'Makala', '#7C8F5A') returning id into v_makala;

  insert into public.children (family_id, first_name)
    values (v_family, 'Patrick');

  -- 2-2-3 rotation as an ordered array of member ids, anchored to today.
  -- Order matches PRESET_ROTATIONS["2-2-3"] in lib/schedule-engine.ts.
  insert into public.schedule_patterns (family_id, label, cycle, anchor_date, active)
    values (
      v_family, '2-2-3',
      to_jsonb(array[
        v_aaron, v_aaron, v_makala, v_makala, v_aaron, v_aaron, v_aaron,
        v_makala, v_makala, v_aaron, v_aaron, v_makala, v_makala, v_makala
      ]::uuid[]),
      current_date, true
    );

  raise notice 'Seeded family % for %', v_family, v_login_email;
end $$;
