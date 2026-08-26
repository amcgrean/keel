"use server";

import { revalidatePath } from "next/cache";
import { getMembership } from "@/lib/family";

function revalidateAll() {
  revalidatePath("/rules");
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function updateExchangeTime(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;
  const t = String(formData.get("exchange_time") ?? "");
  if (!/^\d{2}:\d{2}$/.test(t)) return;
  await m.supabase
    .from("families")
    .update({ exchange_time: t })
    .eq("id", m.member.family_id);
  revalidateAll();
}

export async function createVacation(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;

  const parentId = String(formData.get("parent_id") ?? "");
  const start = String(formData.get("start_date") ?? "");
  const end = String(formData.get("end_date") ?? "");
  const label = String(formData.get("label") ?? "").trim() || null;
  const dateOk = /^\d{4}-\d{2}-\d{2}$/;
  if (!parentId || !dateOk.test(start) || !dateOk.test(end) || end < start) return;

  await m.supabase.from("vacations").insert({
    family_id: m.member.family_id,
    parent_id: parentId,
    label,
    start_date: start,
    end_date: end,
    created_by: m.member.id,
  });
  revalidateAll();
}

export async function deleteVacation(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await m.supabase.from("vacations").delete().eq("id", id);
  revalidateAll();
}

export async function createHoliday(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;

  const label = String(formData.get("label") ?? "").trim();
  const start = String(formData.get("start_date") ?? "");
  const end = String(formData.get("end_date") ?? "");
  const evenParent = String(formData.get("parent_even_years") ?? "");
  const oddParent = String(formData.get("parent_odd_years") ?? "");
  const dateOk = /^\d{4}-\d{2}-\d{2}$/;
  if (!label || !dateOk.test(start) || !dateOk.test(end) || !evenParent || !oddParent) return;

  // Store month-day only; the year the user picked is ignored.
  await m.supabase.from("holiday_rules").insert({
    family_id: m.member.family_id,
    label,
    start_month_day: start.slice(5, 10),
    end_month_day: end.slice(5, 10),
    parent_even_years: evenParent,
    parent_odd_years: oddParent,
  });
  revalidateAll();
}

export async function deleteHoliday(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await m.supabase.from("holiday_rules").delete().eq("id", id);
  revalidateAll();
}
