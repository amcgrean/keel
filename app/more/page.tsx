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
      <h1 className="font-display text-xl font-semibold mb-5">Keel</h1>

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

      <section className="mt-8">
        <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint mb-2">
          Account
        </div>
        <div className="rounded-card border border-line bg-card shadow-sm p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{m.email ?? "Signed in"}</div>
            <div className="text-[11.5px] text-ink-faint">You&apos;re signed in.</div>
          </div>
          <form action={signout}>
            <button className="rounded-sm border border-line px-3.5 py-2 text-sm hover:border-ink-faint">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
