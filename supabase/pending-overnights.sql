-- Keel — pending overnights.
--
-- Lets a parent log an overnight they covered (a deviation from the base
-- rotation) *before* the other parent is on the app to agree to it. The row
-- is recorded immediately but marked `pending`, so it shows as provisional
-- everywhere until the other parent confirms (or disputes) it.
--
-- A `schedule_exception` with status = 'pending' is a self-logged, not-yet-
-- agreed change; status = 'confirmed' is an agreed one (an accepted swap, or
-- a pending overnight the other parent later confirmed). Existing rows and
-- accepted swaps default to 'confirmed' so history is unaffected.
--
-- Safe to re-run.

alter table public.schedule_exceptions
  add column if not exists status text not null default 'confirmed'
    check (status in ('pending', 'confirmed'));

-- Any exception written before this migration was an accepted swap, i.e.
-- already agreed — keep it confirmed (the default handles new rows; this is
-- just belt-and-suspenders for a partially-applied run).
update public.schedule_exceptions set status = 'confirmed' where status is null;
