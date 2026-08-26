"use server";

import { revalidatePath } from "next/cache";
import { getMembership, type Membership } from "@/lib/family";
import { sendPushToMembers } from "@/lib/push";

type FamRow = { id: string; display_name: string };

async function familyRoster(
  supabase: Membership["supabase"],
  familyId: string
): Promise<FamRow[]> {
  const { data } = await supabase
    .from("family_members")
    .select("id, display_name")
    .eq("family_id", familyId);
  return (data ?? []) as FamRow[];
}

type ProposedChange = {
  date: string;
  from_parent_id: string | null;
  to_parent_id: string;
  note?: string;
};

/**
 * Create a pending swap request proposing that `to_parent_id` take Patrick on
 * `date`. The other parent accepts or declines it.
 */
export async function createSwapRequest(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;

  const date = String(formData.get("date") ?? "");
  const toParent = String(formData.get("to_parent_id") ?? "");
  const fromParent = String(formData.get("from_parent_id") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim();

  if (!date || !toParent) return;

  const change: ProposedChange = {
    date,
    from_parent_id: fromParent,
    to_parent_id: toParent,
    ...(note ? { note } : {}),
  };

  await m.supabase.from("swap_requests").insert({
    family_id: m.member.family_id,
    requested_by: m.member.id,
    status: "pending",
    proposed_changes: [change],
  });

  // Notify the other parent(s).
  const me = m.member;
  const roster = await familyRoster(m.supabase, me.family_id);
  const meName = roster.find((r) => r.id === me.id)?.display_name ?? "A parent";
  const whenLabel = new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  await sendPushToMembers(
    m.supabase,
    me.family_id,
    roster.filter((r) => r.id !== me.id).map((r) => r.id),
    {
      title: "New swap request",
      body: `${meName} requested a swap for ${whenLabel}.`,
      url: `/day/${date}`,
    }
  );

  revalidatePath("/");
}

/**
 * Accept or decline a pending swap request. On accept, each proposed change is
 * written as a schedule_exception (which the schedule engine resolves above the
 * base rotation), the request is marked accepted, and an audit entry is logged.
 */
export async function respondToSwapRequest(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;

  const id = String(formData.get("request_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || (decision !== "accept" && decision !== "decline")) return;

  const { data: req } = await m.supabase
    .from("swap_requests")
    .select("id, family_id, proposed_changes, status, requested_by")
    .eq("id", id)
    .maybeSingle();

  if (!req || req.status !== "pending") return;

  const now = new Date().toISOString();

  if (decision === "accept") {
    const changes = (req.proposed_changes as ProposedChange[]) ?? [];
    for (const c of changes) {
      await m.supabase.from("schedule_exceptions").upsert(
        {
          family_id: req.family_id,
          date: c.date,
          parent_id: c.to_parent_id,
          reason: c.note ?? "Swap",
          requested_by: req.requested_by,
          approved_by: m.member.id,
          approved_at: now,
        },
        { onConflict: "family_id,date" }
      );
    }

    await m.supabase
      .from("swap_requests")
      .update({ status: "accepted", resolved_at: now })
      .eq("id", id);

    await m.supabase.rpc("log_audit_event", {
      p_family_id: req.family_id,
      p_action: "swap_accepted",
      p_object_type: "swap_request",
      p_object_id: id,
      p_old_value: null,
      p_new_value: req.proposed_changes,
    });
  } else {
    await m.supabase
      .from("swap_requests")
      .update({ status: "declined", resolved_at: now })
      .eq("id", id);

    await m.supabase.rpc("log_audit_event", {
      p_family_id: req.family_id,
      p_action: "swap_declined",
      p_object_type: "swap_request",
      p_object_id: id,
      p_old_value: null,
      p_new_value: req.proposed_changes,
    });
  }

  // Notify the requester of the outcome.
  const me = m.member;
  const roster = await familyRoster(m.supabase, req.family_id);
  const meName = roster.find((r) => r.id === me.id)?.display_name ?? "The other parent";
  if (req.requested_by !== me.id) {
    await sendPushToMembers(m.supabase, req.family_id, [req.requested_by], {
      title: `Swap ${decision === "accept" ? "accepted" : "declined"}`,
      body: `${meName} ${decision === "accept" ? "accepted" : "declined"} your swap request.`,
      url: "/",
    });
  }

  revalidatePath("/");
}
