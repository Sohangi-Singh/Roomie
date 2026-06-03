"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Users, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useInboxBadge } from "@/hooks/useInboxBadge";

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

export function BottomNav() {
  const pathname = usePathname();
  const inboxCount = useInboxBadge();
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 lg:hidden">
      <div className="glass pointer-events-auto flex items-center justify-around rounded-3xl px-2 py-2 shadow-lift ring-1 ring-line">
        {ITEMS.map((it) => {
          const active = pathname.startsWith(it.match);
          const Icon = it.icon;
          const showBadge = it.match === "/connections" && inboxCount > 0;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5"
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-2xl bg-accent-100"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10">
                <Icon
                  className={cn(
                    "size-5",
                    active ? "text-accent-700" : "text-muted",
                  )}
                />
                {showBadge && (
                  <span className="absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-canvas ring-2 ring-canvas">
                    {inboxCount > 9 ? "9+" : inboxCount}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "relative z-10 text-[10px] font-medium",
                  active ? "text-accent-800" : "text-muted",
                )}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
