import { redirect } from "next/navigation";
import { getMembership } from "@/lib/family";
import {
  describeReminder,
  kindEmoji,
  type ReminderRow,
} from "@/lib/reminders";
import { signout } from "../login/actions";
import { ReminderForm } from "./reminder-form";
import { deleteReminder } from "./actions";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const m = await getMembership();
  if (!m) redirect("/login");

  const header = (
    <div className="flex items-baseline justify-between mb-5">
      <h1 className="font-display text-xl font-semibold">Keel</h1>
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
        <section className="rounded-card border border-line bg-card shadow-sm p-6">
          <p className="text-sm text-ink-soft">
            Your account isn&apos;t linked to a family yet.
          </p>
        </section>
      </main>
    );
  }

  const { data } = await m.supabase
    .from("reminders")
    .select("id, title, notes, kind, time_of_day, recurrence, weekdays, on_date")
    .eq("family_id", m.member.family_id)
    .order("created_at", { ascending: true });
  const reminders = (data ?? []) as ReminderRow[];

  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-24">
      {header}

      <section className="mb-6">
        <ReminderForm />
      </section>

      <section>
        <h3 className="font-display text-base mb-2">
          All reminders {reminders.length > 0 && `(${reminders.length})`}
        </h3>
        {reminders.length === 0 ? (
          <p className="text-sm text-ink-soft">
            None yet. Add daycare drop-off/pick-up, or things like “bring bedding
            on Friday.”
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {reminders.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-sm border border-line bg-card px-3.5 py-2.5"
              >
                <span className="text-lg leading-none">{kindEmoji(r.kind)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{r.title}</div>
                  <div className="text-[11.5px] text-ink-faint">
                    {describeReminder(r)}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </div>
                </div>
                <form action={deleteReminder}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-danger">
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
