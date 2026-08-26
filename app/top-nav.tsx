"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today", match: (p: string) => p === "/" || p.startsWith("/day") },
  { href: "/calendar", label: "Calendar", match: (p: string) => p.startsWith("/calendar") },
  { href: "/expenses", label: "Expenses", match: (p: string) => p.startsWith("/expenses") },
  {
    href: "/more",
    label: "More",
    match: (p: string) =>
      p.startsWith("/more") ||
      p.startsWith("/reminders") ||
      p.startsWith("/rules") ||
      p.startsWith("/history"),
  },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 font-mono text-[11px] uppercase tracking-wider">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-2.5 py-1 rounded-sm ${
              active ? "bg-ink text-white" : "text-ink-faint hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
