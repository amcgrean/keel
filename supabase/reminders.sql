-- Keel reminders — recurring or one-off day-tied notes (daycare drop-off /
-- pick-up, "bring bedding Friday", etc). Weekly reminders fire on the chosen
-- weekdays; one-off reminders fire on a single date. Optional time of day.
--
-- Run once via the Supabase SQL editor.

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  title text not null,
  notes text,
  kind text check (kind in ('dropoff','pickup','bring','note')),
  time_of_day time,
  recurrence text not null default 'weekly' check (recurrence in ('weekly','once')),
  weekdays int[],          -- weekly: 0=Sun .. 6=Sat
  on_date date,            -- once: the single date
  active boolean not null default true,
  created_by uuid references public.family_members(id),
  created_at timestamptz not null default now()
);

alter table public.reminders enable row level security;

drop policy if exists "members manage reminders in their family" on public.reminders;
create policy "members manage reminders in their family" on public.reminders
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
