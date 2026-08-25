"use server";

import { revalidatePath } from "next/cache";
import { getMembership } from "@/lib/family";

function revalidateAll() {
  revalidatePath("/reminders");
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function createReminder(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const kindRaw = String(formData.get("kind") ?? "");
  const kind = ["dropoff", "pickup", "bring", "note"].includes(kindRaw) ? kindRaw : null;
  const time = String(formData.get("time_of_day") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const recurrence = String(formData.get("recurrence") ?? "weekly") === "once" ? "once" : "weekly";

  const weekdays = formData
    .getAll("weekdays")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const onDate = String(formData.get("on_date") ?? "").trim() || null;

  // Don't create an empty reminder.
  if (recurrence === "weekly" && weekdays.length === 0) return;
  if (recurrence === "once" && !onDate) return;

  await m.supabase.from("reminders").insert({
    family_id: m.member.family_id,
    title,
    notes,
    kind,
    time_of_day: time,
    recurrence,
    weekdays: recurrence === "weekly" ? weekdays : null,
    on_date: recurrence === "once" ? onDate : null,
    created_by: m.member.id,
  });

  revalidateAll();
}

export async function deleteReminder(formData: FormData) {
  const m = await getMembership();
  if (!m?.member) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await m.supabase.from("reminders").delete().eq("id", id);
  revalidateAll();
}
