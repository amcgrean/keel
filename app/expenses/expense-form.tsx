"use client";

import { useRef, useState } from "react";
import { createExpense } from "./actions";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";

type Member = { id: string; label: string };

const inputCls =
  "rounded-sm border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink-faint";
const labelCls = "font-mono text-[10.5px] uppercase tracking-wider text-ink-faint";

export function ExpenseForm({
  members,
  meMemberId,
  today,
}: {
  members: Member[];
  meMemberId: string;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [share, setShare] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Default the coparent's share to half whenever the amount changes and the
  // user hasn't overridden it.
  const [shareTouched, setShareTouched] = useState(false);
  const half = amount && Number.isFinite(Number(amount)) ? (Number(amount) / 2).toFixed(2) : "";
  const shareValue = shareTouched ? share : half;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-sm border border-line bg-card px-3.5 py-3 text-sm font-semibold text-left hover:border-ink-faint"
      >
        + Log an expense
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await createExpense(fd);
        formRef.current?.reset();
        setAmount("");
        setShare("");
        setShareTouched(false);
        setOpen(false);
      }}
      className="rounded-card border border-line bg-card shadow-sm p-4 flex flex-col gap-3"
    >
      <div className="flex items-baseline justify-between">
        <div className="font-display text-base">Log an expense</div>
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
        <input name="title" required placeholder="e.g. Copay" className={inputCls} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Amount</span>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Category</span>
          <select name="category" defaultValue="other" className={inputCls}>
            {EXPENSE_CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Paid by</span>
          <select name="paid_by" defaultValue={meMemberId} className={inputCls}>
            {members.map((mm) => (
              <option key={mm.id} value={mm.id}>
                {mm.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Their share</span>
          <input
            name="owed_amount"
            type="number"
            step="0.01"
            min="0"
            value={shareValue}
            onChange={(e) => {
              setShareTouched(true);
              setShare(e.target.value);
            }}
            placeholder="half"
            className={inputCls}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Date</span>
        <input type="date" name="incurred_on" defaultValue={today} className={inputCls} />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Note (optional)</span>
        <input name="notes" placeholder="anything to remember" className={inputCls} />
      </label>

      <button
        type="submit"
        className="mt-1 rounded-sm bg-ink text-white font-display text-sm py-2.5 hover:opacity-90"
      >
        Send to coparent
      </button>
    </form>
  );
}
