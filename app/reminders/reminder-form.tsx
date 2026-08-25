"use client";

import { useRef, useState } from "react";
import { createReminder } from "./actions";

const WEEKDAYS: [string, string][] = [
  ["0", "Su"],
  ["1", "Mo"],
  ["2", "Tu"],
  ["3", "We"],
  ["4", "Th"],
  ["5", "Fr"],
  ["6", "Sa"],
];

const KINDS: [string, string][] = [
  ["dropoff", "🎒 Drop-off"],
  ["pickup", "🏡 Pick-up"],
  ["bring", "🧺 Bring"],
  ["note", "🔔 Reminder"],
];

const inputCls =
  "rounded-sm border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink-faint";
const labelCls =
  "font-mono text-[10.5px] uppercase tracking-wider text-ink-faint";

export function ReminderForm() {
  const [recurrence, setRecurrence] = useState<"weekly" | "once">("weekly");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await createReminder(fd);
        formRef.current?.reset();
        setRecurrence("weekly");
      }}
      className="rounded-card border border-line bg-card shadow-sm p-4 flex flex-col gap-3"
    >
      <div className="font-display text-base">New reminder</div>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>What</span>
        <input
          name="title"
          required
          placeholder="e.g. Pick up bedding"
          className={inputCls}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Type</span>
          <select name="kind" defaultValue="note" className={inputCls}>
            {KINDS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Time (optional)</span>
          <input type="time" name="time_of_day" className={inputCls} />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelCls}>Repeats</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRecurrence("weekly")}
            className={`flex-1 rounded-sm border px-3 py-1.5 text-sm ${
              recurrence === "weekly"
                ? "border-ink bg-ink text-white"
                : "border-line bg-paper text-ink-soft"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setRecurrence("once")}
            className={`flex-1 rounded-sm border px-3 py-1.5 text-sm ${
              recurrence === "once"
                ? "border-ink bg-ink text-white"
                : "border-line bg-paper text-ink-soft"
            }`}
          >
            One time
          </button>
        </div>
        {/* Radio the server action reads. */}
        <input type="hidden" name="recurrence" value={recurrence} />
      </div>

      {recurrence === "weekly" ? (
        <div className="flex flex-col gap-1">
          <span className={labelCls}>On these days</span>
          <div className="flex gap-1">
            {WEEKDAYS.map(([v, l]) => (
              <label
                key={v}
                className="flex-1 flex items-center justify-center rounded-sm border border-line bg-paper py-2 text-[12px] cursor-pointer has-[:checked]:bg-ink has-[:checked]:text-white has-[:checked]:border-ink"
              >
                <input type="checkbox" name="weekdays" value={v} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Date</span>
          <input type="date" name="on_date" className={inputCls} />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Note (optional)</span>
        <input name="notes" placeholder="anything to remember" className={inputCls} />
      </label>

      <button
        type="submit"
        className="mt-1 rounded-sm bg-ink text-white font-display text-sm py-2.5 hover:opacity-90"
      >
        Add reminder
      </button>
    </form>
  );
}
