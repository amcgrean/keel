-- Keel vacations + holiday rules.
--
-- Vacations: a date range assigned to one parent (overrides the base rotation
-- and any holiday rule, but a swap/exception still wins over it).
-- Holiday rules: a recurring month-day range that alternates between parents by
-- even/odd year. (Cross-New-Year ranges must be entered as two rules — the
-- engine keeps holiday matching deliberately simple.)
--
-- Run once via the Supabase SQL editor.

create table if not exists public.vacations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  parent_id uuid not null references public.family_members(id),
  label text,
  start_date date not null,
  end_date date not null,
  created_by uuid references public.family_members(id),
  created_at timestamptz not null default now()
);

create table if not exists public.holiday_rules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  label text not null,
  start_month_day text not null,  -- 'MM-DD'
  end_month_day text not null,    -- 'MM-DD'
  parent_even_years uuid not null references public.family_members(id),
  parent_odd_years uuid not null references public.family_members(id),
  created_at timestamptz not null default now()
);

alter table public.vacations enable row level security;
alter table public.holiday_rules enable row level security;

drop policy if exists "members manage vacations in their family" on public.vacations;
create policy "members manage vacations in their family" on public.vacations
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

drop policy if exists "members manage holiday_rules in their family" on public.holiday_rules;
create policy "members manage holiday_rules in their family" on public.holiday_rules
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
