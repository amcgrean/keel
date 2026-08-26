-- Give family_members a contact email for notifications, and backfill it from
-- each linked auth user. Account-less members (no login) stay null and simply
-- won't receive email. Run once via the Supabase SQL editor.

alter table public.family_members add column if not exists email text;

update public.family_members fm
set email = u.email
from auth.users u
where fm.user_id = u.id and fm.email is null;
