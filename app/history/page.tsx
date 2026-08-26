import { redirect } from "next/navigation";
import { getMembership } from "@/lib/family";
import { memberMaps, type Member } from "@/lib/schedule-data";
import { signout } from "../login/actions";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  object_type: string;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  swap_accepted: "accepted a swap",
  swap_declined: "declined a swap",
  expense_added: "logged an expense",
  expense_approved: "approved an expense",
  expense_refused: "refused an expense",
  expense_settled: "settled an expense",
};

function labelForAction(a: string) {
  return ACTION_LABEL[a] ?? a.replace(/_/g, " ");
}

export default async function HistoryPage() {
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
        <p className="text-sm text-ink-soft">Not linked to a family yet.</p>
      </main>
    );
  }

  const familyId = m.member.family_id;
  const [membersRes, auditRes] = await Promise.all([
    m.supabase
      .from("family_members")
      .select("id, display_name, color")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true }),
    m.supabase
      .from("audit_events")
      .select("id, actor_id, action, object_type, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const members = (membersRes.data ?? []) as Member[];
  const rows = (auditRes.data ?? []) as AuditRow[];
  const { labelFor } = memberMaps(members);

  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-24">
      {header}
      <h2 className="font-display text-lg mb-3">Event history</h2>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Nothing logged yet. Swaps and other changes will appear here.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-baseline justify-between gap-3 rounded-sm border border-line bg-card px-3.5 py-2.5"
            >
              <div className="text-sm">
                <span className="font-semibold">
                  {r.actor_id ? labelFor(r.actor_id) : "Someone"}
                </span>{" "}
                {labelForAction(r.action)}
              </div>
              <div className="font-mono text-[10px] text-ink-faint whitespace-nowrap">
                {new Date(r.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
