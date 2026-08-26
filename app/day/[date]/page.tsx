import Link from "next/link";
import { redirect } from "next/navigation";
import { getScheduleData, memberMaps } from "@/lib/schedule-data";
import { resolveDay } from "@/lib/schedule-engine";
import { remindersOn, kindEmoji, formatTime, describeReminder } from "@/lib/reminders";
import { eventsOn, categoryEmoji, eventTime, CATEGORY_META } from "@/lib/events";
import { signout } from "../../login/actions";
import { TopNav } from "../../top-nav";
import { EventForm } from "./event-form";
import { deleteEvent } from "../actions";

export const dynamic = "force-dynamic";

const SOURCE_NOTE: Record<string, string> = {
  base: "Base rotation",
  holiday: "Holiday rule",
  vacation: "Vacation",
  exception: "Swapped",
  override: "Manual override",
};

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) redirect("/calendar");

  const data = await getScheduleData();
  if (data.state === "no-auth") redirect("/login");

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

  const prettyDate = new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  if (data.state === "no-family" || data.state === "no-pattern") {
    return (
      <main className="mx-auto max-w-md px-5 pt-8 pb-24">
        {header}
        <div className="font-display text-lg mb-2">{prettyDate}</div>
        <p className="text-sm text-ink-soft">
          Set up your family and rotation to see this day.
        </p>
      </main>
    );
  }

  const { members, inputs, reminders, events } = data;
  const { labelFor, dayClass } = memberMaps(members);

  const resolved = resolveDay(inputs, date);
  const dayReminders = remindersOn(reminders, date);
  const dayEvents = eventsOn(events, date);
  const isToday = date === new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-24">
      {header}

      <div className="flex items-center justify-between mb-4">
        <Link
          href="/calendar"
          className="font-mono text-[11px] text-ink-faint hover:text-ink"
        >
          ‹ Calendar
        </Link>
        {isToday && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-beacon">
            Today
          </span>
        )}
      </div>

      <h2 className="font-display text-2xl mb-4">{prettyDate}</h2>

      {/* Who has Patrick */}
      <section className="rounded-card border border-line bg-card shadow-sm p-5 mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-full flex items-center justify-center text-white font-display text-lg ${dayClass(resolved.parentId, resolved.source)}`}
          >
            {labelFor(resolved.parentId)[0]}
          </div>
          <div>
            <div className="font-display text-xl">With {labelFor(resolved.parentId)}</div>
            <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
              {SOURCE_NOTE[resolved.source] ?? resolved.source}
              {resolved.source !== "base" &&
                ` · base was ${labelFor(resolved.basedOn)}`}
            </div>
          </div>
        </div>
        <Link
          href={`/?swap=${date}`}
          className="mt-4 block text-center rounded-sm border border-line bg-paper text-sm py-2 hover:border-ink-faint"
        >
          Request a swap for this day
        </Link>
      </section>

      {/* Reminders */}
      {dayReminders.length > 0 && (
        <section className="mb-6">
          <h3 className="font-display text-base mb-2">Reminders</h3>
          <div className="flex flex-col gap-2">
            {dayReminders.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-sm border border-line bg-card px-3.5 py-2.5"
              >
                <span className="text-lg leading-none">{kindEmoji(r.kind)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{r.title}</div>
                  <div className="text-[11.5px] text-ink-faint">
                    {r.time_of_day ? formatTime(r.time_of_day) : describeReminder(r)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Events */}
      <section className="mb-6">
        <h3 className="font-display text-base mb-2">Events</h3>
        <div className="flex flex-col gap-2 mb-3">
          {dayEvents.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing scheduled.</p>
          ) : (
            dayEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-start gap-3 rounded-sm border border-line bg-card px-3.5 py-2.5"
              >
                <span className="text-lg leading-none mt-0.5">
                  {categoryEmoji(e.category)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{e.title}</div>
                  <div className="text-[11.5px] text-ink-faint">
                    {[
                      e.category ? CATEGORY_META[e.category]?.label : null,
                      eventTime(e) || null,
                      e.location,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {e.notes && (
                    <div className="text-[11.5px] text-ink-soft mt-0.5">{e.notes}</div>
                  )}
                </div>
                <form action={deleteEvent}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="date" value={date} />
                  <button className="font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-danger">
                    Delete
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
        <EventForm date={date} />
      </section>
    </main>
  );
}
