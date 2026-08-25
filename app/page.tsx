import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  resolveRange,
  findExchanges,
  type ScheduleInputs,
  type ParentId,
} from "@/lib/schedule-engine";
import { signout } from "./login/actions";

export const dynamic = "force-dynamic";

type MemberRow = { id: string; display_name: string; color: string | null };
type PatternRow = { id: string; label: string; cycle: ParentId[]; anchor_date: string };
type ExceptionRow = { id: string; date: string; parent_id: string; reason: string | null };

const PARENT_COLOR_CLASS = ["bg-parentA", "bg-parentB"] as const;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Which family does this user belong to? (One family for now.)
  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <EmptyState
        title="No family yet"
        body="Your account isn't linked to a family. Seed a family, members, and a schedule pattern, then reload."
      />
    );
  }

  const familyId = membership.family_id as string;

  const [membersRes, patternRes, exceptionsRes] = await Promise.all([
    supabase
      .from("family_members")
      .select("id, display_name, color")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true }),
    supabase
      .from("schedule_patterns")
      .select("id, label, cycle, anchor_date")
      .eq("family_id", familyId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("schedule_exceptions")
      .select("id, date, parent_id, reason")
      .eq("family_id", familyId),
  ]);

  const members = (membersRes.data ?? []) as MemberRow[];
  const pattern = patternRes.data as PatternRow | null;
  const exceptions = (exceptionsRes.data ?? []) as ExceptionRow[];

  if (!pattern) {
    return (
      <EmptyState
        title="No active rotation"
        body="This family has no active schedule pattern yet. Create one (e.g. 2-2-3 with an anchor date), then reload."
        onSignout
      />
    );
  }

  // Map family_member id → display label + calendar color slot.
  const PARENT_LABEL: Record<string, string> = Object.fromEntries(
    members.map((m) => [m.id, m.display_name])
  );
  const PARENT_COLOR: Record<string, string> = Object.fromEntries(
    members.map((m, i) => [m.id, PARENT_COLOR_CLASS[i] ?? "bg-parentA"])
  );
  const labelFor = (id: string) => PARENT_LABEL[id] ?? "?";
  const colorFor = (id: string) => PARENT_COLOR[id] ?? "bg-parentA";

  const inputs: ScheduleInputs = {
    pattern: { cycle: pattern.cycle, anchorDate: pattern.anchor_date },
    exceptions: exceptions.map((e) => ({
      id: e.id,
      date: e.date,
      parentId: e.parent_id,
      reason: e.reason ?? undefined,
    })),
  };

  const TODAY = new Date().toISOString().slice(0, 10);
  const days = resolveRange(inputs, TODAY, 14);
  const exchanges = findExchanges(days);
  const today = days[0];
  const nextExchange = exchanges[0];

  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-24">
      <div className="flex items-baseline justify-between mb-5">
        <h1 className="font-display text-xl font-semibold">Keel</h1>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-ink-faint">
            {new Date(TODAY + "T00:00:00Z").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          <form action={signout}>
            <button className="font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Hero status card */}
      <section className="rounded-card border border-line bg-card shadow-sm p-5 mb-6">
        <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint mb-2">
          Right now
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`h-11 w-11 rounded-full flex items-center justify-center text-white font-display text-lg ${colorFor(today.parentId)}`}
          >
            {labelFor(today.parentId)[0]}
          </div>
          <div>
            <div className="font-display text-xl">
              With {labelFor(today.parentId)} tonight
            </div>
          </div>
        </div>

        {nextExchange && (
          <div className="flex items-center justify-between bg-paper rounded-sm px-3.5 py-3">
            <div>
              <div className="text-[11px] uppercase text-ink-faint mb-0.5">
                Next exchange
              </div>
              <div className="font-mono text-sm font-medium">
                {new Date(nextExchange.date + "T00:00:00Z").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                · 5:00 PM
              </div>
            </div>
            <div className="text-sm">
              {labelFor(nextExchange.from)} → {labelFor(nextExchange.to)}
            </div>
          </div>
        )}
      </section>

      {/* Handoff strip */}
      <section className="mb-6">
        <h3 className="font-display text-base mb-2">Next 14 days</h3>
        <div className="flex gap-[3px] h-14 rounded-xl overflow-hidden ring-1 ring-line">
          {days.map((d, i) => (
            <div
              key={d.date}
              className={`flex-1 relative flex items-end justify-center pb-1 ${colorFor(d.parentId)} ${
                d.source === "exception" ? "bg-stripes" : ""
              } ${i === 0 ? "ring-2 ring-inset ring-white" : ""}`}
              title={`${d.date} — ${labelFor(d.parentId)}${d.source === "exception" ? " (schedule change)" : ""}`}
            >
              <span className="font-mono text-[10px] text-white/85">
                {new Date(d.date + "T00:00:00Z").getUTCDate()}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming exchanges */}
      <section>
        <h3 className="font-display text-base mb-2">Upcoming</h3>
        <div className="flex flex-col gap-2">
          {exchanges.slice(0, 5).map((ex) => (
            <div
              key={ex.date}
              className="flex items-center gap-3 rounded-sm border border-line bg-card px-3.5 py-2.5"
            >
              <div className="w-1 self-stretch rounded bg-beacon" />
              <div className="flex-1">
                <div className="text-sm font-semibold">
                  Exchange · {labelFor(ex.from)} → {labelFor(ex.to)}
                </div>
                <div className="text-[11.5px] text-ink-faint">5:00 PM</div>
              </div>
              <div className="font-mono text-[10px] bg-paper px-2 py-1 rounded">
                {new Date(ex.date + "T00:00:00Z").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function EmptyState({
  title,
  body,
  onSignout = false,
}: {
  title: string;
  body: string;
  onSignout?: boolean;
}) {
  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-24">
      <div className="flex items-baseline justify-between mb-5">
        <h1 className="font-display text-xl font-semibold">Keel</h1>
        {onSignout && (
          <form action={signout}>
            <button className="font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-ink">
              Sign out
            </button>
          </form>
        )}
      </div>
      <section className="rounded-card border border-line bg-card shadow-sm p-6">
        <h2 className="font-display text-lg mb-1">{title}</h2>
        <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
      </section>
    </main>
  );
}
