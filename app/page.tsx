import Link from "next/link";
import { redirect } from "next/navigation";
import { getScheduleData, memberMaps } from "@/lib/schedule-data";
import { resolveRange, findExchanges } from "@/lib/schedule-engine";
import { signout } from "./login/actions";
import { respondToSwapRequest } from "./actions";
import { RequestSwapForm, type DayOption } from "./request-swap-form";
import { TopNav } from "./top-nav";
import { remindersOn, kindEmoji, formatTime } from "@/lib/reminders";
import { eventsOn, categoryEmoji, eventTime } from "@/lib/events";

export const dynamic = "force-dynamic";

type ProposedChange = {
  date: string;
  from_parent_id: string | null;
  to_parent_id: string;
  note?: string;
};
type SwapRow = {
  id: string;
  requested_by: string;
  proposed_changes: ProposedChange[];
  created_at: string;
};

function fmt(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", opts);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ swap?: string }>;
}) {
  const data = await getScheduleData();
  if (data.state === "no-auth") redirect("/login");
  if (data.state === "no-family") {
    return (
      <EmptyState
        title="No family yet"
        body="Your account isn't linked to a family. Seed a family, members, and a schedule pattern, then reload."
      />
    );
  }
  if (data.state === "no-pattern") {
    return (
      <EmptyState
        title="No active rotation"
        body="This family has no active schedule pattern yet. Create one (e.g. 2-2-3 with an anchor date), then reload."
        onSignout
      />
    );
  }

  const { supabase, familyId, meMemberId, members, inputs, reminders, events } = data;
  const { labelFor, colorFor } = memberMaps(members);
  const { swap: swapParam } = await searchParams;

  const { data: swapsData } = await supabase
    .from("swap_requests")
    .select("id, requested_by, proposed_changes, created_at")
    .eq("family_id", familyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const swaps = (swapsData ?? []) as SwapRow[];

  const TODAY = new Date().toISOString().slice(0, 10);
  const days = resolveRange(inputs, TODAY, 14);
  const exchanges = findExchanges(days);
  const today = days[0];
  const nextExchange = exchanges[0];

  // Reminders + events over the next 7 days, only days that have something.
  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(TODAY + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const items = [
      ...remindersOn(reminders, iso).map((r) => ({
        key: `r-${r.id}`,
        emoji: kindEmoji(r.kind),
        title: r.title,
        time: r.time_of_day ? formatTime(r.time_of_day) : "",
      })),
      ...eventsOn(events, iso).map((e) => ({
        key: `e-${e.id}`,
        emoji: categoryEmoji(e.category),
        title: e.title,
        time: eventTime(e),
      })),
    ];
    return { iso, i, items };
  }).filter((x) => x.items.length > 0);

  const swapOptions: DayOption[] = resolveRange(inputs, TODAY, 60).map((d) => ({
    date: d.date,
    label: fmt(d.date, { weekday: "short", month: "short", day: "numeric" }),
    currentParentId: d.parentId,
  }));

  const incoming = swaps.filter((s) => s.requested_by !== meMemberId);
  const outgoing = swaps.filter((s) => s.requested_by === meMemberId);

  const describeChanges = (changes: ProposedChange[]) =>
    changes
      .map(
        (c) =>
          `${labelFor(c.to_parent_id)} takes Patrick ${fmt(c.date, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}`
      )
      .join("; ");

  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-24">
      <div className="flex items-baseline justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-xl font-semibold">Keel</h1>
          <TopNav />
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-ink-faint">
            {fmt(TODAY, { weekday: "short", month: "short", day: "numeric" })}
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
                {fmt(nextExchange.date, { weekday: "short", month: "short", day: "numeric" })}{" "}
                · 5:00 PM
              </div>
            </div>
            <div className="text-sm">
              {labelFor(nextExchange.from)} → {labelFor(nextExchange.to)}
            </div>
          </div>
        )}
      </section>

      {/* Reminders + events — next 7 days */}
      {upcomingDays.length > 0 && (
        <section className="mb-6">
          <h3 className="font-display text-base mb-2">Coming up</h3>
          <div className="flex flex-col gap-2">
            {upcomingDays.map((rd) => (
              <Link
                key={rd.iso}
                href={`/day/${rd.iso}`}
                className="block rounded-sm border border-line bg-card px-3.5 py-2.5 hover:border-ink-faint"
              >
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint mb-1.5">
                  {rd.i === 0
                    ? "Today"
                    : rd.i === 1
                      ? "Tomorrow"
                      : fmt(rd.iso, { weekday: "long", month: "short", day: "numeric" })}
                </div>
                <div className="flex flex-col gap-1.5">
                  {rd.items.map((it) => (
                    <div key={it.key} className="flex items-center gap-2 text-sm">
                      <span className="leading-none">{it.emoji}</span>
                      <span className="font-medium">{it.title}</span>
                      {it.time && (
                        <span className="text-ink-faint text-[12px] font-mono">
                          {it.time}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Incoming swap requests — need a response */}
      {incoming.length > 0 && (
        <section className="mb-6">
          <h3 className="font-display text-base mb-2">Needs your response</h3>
          <div className="flex flex-col gap-2">
            {incoming.map((s) => (
              <div
                key={s.id}
                className="rounded-card border border-beacon/40 bg-beacon-soft/30 p-3.5"
              >
                <div className="text-sm mb-1">
                  <span className="font-semibold">{labelFor(s.requested_by)}</span>{" "}
                  requested: {describeChanges(s.proposed_changes)}
                </div>
                {s.proposed_changes[0]?.note && (
                  <div className="text-[11.5px] text-ink-soft mb-2">
                    “{s.proposed_changes[0].note}”
                  </div>
                )}
                <form className="flex gap-2 mt-2">
                  <input type="hidden" name="request_id" value={s.id} />
                  <button
                    formAction={respondToSwapRequest}
                    name="decision"
                    value="accept"
                    className="flex-1 rounded-sm bg-ink text-white font-display text-sm py-2 hover:opacity-90"
                  >
                    Accept
                  </button>
                  <button
                    formAction={respondToSwapRequest}
                    name="decision"
                    value="decline"
                    className="flex-1 rounded-sm border border-line bg-card text-sm py-2 hover:border-ink-faint"
                  >
                    Decline
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Request a swap */}
      <section className="mb-6">
        <RequestSwapForm
          options={swapOptions}
          members={members.map((mm) => ({ id: mm.id, label: mm.display_name }))}
          initialDate={swapParam}
          initialOpen={Boolean(swapParam)}
        />

        {outgoing.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {outgoing.map((s) => (
              <div
                key={s.id}
                className="rounded-sm border border-line bg-paper px-3.5 py-2.5 text-[12.5px] text-ink-soft flex items-center justify-between gap-3"
              >
                <span>You requested: {describeChanges(s.proposed_changes)}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-beacon">
                  pending
                </span>
              </div>
            ))}
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
              title={`${d.date} — ${labelFor(d.parentId)}${d.source === "exception" ? " (swapped)" : ""}`}
            >
              <span className="font-mono text-[10px] text-white/85">
                {new Date(d.date + "T00:00:00Z").getUTCDate()}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1.5 font-mono text-[10px] text-ink-faint">
          Striped days are swapped from the base rotation.
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
                {fmt(ex.date, { month: "short", day: "numeric" })}
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
        <div className="flex items-center gap-3">
          <h1 className="font-display text-xl font-semibold">Keel</h1>
          <TopNav />
        </div>
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
