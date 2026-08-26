"use server";

import { revalidatePath } from "next/cache";
import { getMembership, type Membership } from "@/lib/family";
import { sendPushToMembers } from "@/lib/push";
import { money } from "@/lib/expenses";

async function roster(supabase: Membership["supabase"], familyId: string) {
  const { data } = await supabase
    .from("family_members")
    .select("id, display_name")
    .eq("family_id", familyId);
  return (data ?? []) as { id: string; display_name: string }[];
}

export async function createExpense(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;

  const title = String(formData.get("title") ?? "").trim();
  const amount = Number(formData.get("amount"));
  if (!title || !Number.isFinite(amount) || amount <= 0) return;

  const paidBy = String(formData.get("paid_by") ?? m.member.id);
  const incurredOn = String(formData.get("incurred_on") ?? "");
  const categoryRaw = String(formData.get("category") ?? "");
  const category = ["medical", "childcare", "school", "activities", "clothing", "other"].includes(
    categoryRaw
  )
    ? categoryRaw
    : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const members = await roster(m.supabase, m.member.family_id);
  const other = members.find((r) => r.id !== paidBy);
  if (!other) return; // need a coparent to owe a share

  const shareRaw = Number(formData.get("owed_amount"));
  const owedAmount =
    Number.isFinite(shareRaw) && shareRaw >= 0
      ? Math.round(shareRaw * 100) / 100
      : Math.round((amount / 2) * 100) / 100;

  await m.supabase.from("expenses").insert({
    family_id: m.member.family_id,
    created_by: m.member.id,
    title,
    amount: Math.round(amount * 100) / 100,
    category,
    incurred_on: /^\d{4}-\d{2}-\d{2}$/.test(incurredOn) ? incurredOn : undefined,
    paid_by: paidBy,
    owed_by: other.id,
    owed_amount: owedAmount,
    status: "pending",
    notes,
  });

  const meName = members.find((r) => r.id === m.member!.id)?.display_name ?? "A parent";
  await m.supabase.rpc("log_audit_event", {
    p_family_id: m.member.family_id,
    p_action: "expense_added",
    p_object_type: "expense",
    p_object_id: null,
    p_old_value: null,
    p_new_value: { title, amount },
  });
  await sendPushToMembers(m.supabase, m.member.family_id, [other.id], {
    title: "New expense to review",
    body: `${meName} logged ${money(amount)} — ${title}. Their share: ${money(owedAmount)}.`,
    url: "/expenses",
  });

  revalidatePath("/expenses");
  revalidatePath("/history");
}

export async function respondToExpense(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || (decision !== "approve" && decision !== "refuse")) return;

  const { data: exp } = await m.supabase
    .from("expenses")
    .select("id, family_id, created_by, title, status")
    .eq("id", id)
    .maybeSingle();
  if (!exp || exp.status !== "pending") return;

  const now = new Date().toISOString();
  await m.supabase
    .from("expenses")
    .update({ status: decision === "approve" ? "approved" : "refused", resolved_at: now })
    .eq("id", id);

  const members = await roster(m.supabase, exp.family_id);
  const meName = members.find((r) => r.id === m.member!.id)?.display_name ?? "The coparent";
  await m.supabase.rpc("log_audit_event", {
    p_family_id: exp.family_id,
    p_action: decision === "approve" ? "expense_approved" : "expense_refused",
    p_object_type: "expense",
    p_object_id: id,
    p_old_value: null,
    p_new_value: { title: exp.title },
  });
  if (exp.created_by && exp.created_by !== m.member.id) {
    await sendPushToMembers(m.supabase, exp.family_id, [exp.created_by], {
      title: `Expense ${decision === "approve" ? "approved" : "refused"}`,
      body: `${meName} ${decision === "approve" ? "approved" : "refused"} “${exp.title}”.`,
      url: "/expenses",
    });
  }

  revalidatePath("/expenses");
  revalidatePath("/history");
}

export async function settleExpense(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: exp } = await m.supabase
    .from("expenses")
    .select("id, family_id, title, status, paid_by, owed_by")
    .eq("id", id)
    .maybeSingle();
  if (!exp || exp.status !== "approved") return;

  const now = new Date().toISOString();
  await m.supabase.from("expenses").update({ status: "settled", resolved_at: now }).eq("id", id);

  const members = await roster(m.supabase, exp.family_id);
  const meName = members.find((r) => r.id === m.member!.id)?.display_name ?? "The coparent";
  await m.supabase.rpc("log_audit_event", {
    p_family_id: exp.family_id,
    p_action: "expense_settled",
    p_object_type: "expense",
    p_object_id: id,
    p_old_value: null,
    p_new_value: { title: exp.title },
  });
  const notify = [exp.paid_by, exp.owed_by].filter((mid) => mid && mid !== m.member!.id);
  await sendPushToMembers(m.supabase, exp.family_id, notify, {
    title: "Expense settled",
    body: `${meName} marked “${exp.title}” settled.`,
    url: "/expenses",
  });

  revalidatePath("/expenses");
  revalidatePath("/history");
}

export async function deleteExpense(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await m.supabase.from("expenses").delete().eq("id", id);
  revalidatePath("/expenses");
}
