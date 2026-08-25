import { createClient } from "@/lib/supabase/server";

export type Membership = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  member: { id: string; family_id: string } | null;
};

/**
 * Resolves the logged-in user and their family_member row (if any).
 * Returns null only when there's no authenticated user — a signed-in user
 * with no family comes back as { member: null } so callers can tell the two
 * cases apart (redirect to login vs. show an onboarding empty state).
 */
export async function getMembership(): Promise<Membership | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("family_members")
    .select("id, family_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return {
    supabase,
    userId: user.id,
    member: (member as { id: string; family_id: string } | null) ?? null,
  };
}
