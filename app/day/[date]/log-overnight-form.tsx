"use client";

import { useRef, useState } from "react";
import { logOvernight } from "../../actions";

const inputCls =
  "rounded-sm border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink-faint";
const labelCls = "font-mono text-[10.5px] uppercase tracking-wider text-ink-faint";

type Member = { id: string; label: string };

/**
 * Log who actually had Patrick on a given night when it differed from the
 * base rotation — recorded now as a pending change, confirmed later by the
 * other parent. Defaults the holder to whoever the rotation did *not* assign,
 * since that's the usual reason to log one.
 */
export function LogOvernightForm({
  date,
  members,
  defaultParentId,
}: {
  date: string;
  members: Member[];
  defaultParentId: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-sm border border-line bg-card px-3.5 py-2.5 text-sm font-semibold text-left hover:border-ink-faint flex items-center justify-between"
      >
        Log a different overnight
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          pending
        </span>
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await logOvernight(fd);
        formRef.current?.reset();
        setOpen(false);
      }}
      className="rounded-card border border-line bg-card shadow-sm p-4 flex flex-col gap-3"
    >
      <input type="hidden" name="date" value={date} />
      <div className="flex items-baseline justify-between">
        <div className="font-display text-base">Log this overnight</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-ink"
        >
          Cancel
        </button>
      </div>

      <p className="text-[11.5px] text-ink-soft leading-relaxed">
        Record who actually had Patrick this night. It shows as pending until
        the other parent confirms it.
      </p>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Who had Patrick</span>
        <select name="parent_id" defaultValue={defaultParentId} className={inputCls}>
          {members.map((mm) => (
            <option key={mm.id} value={mm.id}>
              {mm.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Note (optional)</span>
        <input
          type="text"
          name="note"
          placeholder="e.g. covered while Makala travelled"
          className={inputCls}
        />
      </label>

      <button
        type="submit"
        className="mt-1 rounded-sm bg-ink text-white font-display text-sm py-2.5 hover:opacity-90"
      >
        Log overnight
      </button>
    </form>
  );
}
