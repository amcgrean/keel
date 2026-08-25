import Link from "next/link";
import { redirect } from "next/navigation";
import { getScheduleData, memberMaps } from "@/lib/schedule-data";
import { resolveRange } from "@/lib/schedule-engine";
import { signout } from "../login/actions";
import { TopNav } from "../top-nav";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function ymOf(year: number, monthIndex0: number) {
  return `${year}-${pad2(monthIndex0 + 1)}`;
}
function addMonth(year: number, monthIndex0: number, delta: number) {
  const total = year * 12 + monthIndex0 + delta;
  return { year: Math.floor(total / 12), monthIndex0: ((total % 12) + 12) % 12 };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const data = await getScheduleData();
  if (data.state === "no-auth") redirect("/login");

  const { month } = await searchParams;

  // Determine which month to show (default: current month, UTC).
  const now = new Date();
  let year = now.getUTCFullYear();
  let monthIndex0 = now.getUTCMonth();
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, mo] = month.split("-").map(Number);
    year = y;
    monthIndex0 = mo - 1;
  }

  const monthLabel = new Date(Date.UTC(year, monthIndex0, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const prev = addMonth(year, monthIndex0, -1);
  const next = addMonth(year, monthIndex0, 1);
  const todayIso = now.toISOString().slice(0, 10);

  const header = (
    <div className="flex items-baseline justify-between mb-5">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-xl font-semibold">Keel</h1>
        <TopNav />
      </div>
      <form action={signout}>
        <button className="font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-ink">
          Sign out
        </button>
      </form>
    </div>
  );

  if (data.state === "no-family" || data.state === "no-pattern") {
    return (
      <main className="mx-auto max-w-md px-5 pt-8 pb-24">
        {header}
        <section className="rounded-card border border-line bg-card shadow-sm p-6">
          <h2 className="font-display text-lg mb-1">Nothing to show yet</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            {data.state === "no-family"
              ? "Your account isn't linked to a family yet."
              : "This family has no active schedule pattern yet."}
          </p>
        </section>
      </main>
    );
  }

  const { members, inputs } = data;
  const { labelFor, colorFor } = memberMaps(members);

  // Build the visible grid: pad from the first weekday, fill whole weeks.
  const firstOfMonth = new Date(Date.UTC(year, monthIndex0, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const firstVisible = new Date(firstOfMonth);
  firstVisible.setUTCDate(firstVisible.getUTCDate() - startWeekday);
  const firstVisibleIso = firstVisible.toISOString().slice(0, 10);

  const cells = resolveRange(inputs, firstVisibleIso, totalCells).map((d) => ({
    ...d,
    inMonth: Number(d.date.slice(5, 7)) === monthIndex0 + 1,
    day: Number(d.date.slice(8, 10)),
    isToday: d.date === todayIso,
  }));

  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-24">
      {header}

      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <Link
          href={`/calendar?month=${ymOf(prev.year, prev.monthIndex0)}`}
          className="font-mono text-sm text-ink-faint hover:text-ink px-2 py-1"
          aria-label="Previous month"
        >
          ‹
        </Link>
        <div className="font-display text-lg">{monthLabel}</div>
        <Link
          href={`/calendar?month=${ymOf(next.year, next.monthIndex0)}`}
          className="font-mono text-sm text-ink-faint hover:text-ink px-2 py-1"
          aria-label="Next month"
        >
          ›
        </Link>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center font-mono text-[10px] text-ink-faint">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => (
          <Link
            key={c.date}
            href={`/?swap=${c.date}`}
            title={`${c.date} — ${labelFor(c.parentId)}${c.source === "exception" ? " (swapped)" : ""}`}
            className={`aspect-square rounded-sm flex flex-col items-center justify-center text-white ${colorFor(
              c.parentId
            )} ${c.source === "exception" ? "bg-stripes" : ""} ${
              c.inMonth ? "" : "opacity-35"
            } ${c.isToday ? "ring-2 ring-inset ring-white" : ""}`}
          >
            <span className="font-mono text-[11px] leading-none">{c.day}</span>
            <span className="text-[8px] leading-none mt-0.5 opacity-85">
              {labelFor(c.parentId)[0]}
            </span>
          </Link>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4">
        {members.map((mm) => (
          <div key={mm.id} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-sm ${colorFor(mm.id)}`} />
            <span className="text-[12px] text-ink-soft">{mm.display_name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-stripes bg-parentA" />
          <span className="text-[12px] text-ink-soft">swapped</span>
        </div>
      </div>

      <p className="font-mono text-[10px] text-ink-faint mt-4">
        Tap any day to request a swap for it.
      </p>
    </main>
  );
}
