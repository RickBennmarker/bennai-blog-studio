"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBot,
  IconDashboard,
  IconRadar,
  IconPlus,
  IconDraft,
  IconCalendar,
  IconGlobe,
  IconSettings,
  StatusDot,
} from "./icons";

const NAV = [
  { href: "/", label: "Overzicht", icon: IconDashboard },
  { href: "/kansen", label: "Kansen", icon: IconRadar },
  { href: "/new", label: "Nieuwe post", icon: IconPlus },
  { href: "/drafts", label: "Drafts", icon: IconDraft },
  { href: "/planning", label: "Planning", icon: IconCalendar },
  { href: "/published", label: "Live", icon: IconGlobe },
  { href: "/settings", label: "Instellingen", icon: IconSettings },
];

/** Sidebar: volledig op desktop, icon-rail op mobiel. */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-16 shrink-0 flex-col border-r border-border bg-surface/60 backdrop-blur lg:w-60">
      <div className="border-b border-border px-3 py-6 lg:px-5">
        <Link href="/" className="flex items-center justify-center gap-3 lg:justify-start">
          <span className="agent-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-strong to-accent text-xl text-white">
            <IconBot />
          </span>
          <div className="hidden lg:block">
            <div className="font-display text-[15px] font-bold leading-tight tracking-tight">
              BennAI
            </div>
            <div className="text-xs text-muted">Blog Studio</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-2 lg:p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 lg:justify-start ${
                active
                  ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                  : "text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 lg:p-4">
        <div className="flex items-center justify-center gap-2.5 rounded-xl bg-surface-2 px-2 py-2.5 lg:justify-start lg:px-3">
          <StatusDot active />
          <div className="hidden min-w-0 lg:block">
            <div className="text-xs font-medium text-text">Agent online</div>
            <div className="truncate text-[11px] text-faint">
              Claude schrijft · jij beslist
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
