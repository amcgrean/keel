"use client";

import { useRef, useState } from "react";
import { createEvent } from "../actions";

const CATEGORIES: [string, string][] = [
  ["school", "🏫 School"],
  ["medical", "🩺 Medical"],
  ["activity", "⚽ Activity"],
  ["birthday", "🎂 Birthday"],
  ["other", "📌 Other"],
];

const inputCls =
  "rounded-sm border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink-faint";
const labelCls = "font-mono text-[10.5px] uppercase tracking-wider text-ink-faint";

export function EventForm({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-sm border border-line bg-card px-3.5 py-3 text-sm font-semibold text-left hover:border-ink-faint"
      >
        + Add an event
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await createEvent(fd);
        formRef.current?.reset();
        setOpen(false);
      }}
      className="rounded-card border border-line bg-card shadow-sm p-4 flex flex-col gap-3"
    >
      <input type="hidden" name="date" value={date} />
      <div className="flex items-baseline justify-between">
        <div className="font-display text-base">New event</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-ink"
        >
          Cancel
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>What</span>
        <input name="title" required placeholder="e.g. Dentist" className={inputCls} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Category</span>
          <select name="category" defaultValue="other" className={inputCls}>
            {CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Time (optional)</span>
          <input type="time" name="time" className={inputCls} />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Location (optional)</span>
        <input name="location" placeholder="where" className={inputCls} />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Notes (optional)</span>
        <input name="notes" placeholder="anything to remember" className={inputCls} />
      </label>

      <button
        type="submit"
        className="mt-1 rounded-sm bg-ink text-white font-display text-sm py-2.5 hover:opacity-90"
      >
        Add event
      </button>
    </form>
  );
}
