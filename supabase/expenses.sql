-- Keel shared expenses — log a cost, the coparent approves/refuses, then it's
-- settled. Run once via the Supabase SQL editor.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid references public.family_members(id),
  title text not null,
  amount numeric(10,2) not null check (amount >= 0),
  category text,
  incurred_on date not null default current_date,
  paid_by uuid not null references public.family_members(id),
  owed_by uuid not null references public.family_members(id),
  owed_amount numeric(10,2) not null check (owed_amount >= 0),
  status text not null default 'pending'
    check (status in ('pending','approved','refused','settled')),
  notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.expenses enable row level security;

drop policy if exists "members manage expenses in their family" on public.expenses;
create policy "members manage expenses in their family" on public.expenses
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
