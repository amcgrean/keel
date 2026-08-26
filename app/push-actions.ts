"use server";

import { getMembership } from "@/lib/family";

type SubInput = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function subscribeToPush(sub: SubInput): Promise<{ ok: boolean }> {
  const m = await getMembership();
  if (!m?.member) return { ok: false };
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };

  const { error } = await m.supabase.from("push_subscriptions").upsert(
    {
      family_id: m.member.family_id,
      member_id: m.member.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  return { ok: !error };
}

export async function unsubscribeFromPush(endpoint: string): Promise<void> {
  const m = await getMembership();
  if (!m?.member || !endpoint) return;
  await m.supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
