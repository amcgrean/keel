# Keel

A co-parenting calendar built around one question: who has the kid, right now.

Replaces Kidtime for personal use. Architected so it doesn't need a rewrite
if it's ever opened up to other families later — every family-owned row
carries `family_id` and Row Level Security is on from the first migration.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase — Postgres, Auth, RLS, Storage, Realtime
- Vercel — hosting

## What's here so far

- `lib/schedule-engine.ts` — the generic N-day rotation engine with a
  fixed override hierarchy (base → holiday → vacation → exception →
  manual override). No UI or database dependency; pure functions, safe
  to unit test on its own.
- `supabase/schema.sql` — initial schema: families, family_members,
  children, schedule_patterns, schedule_exceptions, swap_requests,
  events, audit_events. RLS policies scoped by family membership.
  Audit log is insert-only via a `security definer` function — nothing
  in the client can edit or delete history.
- `app/page.tsx` — dashboard screen, ported from the design mockup,
  currently running on mock data (`AARON` / `MAKALA` / `TODAY` at the
  top of the file). Swapping in real Supabase queries is the next step.
- `design/keel-mockup.html` — the source-of-truth visual reference.
  Colors, type pairing (Fraunces / Inter / IBM Plex Mono), and the
  handoff-strip pattern are all ported from here into Tailwind tokens.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

To stand up the database, either paste `supabase/schema.sql` into the
Supabase SQL editor, or run it via the Supabase CLI:

```bash
supabase db push
```

The migration files alongside `schema.sql` (e.g. `pending-overnights.sql`)
are incremental changes to apply on top of it — paste each into the SQL
editor once. `pending-overnights.sql` adds the `status` column that powers
logging an overnight before the other parent is on the app: it's recorded
right away but shown as **pending** until they confirm it.

## Roadmap (short version)

Full phase breakdown lives in `docs/product-plan.md`. The only thing
that matters near-term is the MVP checklist — everything else is
backlog, not schedule:

1. Account, family, child creation
2. Choose a rotation (2-2-3 to start), pick the anchor day
3. Dashboard + calendar reading from real Supabase data
4. One full request → accept → calendar-updates round trip
5. Audit log entry on every write

Don't touch messaging, expenses, or reports until the calendar's been
lived with for a few weeks.

## Pushing to GitHub

```bash
git init
git add .
git commit -m "Initial scaffold: schedule engine, schema, dashboard"
gh repo create <your-username>/keel --private --source=. --push
```

(No `gh`? Create the repo at github.com/new first, then:
`git remote add origin <url> && git branch -M main && git push -u origin main`)
