export type ReminderRow = {
  id: string;
  title: string;
  notes: string | null;
  kind: "dropoff" | "pickup" | "bring" | "note" | null;
  time_of_day: string | null; // "HH:MM:SS" from Postgres
  recurrence: "weekly" | "once";
  weekdays: number[] | null; // 0=Sun..6=Sat
  on_date: string | null; // ISO date
};

export const KIND_META: Record<string, { emoji: string; label: string }> = {
  dropoff: { emoji: "🎒", label: "Drop-off" },
  pickup: { emoji: "🏡", label: "Pick-up" },
  bring: { emoji: "🧺", label: "Bring" },
  note: { emoji: "🔔", label: "Reminder" },
};

export function kindEmoji(kind: string | null): string {
  return (kind && KIND_META[kind]?.emoji) || "🔔";
}

/** Reminders that fire on a given ISO date. */
export function remindersOn(reminders: ReminderRow[], dateIso: string): ReminderRow[] {
  const weekday = new Date(dateIso + "T00:00:00Z").getUTCDay();
  const hit = reminders.filter((r) =>
    r.recurrence === "weekly"
      ? (r.weekdays ?? []).includes(weekday)
      : r.on_date === dateIso
  );
  // Sort by time of day (untimed last).
  return hit.sort((a, b) => (a.time_of_day ?? "99").localeCompare(b.time_of_day ?? "99"));
}

export function formatTime(t: string | null): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr);
  const m = mStr ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Human summary of when a reminder fires, e.g. "Weekly · Mon, Wed · 8:00 AM". */
export function describeReminder(r: ReminderRow): string {
  const time = r.time_of_day ? ` · ${formatTime(r.time_of_day)}` : "";
  if (r.recurrence === "once") {
    const when = r.on_date
      ? new Date(r.on_date + "T00:00:00Z").toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })
      : "unscheduled";
    return `Once · ${when}${time}`;
  }
  const days = (r.weekdays ?? [])
    .slice()
    .sort((a, b) => a - b)
    .map((i) => DAY_ABBR[i])
    .join(", ");
  return `Weekly · ${days || "no days"}${time}`;
}
