import { redirect } from "next/navigation";
import { getMembership } from "@/lib/family";
import { memberMaps, type Member } from "@/lib/schedule-data";
import {
  netBalance,
  money,
  categoryEmoji,
  type ExpenseRow,
} from "@/lib/expenses";
import { signout } from "../login/actions";
import { TopNav } from "../top-nav";
import { ExpenseForm } from "./expense-form";
import { respondToExpense, settleExpense, deleteExpense } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  approved: "Approved",
  refused: "Refused",
  settled: "Settled",
  pending: "Pending",
};

export default async function ExpensesPage() {
  const m = await getMembership();
  if (!m) redirect("/login");

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

  if (!m.member) {
    return (
      <main className="mx-auto max-w-md px-5 pt-8 pb-24">
        {header}
        <p className="text-sm text-ink-soft">Not linked to a family yet.</p>
      </main>
    );
  }

  const familyId = m.member.family_id;
  const meMemberId = m.member.id;
  const [membersRes, expensesRes] = await Promise.all([
    m.supabase
      .from("family_members")
      .select("id, display_name, color")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true }),
    m.supabase
      .from("expenses")
      .select(
        "id, created_by, title, amount, category, incurred_on, paid_by, owed_by, owed_amount, status, notes"
      )
      .eq("family_id", familyId)
      .order("incurred_on", { ascending: false }),
  ]);

  const members = (membersRes.data ?? []) as Member[];
  const expenses = (expensesRes.data ?? []) as ExpenseRow[];
  const { labelFor } = memberMaps(members);

  const balance = netBalance(expenses);
  const incoming = expenses.filter(
    (e) => e.status === "pending" && e.created_by !== meMemberId
  );
  const active = expenses.filter((e) => e.status === "pending" || e.status === "approved");
  const done = expenses.filter((e) => e.status === "settled" || e.status === "refused");

  const today = new Date().toISOString().slice(0, 10);

  const line = (e: ExpenseRow) =>
    `${money(Number(e.amount))} · paid by ${labelFor(e.paid_by)} · ${labelFor(e.owed_by)} owes ${money(Number(e.owed_amount))}`;

  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-24">
      {header}

      {/* Balance */}
      <section className="rounded-card border border-line bg-card shadow-sm p-5 mb-6">
        <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint mb-1">
          Balance
        </div>
        {balance ? (
          <div className="font-display text-xl">
            {balance.ower === meMemberId ? "You owe" : `${labelFor(balance.ower)} owes`}{" "}
            {balance.owee === meMemberId ? "you" : labelFor(balance.owee)}{" "}
            <span className="text-parentA">{money(balance.amount)}</span>
          </div>
        ) : (
          <div className="font-display text-xl">All square 🎉</div>
        )}
        <div className="text-[11.5px] text-ink-faint mt-1">
          From approved, unsettled expenses.
        </div>
      </section>

      {/* Needs your response */}
      {incoming.length > 0 && (
        <section className="mb-6">
          <h3 className="font-display text-base mb-2">Needs your response</h3>
          <div className="flex flex-col gap-2">
            {incoming.map((e) => (
              <div key={e.id} className="rounded-card border border-beacon/40 bg-beacon-soft/30 p-3.5">
                <div className="text-sm font-semibold mb-0.5">
                  {categoryEmoji(e.category)} {e.title}
                </div>
                <div className="text-[11.5px] text-ink-soft mb-2">{line(e)}</div>
                <form className="flex gap-2">
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    formAction={respondToExpense}
                    name="decision"
                    value="approve"
                    className="flex-1 rounded-sm bg-ink text-white font-display text-sm py-2 hover:opacity-90"
                  >
                    Approve
                  </button>
                  <button
                    formAction={respondToExpense}
                    name="decision"
                    value="refuse"
                    className="flex-1 rounded-sm border border-line bg-card text-sm py-2 hover:border-ink-faint"
                  >
                    Refuse
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Log new */}
      <section className="mb-6">
        <ExpenseForm
          members={members.map((mm) => ({ id: mm.id, label: mm.display_name }))}
          meMemberId={meMemberId}
          today={today}
        />
      </section>

      {/* Active (pending + approved) */}
      <section className="mb-6">
        <h3 className="font-display text-base mb-2">Open</h3>
        {active.length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing open.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {active.map((e) => (
              <div
                key={e.id}
                className="rounded-sm border border-line bg-card px-3.5 py-2.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {categoryEmoji(e.category)} {e.title}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    {STATUS_LABEL[e.status]}
                  </div>
                </div>
                <div className="text-[11.5px] text-ink-faint mt-0.5">{line(e)}</div>
                <div className="flex gap-2 mt-2">
                  {e.status === "approved" && (
                    <form action={settleExpense}>
                      <input type="hidden" name="id" value={e.id} />
                      <button className="rounded-sm bg-parentB text-white font-display text-[13px] px-3 py-1.5 hover:opacity-90">
                        Mark settled
                      </button>
                    </form>
                  )}
                  {e.created_by === meMemberId && (
                    <form action={deleteExpense}>
                      <input type="hidden" name="id" value={e.id} />
                      <button className="font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-danger self-center">
                        Delete
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      {done.length > 0 && (
        <section>
          <h3 className="font-display text-base mb-2">Settled &amp; refused</h3>
          <div className="flex flex-col gap-2">
            {done.map((e) => (
              <div
                key={e.id}
                className="flex items-baseline justify-between gap-2 rounded-sm border border-line bg-paper px-3.5 py-2.5"
              >
                <div className="text-[13px]">
                  {categoryEmoji(e.category)} {e.title} · {money(Number(e.amount))}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  {STATUS_LABEL[e.status]}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
