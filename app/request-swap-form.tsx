"use client";

import { useEffect, useState } from "react";
import { createSwapRequest } from "./actions";

export type DayOption = {
  date: string; // ISO
  label: string; // "Fri Aug 29"
  currentParentId: string;
};

type Member = { id: string; label: string };

export function RequestSwapForm({
  options,
  members,
  initialDate,
  initialOpen = false,
}: {
  options: DayOption[];
  members: Member[];
  initialDate?: string;
  initialOpen?: boolean;
}) {
  const validInitial =
    initialDate && options.some((o) => o.date === initialDate)
      ? initialDate
      : options[0]?.date ?? "";
  const [open, setOpen] = useState(initialOpen);
  const [date, setDate] = useState(validInitial);

  const current = options.find((o) => o.date === date);
  const currentParentId = current?.currentParentId ?? "";
  const otherId =
    members.find((mm) => mm.id !== currentParentId)?.id ?? members[0]?.id ?? "";

  const [toParent, setToParent] = useState(otherId);

  // When the chosen day changes, default "give to" to whoever doesn't have it.
  useEffect(() => {
    setToParent(otherId);
  }, [date, otherId]);

  const labelFor = (id: string) => members.find((mm) => mm.id === id)?.label ?? "?";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-sm border border-line bg-card px-3.5 py-3 text-sm font-semibold text-left hover:border-ink-faint flex items-center justify-between"
      >
        Request a swap
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          new
        </span>
      </button>
    );
  }

  return (
    <form
      action={createSwapRequest}
      className="rounded-card border border-line bg-card shadow-sm p-4 flex flex-col gap-3"
    >
      <div className="flex items-baseline justify-between">
        <div className="font-display text-base">Request a swap</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-ink"
        >
          Cancel
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
          Day
        </span>
        <select
          name="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-sm border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink-faint"
        >
          {options.map((o) => (
            <option key={o.date} value={o.date}>
              {o.label} — currently {labelFor(o.currentParentId)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
          Give this day to
        </span>
        <select
          name="to_parent_id"
          value={toParent}
          onChange={(e) => setToParent(e.target.value)}
          className="rounded-sm border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink-faint"
        >
          {members.map((mm) => (
            <option key={mm.id} value={mm.id}>
              {mm.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
          Note (optional)
        </span>
        <input
          type="text"
          name="note"
          placeholder="e.g. birthday party"
          className="rounded-sm border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink-faint"
        />
      </label>

      {/* Current holder of the selected day, so the request records the "from". */}
      <input type="hidden" name="from_parent_id" value={currentParentId} />

      <button
        type="submit"
        className="mt-1 rounded-sm bg-ink text-white font-display text-sm py-2.5 hover:opacity-90"
      >
        Send request
      </button>
    </form>
  );
}
