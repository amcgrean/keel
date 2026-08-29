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

function longDate(date: string): string {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function revalidateSchedule(date?: string) {
  revalidatePath("/");
  revalidatePath("/calendar");
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) revalidatePath(`/day/${date}`);
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

/**
 * Log an overnight one parent actually covered — a deviation from the base
 * rotation recorded *now*, before the other parent is necessarily on the app.
 * It's written as a `pending` schedule_exception (requested_by = me, no
 * approver yet), so it shows up as provisional everywhere until the other
 * parent confirms it. Unlike a swap request, this reflects a night that has
 * already happened, so the schedule updates immediately.
 */
export async function logOvernight(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;

  const date = String(formData.get("date") ?? "");
  const parentId = String(formData.get("parent_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !parentId) return;

  const me = m.member;
  const roster = await familyRoster(m.supabase, me.family_id);
  // parent_id must be a real member of this family.
  if (!roster.some((r) => r.id === parentId)) return;

  const { data: row } = await m.supabase
    .from("schedule_exceptions")
    .upsert(
      {
        family_id: me.family_id,
        date,
        parent_id: parentId,
        reason: note || "Overnight covered",
        requested_by: me.id,
        approved_by: null,
        approved_at: null,
        status: "pending",
      },
      { onConflict: "family_id,date" }
    )
    .select("id")
    .maybeSingle();

  await m.supabase.rpc("log_audit_event", {
    p_family_id: me.family_id,
    p_action: "overnight_logged",
    p_object_type: "schedule_exception",
    p_object_id: (row as { id: string } | null)?.id ?? null,
    p_old_value: null,
    p_new_value: { date, parent_id: parentId, note: note || null },
  });

  const meName = roster.find((r) => r.id === me.id)?.display_name ?? "A parent";
  const heldName = roster.find((r) => r.id === parentId)?.display_name ?? "a parent";
  await sendPushToMembers(
    m.supabase,
    me.family_id,
    roster.filter((r) => r.id !== me.id).map((r) => r.id),
    {
      title: "Overnight to confirm",
      body: `${meName} logged that ${heldName} had Patrick ${longDate(date)}. Confirm or dispute it.`,
      url: `/day/${date}`,
    }
  );

  revalidateSchedule(date);
}

/**
 * The other parent confirms or disputes a pending overnight. Confirming marks
 * the exception `confirmed` (it becomes an agreed change, identical to an
 * accepted swap); disputing removes it, restoring the base rotation for that
 * day. Only a parent who did *not* log it can respond.
 */
export async function confirmOvernight(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;

  const id = String(formData.get("exception_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || (decision !== "confirm" && decision !== "dispute")) return;

  const me = m.member;
  const { data: ex } = await m.supabase
    .from("schedule_exceptions")
    .select("id, family_id, date, parent_id, requested_by, status")
    .eq("id", id)
    .maybeSingle();

  if (!ex || ex.family_id !== me.family_id || ex.status !== "pending") return;
  // Only the counterparty confirms; the logger uses cancel instead.
  if (ex.requested_by === me.id) return;

  const now = new Date().toISOString();

  if (decision === "confirm") {
    await m.supabase
      .from("schedule_exceptions")
      .update({ status: "confirmed", approved_by: me.id, approved_at: now })
      .eq("id", id);
  } else {
    await m.supabase.from("schedule_exceptions").delete().eq("id", id);
  }

  await m.supabase.rpc("log_audit_event", {
    p_family_id: ex.family_id,
    p_action: decision === "confirm" ? "overnight_confirmed" : "overnight_disputed",
    p_object_type: "schedule_exception",
    p_object_id: id,
    p_old_value: { date: ex.date, parent_id: ex.parent_id },
    p_new_value: null,
  });

  const roster = await familyRoster(m.supabase, ex.family_id);
  const meName = roster.find((r) => r.id === me.id)?.display_name ?? "The other parent";
  if (ex.requested_by && ex.requested_by !== me.id) {
    await sendPushToMembers(m.supabase, ex.family_id, [ex.requested_by], {
      title: `Overnight ${decision === "confirm" ? "confirmed" : "disputed"}`,
      body: `${meName} ${decision === "confirm" ? "confirmed" : "disputed"} the overnight on ${longDate(ex.date)}.`,
      url: `/day/${ex.date}`,
    });
  }

  revalidateSchedule(ex.date);
}

/**
 * Cancel a pending overnight you logged (before the other parent responds).
 * Removes the provisional exception and restores the base rotation.
 */
export async function cancelOvernight(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;

  const id = String(formData.get("exception_id") ?? "");
  if (!id) return;

  const me = m.member;
  const { data: ex } = await m.supabase
    .from("schedule_exceptions")
    .select("id, family_id, date, parent_id, requested_by, status")
    .eq("id", id)
    .maybeSingle();

  // Only the logger can cancel, and only while it's still pending.
  if (!ex || ex.family_id !== me.family_id || ex.status !== "pending") return;
  if (ex.requested_by !== me.id) return;

  await m.supabase.from("schedule_exceptions").delete().eq("id", id);

  await m.supabase.rpc("log_audit_event", {
    p_family_id: ex.family_id,
    p_action: "overnight_canceled",
    p_object_type: "schedule_exception",
    p_object_id: id,
    p_old_value: { date: ex.date, parent_id: ex.parent_id },
    p_new_value: null,
  });

  revalidateSchedule(ex.date);
}
