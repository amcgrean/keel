-- Keel initial schema
-- Every family-owned table carries family_id and has RLS enabled from day one.
-- Run via: supabase db push, or paste into the SQL editor.

create extension if not exists "pgcrypto";

-- ---------- Core identity ----------

create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  color text, -- hex, used for calendar rendering (parentA/parentB tokens)
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  first_name text not null,
  date_of_birth date,
  created_at timestamptz not null default now()
);

-- ---------- Schedule engine ----------

create table schedule_patterns (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  label text not null, -- e.g. "2-2-3"
  cycle jsonb not null, -- ordered array of family_member ids
  anchor_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  date date not null,
  parent_id uuid not null references family_members(id),
  reason text,
  requested_by uuid references family_members(id),
  approved_by uuid references family_members(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (family_id, date)
);

create table swap_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  requested_by uuid not null references family_members(id),
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  -- each element: { date, from_parent_id, to_parent_id }
  proposed_changes jsonb not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------- Events ----------

create table events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid references children(id),
  title text not null,
  category text, -- medical, school, activity, birthday, other
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  created_by uuid references family_members(id),
  created_at timestamptz not null default now()
);

-- ---------- Audit log (Phase 12 — immutable by policy, not by trigger yet) ----------

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  actor_id uuid references family_members(id),
  action text not null, -- e.g. 'schedule_change_accepted'
  object_type text not null,
  object_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------

alter table families enable row level security;
alter table family_members enable row level security;
alter table children enable row level security;
alter table schedule_patterns enable row level security;
alter table schedule_exceptions enable row level security;
alter table swap_requests enable row level security;
alter table events enable row level security;
alter table audit_events enable row level security;

-- Helper: is the current user a member of this family?
create or replace function is_family_member(fam_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from family_members
    where family_id = fam_id and user_id = auth.uid()
  );
$$;

create policy "members can read their family" on families
  for select using (is_family_member(id));

create policy "members can read family_members rows in their family" on family_members
  for select using (is_family_member(family_id));

create policy "members can read children in their family" on children
  for select using (is_family_member(family_id));

create policy "members can manage schedule_patterns in their family" on schedule_patterns
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can manage schedule_exceptions in their family" on schedule_exceptions
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can manage swap_requests in their family" on swap_requests
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "members can manage events in their family" on events
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

-- Audit log: readable by family members, but never updatable/deletable
-- from the client — only inserted via a security-definer function so the
-- history can't be quietly rewritten.
create policy "members can read audit_events in their family" on audit_events
  for select using (is_family_member(family_id));

create or replace function log_audit_event(
  p_family_id uuid,
  p_action text,
  p_object_type text,
  p_object_id uuid,
  p_old_value jsonb,
  p_new_value jsonb
) returns void
language plpgsql
security definer
as $$
begin
  insert into audit_events (family_id, actor_id, action, object_type, object_id, old_value, new_value)
  values (
    p_family_id,
    (select id from family_members where family_id = p_family_id and user_id = auth.uid()),
    p_action, p_object_type, p_object_id, p_old_value, p_new_value
  );
end;
$$;
