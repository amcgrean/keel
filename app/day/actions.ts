"use server";

import { revalidatePath } from "next/cache";
import { getMembership } from "@/lib/family";
import { composeStartsAt } from "@/lib/events";

export async function createEvent(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;

  const date = String(formData.get("date") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !title) return;

  const categoryRaw = String(formData.get("category") ?? "");
  const category = ["medical", "school", "activity", "birthday", "other"].includes(categoryRaw)
    ? categoryRaw
    : null;
  const time = String(formData.get("time") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await m.supabase.from("events").insert({
    family_id: m.member.family_id,
    title,
    category,
    location,
    notes,
    starts_at: composeStartsAt(date, time),
    created_by: m.member.id,
  });

  revalidatePath(`/day/${date}`);
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function deleteEvent(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;

  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!id) return;

  await m.supabase.from("events").delete().eq("id", id);

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) revalidatePath(`/day/${date}`);
  revalidatePath("/");
  revalidatePath("/calendar");
}
