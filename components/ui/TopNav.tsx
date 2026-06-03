"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Users, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useInboxBadge } from "@/hooks/useInboxBadge";
import { Brand } from "@/components/features/Brand";
import { ThemeToggle } from "@/components/features/ThemeToggle";

const ITEMS = [
  { href: "/matches", label: "Matches", icon: Sparkles, match: "/matches" },
  { href: "/groups", label: "Groups", icon: Users, match: "/groups" },
  {
    href: "/connections",
    label: "DMs",
    icon: MessageCircle,
    match: "/connections",
  },
  { href: "/profile/me", label: "Profile", icon: User, match: "/profile" },
];

/** Desktop top nav. Hidden on mobile/tablet (`lg:` and up only) — the
 *  BottomNav handles those breakpoints. */
export function TopNav() {
  const pathname = usePathname();
  const inboxCount = useInboxBadge();

  return (
    <nav className="pointer-events-none fixed inset-x-0 top-0 z-30 hidden px-6 pt-4 lg:block">
      <div className="glass pointer-events-auto mx-auto flex max-w-5xl items-center gap-4 rounded-3xl px-4 py-2.5 shadow-card ring-1 ring-line">
        <Link href="/matches" className="shrink-0">
          <Brand size="sm" />
        </Link>
        <div className="flex flex-1 items-center justify-center gap-1">
          {ITEMS.map((it) => {
            const active = pathname.startsWith(it.match);
            const Icon = it.icon;
            const showBadge =
              it.match === "/connections" && inboxCount > 0;
            return (
              <Link
                key={it.href}
                href={it.href}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium"
              >
                {active && (
                  <motion.span
                    layoutId="topnav-pill"
                    className="absolute inset-0 rounded-2xl bg-accent-100"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 32,
                    }}
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <span className="relative">
                    <Icon
                      className={cn(
                        "size-4",
                        active ? "text-accent-700" : "text-muted",
                      )}
                    />
                    {showBadge && (
                      <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-canvas ring-2 ring-canvas">
                        {inboxCount > 9 ? "9+" : inboxCount}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      active ? "text-accent-800" : "text-muted",
                    )}
                  >
                    {it.label}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
        <ThemeToggle className="shrink-0" />
      </div>
    </nav>
  );
}
