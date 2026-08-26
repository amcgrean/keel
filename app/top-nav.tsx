"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today" },
  { href: "/calendar", label: "Calendar" },
  { href: "/reminders", label: "Reminders" },
  { href: "/rules", label: "Rules" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 font-mono text-[11px] uppercase tracking-wider">
      {TABS.map((t) => {
        const active = pathname === t.href;
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
