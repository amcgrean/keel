"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" />
    </svg>
  );
}
function DollarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor" stroke="none" fontFamily="sans-serif">$</text>
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Today", Icon: HomeIcon, match: (p: string) => p === "/" || p.startsWith("/day") },
  { href: "/calendar", label: "Calendar", Icon: CalIcon, match: (p: string) => p.startsWith("/calendar") },
  { href: "/expenses", label: "Expenses", Icon: DollarIcon, match: (p: string) => p.startsWith("/expenses") },
  {
    href: "/more",
    label: "More",
    Icon: MoreIcon,
    match: (p: string) =>
      p.startsWith("/more") ||
      p.startsWith("/reminders") ||
      p.startsWith("/rules") ||
      p.startsWith("/history"),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-card/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-md flex">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const { Icon } = t;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 flex flex-col items-center gap-0.5 pt-2 pb-2.5 ${
                active ? "text-ink" : "text-ink-faint"
              }`}
            >
              <Icon />
              <span className="text-[10px] font-medium tracking-wide">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
