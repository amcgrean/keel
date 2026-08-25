import {
  resolveRange,
  findExchanges,
  PRESET_ROTATIONS,
  type ScheduleInputs,
} from "@/lib/schedule-engine";

// ---- TEMPORARY mock data ----------------------------------------------
// Replace with a Supabase query once `families` / `schedule_patterns` /
// `schedule_exceptions` have real rows. Shape matches the schema in
// supabase/schema.sql so swapping this out is mechanical.
const AARON = "aaron";
const MAKALA = "makala";
const TODAY = "2026-08-24";

const inputs: ScheduleInputs = {
  pattern: {
    cycle: PRESET_ROTATIONS["2-2-3"](AARON, MAKALA),
    anchorDate: TODAY,
  },
  exceptions: [
    { id: "e1", date: "2026-08-29", parentId: MAKALA, reason: "birthday party swap" },
    { id: "e2", date: "2026-08-30", parentId: MAKALA, reason: "birthday party swap" },
  ],
};

const PARENT_LABEL: Record<string, string> = { [AARON]: "Aaron", [MAKALA]: "Makala" };
const PARENT_COLOR: Record<string, string> = { [AARON]: "bg-parentA", [MAKALA]: "bg-parentB" };
// -------------------------------------------------------------------------

export default function DashboardPage() {
  const days = resolveRange(inputs, TODAY, 14);
  const exchanges = findExchanges(days);
  const today = days[0];
  const nextExchange = exchanges[0];

  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-24">
      <div className="flex items-baseline justify-between mb-5">
        <h1 className="font-display text-xl font-semibold">Keel</h1>
        <span className="font-mono text-[11px] text-ink-faint">
          {new Date(TODAY + "T00:00:00Z").toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Hero status card */}
      <section className="rounded-card border border-line bg-card shadow-sm p-5 mb-6">
        <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint mb-2">
          Right now
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`h-11 w-11 rounded-full flex items-center justify-center text-white font-display text-lg ${PARENT_COLOR[today.parentId]}`}
          >
            {PARENT_LABEL[today.parentId][0]}
          </div>
          <div>
            <div className="font-display text-xl">With {PARENT_LABEL[today.parentId]} tonight</div>
          </div>
        </div>

        {nextExchange && (
          <div className="flex items-center justify-between bg-paper rounded-sm px-3.5 py-3">
            <div>
              <div className="text-[11px] uppercase text-ink-faint mb-0.5">Next exchange</div>
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
              {PARENT_LABEL[nextExchange.from]} → {PARENT_LABEL[nextExchange.to]}
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
              className={`flex-1 relative flex items-end justify-center pb-1 ${PARENT_COLOR[d.parentId]} ${
                d.source === "exception" ? "bg-stripes" : ""
              } ${i === 0 ? "ring-2 ring-inset ring-white" : ""}`}
              title={`${d.date} — ${PARENT_LABEL[d.parentId]}${d.source === "exception" ? " (schedule change)" : ""}`}
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
                  Exchange · {PARENT_LABEL[ex.from]} → {PARENT_LABEL[ex.to]}
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
