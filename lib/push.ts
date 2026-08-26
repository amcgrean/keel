import webpush from "web-push";
import type { Membership } from "@/lib/family";

let configured: boolean | null = null;

/** Configure web-push once from env. Returns false if VAPID keys aren't set,
 *  in which case push is simply disabled (no-op). */
function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:noreply@keel.app";
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

type PushPayload = { title: string; body: string; url?: string };

/** Best-effort web push to every device of the given members. Expired
 *  subscriptions (404/410) are pruned. Never throws. */
export async function sendPushToMembers(
  supabase: Membership["supabase"],
  familyId: string,
  memberIds: string[],
  payload: PushPayload
): Promise<void> {
  if (!ensureConfigured() || memberIds.length === 0) return;

  const { data } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("family_id", familyId)
    .in("member_id", memberIds);

  const subs = (data ?? []) as {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }[];
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    })
  );
}
