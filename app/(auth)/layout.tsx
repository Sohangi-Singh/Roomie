import Link from "next/link";
import { ArrowLeft, Check, UsersRound } from "lucide-react";
import { Brand } from "@/components/features/Brand";
import { ThemeToggle } from "@/components/features/ThemeToggle";

const PERKS = [
  "Match on lifestyle, not luck",
  "Same-gender, same-college only",
  "Your contact stays private until you share it",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // On mobile this wrapper is a plain block, so <main> renders exactly as
    // before. On lg it becomes a two-column split with a brand panel.
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-2">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden overflow-hidden bg-accent-500 p-12 text-canvas lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_0%,rgba(255,255,255,0.16),transparent_60%)]"
        />
        <Link href="/" className="relative inline-flex items-center gap-2.5">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-canvas/15 ring-1 ring-canvas/20">
            <UsersRound className="size-5" />
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight">
            Roomie
          </span>
        </Link>
        <div className="relative">
          <h2 className="font-display text-4xl font-semibold leading-tight">
            Find the roommate you wish you&apos;d been assigned.
          </h2>
          <ul className="mt-8 space-y-3">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-accent-100">
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-canvas/15">
                  <Check className="size-3.5" />
                </span>
                <span className="text-[15px]">{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-accent-100/80">
          © 2026 Sohangi Singh · All rights reserved.
        </p>
      </aside>

      {/* Form side — unchanged on mobile, centered column on desktop */}
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 lg:max-w-lg lg:px-10">
        <header className="flex items-center justify-between pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" /> Home
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Brand here on mobile; hidden on desktop where the left panel shows it */}
            <span className="lg:hidden">
              <Brand size="sm" />
            </span>
          </div>
        </header>
        <div className="flex flex-1 flex-col justify-center py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
