import Link from "next/link";
import { redirect } from "next/navigation";
import { getMembership } from "@/lib/family";
import { signout } from "../login/actions";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/reminders", emoji: "🔔", title: "Reminders", sub: "Daycare drop-off, recurring notes" },
  { href: "/rules", emoji: "🗓️", title: "Schedule rules", sub: "Vacations, holidays, exchange time" },
  { href: "/history", emoji: "🕘", title: "Event history", sub: "Every schedule change, logged" },
];

export default async function MorePage() {
  const m = await getMembership();
  if (!m) redirect("/login");

  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-24">
      <div className="flex items-baseline justify-between mb-5">
        <h1 className="font-display text-xl font-semibold">Keel</h1>
        <form action={signout}>
          <button className="font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-ink">
            Sign out
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3 rounded-card border border-line bg-card shadow-sm px-4 py-3.5 hover:border-ink-faint"
          >
            <span className="text-xl leading-none">{l.emoji}</span>
            <div className="flex-1">
              <div className="text-sm font-semibold">{l.title}</div>
              <div className="text-[11.5px] text-ink-faint">{l.sub}</div>
            </div>
            <span className="text-ink-faint">›</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
