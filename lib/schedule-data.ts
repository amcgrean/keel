import { getMembership } from "@/lib/family";
import type { ScheduleInputs, ParentId } from "@/lib/schedule-engine";
import type { ReminderRow } from "@/lib/reminders";
import { createClient } from "@/lib/supabase/server";

export type Member = { id: string; display_name: string; color: string | null };
export type Pattern = { id: string; label: string; cycle: ParentId[]; anchor_date: string };
export type Exception = { id: string; date: string; parent_id: string; reason: string | null };

type Supa = Awaited<ReturnType<typeof createClient>>;

export type ScheduleData =
  | { state: "no-auth" }
  | { state: "no-family" }
  | { state: "no-pattern"; supabase: Supa; familyId: string; meMemberId: string; members: Member[] }
  | {
      state: "ok";
      supabase: Supa;
      familyId: string;
      meMemberId: string;
      members: Member[];
      pattern: Pattern;
      exceptions: Exception[];
      reminders: ReminderRow[];
      inputs: ScheduleInputs;
    };

/**
 * Single source of truth for "who has Patrick" data: resolves the logged-in
 * user's family, members, active rotation and exceptions, and assembles the
 * ScheduleInputs the engine needs. Both the dashboard and the calendar call
 * this so they can never render different schedules.
 */
export async function getScheduleData(): Promise<ScheduleData> {
  const m = await getMembership();
  if (!m) return { state: "no-auth" };
  if (!m.member) return { state: "no-family" };

  const { supabase } = m;
  const familyId = m.member.family_id;
  const meMemberId = m.member.id;

  const [membersRes, patternRes, exceptionsRes, remindersRes] = await Promise.all([
    supabase
      .from("family_members")
      .select("id, display_name, color")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true }),
    supabase
      .from("schedule_patterns")
      .select("id, label, cycle, anchor_date")
      .eq("family_id", familyId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("schedule_exceptions")
      .select("id, date, parent_id, reason")
      .eq("family_id", familyId),
    // Reminders table may not exist until its migration is applied; a failed
    // query just yields null data, which we treat as "no reminders yet".
    supabase
      .from("reminders")
      .select("id, title, notes, kind, time_of_day, recurrence, weekdays, on_date")
      .eq("family_id", familyId)
      .eq("active", true),
  ]);

  const members = (membersRes.data ?? []) as Member[];
  const pattern = patternRes.data as Pattern | null;
  const exceptions = (exceptionsRes.data ?? []) as Exception[];
  const reminders = (remindersRes.data ?? []) as ReminderRow[];

  if (!pattern) return { state: "no-pattern", supabase, familyId, meMemberId, members };

  const inputs: ScheduleInputs = {
    pattern: { cycle: pattern.cycle, anchorDate: pattern.anchor_date },
    exceptions: exceptions.map((e) => ({
      id: e.id,
      date: e.date,
      parentId: e.parent_id,
      reason: e.reason ?? undefined,
    })),
  };

  return {
    state: "ok",
    supabase,
    familyId,
    meMemberId,
    members,
    pattern,
    exceptions,
    reminders,
    inputs,
  };
}

/** Stable colour-slot + label maps for a family's members. */
export function memberMaps(members: Member[]) {
  const COLOR = ["bg-parentA", "bg-parentB"] as const;
  const label: Record<string, string> = Object.fromEntries(
    members.map((m) => [m.id, m.display_name])
  );
  const color: Record<string, string> = Object.fromEntries(
    members.map((m, i) => [m.id, COLOR[i] ?? "bg-parentA"])
  );
  return {
    labelFor: (id: string) => label[id] ?? "?",
    colorFor: (id: string) => color[id] ?? "bg-parentA",
  };
}
