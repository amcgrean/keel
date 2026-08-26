-- Keel web-push subscriptions — one row per device/browser a parent enables
-- notifications on. Run once via the Supabase SQL editor.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "members manage push subs in their family" on public.push_subscriptions;
create policy "members manage push subs in their family" on public.push_subscriptions
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
