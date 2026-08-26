import { formatTime } from "@/lib/reminders";

export type EventRow = {
  id: string;
  title: string;
  category: string | null;
  starts_at: string; // ISO timestamptz (UTC)
  location: string | null;
  notes: string | null;
};

export const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  medical: { emoji: "🩺", label: "Medical" },
  school: { emoji: "🏫", label: "School" },
  activity: { emoji: "⚽", label: "Activity" },
  birthday: { emoji: "🎂", label: "Birthday" },
  other: { emoji: "📌", label: "Other" },
};

export function categoryEmoji(c: string | null): string {
  return (c && CATEGORY_META[c]?.emoji) || "📌";
}

/** Date portion (UTC) of an event's start. Events are stored pinned to UTC so
 *  the wall-clock date/time the user entered round-trips without tz drift. */
export function eventDateIso(e: EventRow): string {
  return e.starts_at.slice(0, 10);
}

/** "HH:MM" wall-clock, or "" for a midnight/all-day event. */
export function eventTime(e: EventRow): string {
  const hhmm = e.starts_at.slice(11, 16);
  return hhmm && hhmm !== "00:00" ? formatTime(hhmm) : "";
}

export function eventsOn(events: EventRow[], dateIso: string): EventRow[] {
  return events
    .filter((e) => eventDateIso(e) === dateIso)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

/** Compose the timestamptz string the DB stores from a date + optional time,
 *  pinned to UTC so it reads back as the same wall-clock values. */
export function composeStartsAt(dateIso: string, time: string | null): string {
  const hhmm = time && /^\d{2}:\d{2}$/.test(time) ? time : "00:00";
  return `${dateIso}T${hhmm}:00+00:00`;
}
