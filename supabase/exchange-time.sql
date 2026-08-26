-- Configurable exchange (handoff) time per family. Run once via SQL editor.
alter table public.families
  add column if not exists exchange_time time not null default '17:00';

-- Allow members to update their own family's settings (there was only a
-- SELECT policy on families until now).
drop policy if exists "members can update their family" on public.families;
create policy "members can update their family" on public.families
  for update using (public.is_family_member(id))
  with check (public.is_family_member(id));
