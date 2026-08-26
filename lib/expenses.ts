export type ExpenseRow = {
  id: string;
  created_by: string | null;
  title: string;
  amount: number;
  category: string | null;
  incurred_on: string;
  paid_by: string;
  owed_by: string;
  owed_amount: number;
  status: "pending" | "approved" | "refused" | "settled";
  notes: string | null;
};

export const EXPENSE_CATEGORIES: [string, string][] = [
  ["medical", "🩺 Medical"],
  ["childcare", "🧸 Childcare"],
  ["school", "🏫 School"],
  ["activities", "⚽ Activities"],
  ["clothing", "👕 Clothing"],
  ["other", "📦 Other"],
];

const CATEGORY_EMOJI: Record<string, string> = {
  medical: "🩺",
  childcare: "🧸",
  school: "🏫",
  activities: "⚽",
  clothing: "👕",
  other: "📦",
};

export function categoryEmoji(c: string | null): string {
  return (c && CATEGORY_EMOJI[c]) || "📦";
}

export function money(n: number): string {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

/**
 * Net balance between the two members from all APPROVED (not yet settled)
 * expenses. Returns who owes whom and how much (positive), or null if square.
 */
export function netBalance(
  expenses: ExpenseRow[]
): { ower: string; owee: string; amount: number } | null {
  const byPair: Record<string, number> = {};
  for (const e of expenses) {
    if (e.status !== "approved") continue;
    // owed_by owes owed_amount to paid_by
    const key = `${e.owed_by}->${e.paid_by}`;
    byPair[key] = (byPair[key] ?? 0) + Number(e.owed_amount);
  }
  // Net the two directions between whatever two members appear.
  const entries = Object.entries(byPair);
  const net: Record<string, number> = {}; // member -> signed (positive = is owed)
  for (const [key, amt] of entries) {
    const [ower, owee] = key.split("->");
    net[owee] = (net[owee] ?? 0) + amt;
    net[ower] = (net[ower] ?? 0) - amt;
  }
  const owedMembers = Object.entries(net).filter(([, v]) => Math.abs(v) > 0.005);
  if (owedMembers.length < 2) return null;
  owedMembers.sort((a, b) => a[1] - b[1]); // most negative first (biggest ower)
  const ower = owedMembers[0];
  const owee = owedMembers[owedMembers.length - 1];
  const amount = Math.min(-ower[1], owee[1]);
  if (amount < 0.005) return null;
  return { ower: ower[0], owee: owee[0], amount };
}
