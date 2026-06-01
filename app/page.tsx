"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Users,
  ShieldCheck,
  HeartHandshake,
  ClipboardList,
  Check,
} from "lucide-react";
import { Brand } from "@/components/features/Brand";
import { ThemeToggle } from "@/components/features/ThemeToggle";
import { LinkButton, Card } from "@/components/ui";
import { RotatingStat } from "@/components/features/landing/RotatingStat";
import { SplitComparison } from "@/components/features/landing/SplitComparison";
import { FloatingTags } from "@/components/features/landing/FloatingTags";
import { MatchPreview } from "@/components/features/landing/MatchPreview";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const STEPS = [
  {
    icon: ClipboardList,
    title: "Answer a calm questionnaire",
    body: "Sliders and chips — no boring forms. Tell us about your sleep, study, noise, and habits.",
  },
  {
    icon: Sparkles,
    title: "See real compatibility",
    body: "We score every potential roommate and show you exactly why you match — and where you might clash.",
  },
  {
    icon: HeartHandshake,
    title: "Connect when it's mutual",
    body: "Form a group or find one more roommate. Share contact only when you both want to.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative mx-auto min-h-dvh max-w-md overflow-hidden px-5 pb-12">
      {/* soft ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(120%_80%_at_50%_0%,var(--color-accent-100),transparent_70%)]"
      />

      {/* top bar */}
      <header className="relative flex items-center justify-between pt-6">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="px-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Log in
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative pt-12">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-medium text-accent-700 shadow-soft ring-1 ring-line">
            <Sparkles className="size-3.5" /> For hostel students
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mt-5 font-display text-[2.4rem] font-semibold leading-[1.05] tracking-tight">
            <span className="italic text-accent-600">Roommate</span>
            {" "}allocation doesn&apos;t have to be random.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-5 inline-block rounded-2xl bg-accent-100 px-3.5 py-2 font-display text-lg italic leading-snug text-accent-800">
            Match on lifestyle, not luck.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Everything from sleep to willingness to chip in for shared room
            essentials — we compare what actually matters.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-7 flex flex-col gap-3">
            <LinkButton href="/signup" size="lg" fullWidth>
              Get started <ArrowRight className="size-4" />
            </LinkButton>
            <LinkButton href="/login" variant="ghost" size="lg" fullWidth>
              I already have an account
            </LinkButton>
          </div>
        </Reveal>
      </section>

      {/* rotating "did you know" stat */}
      <section className="relative pt-16">
        <RotatingStat />
      </section>

      {/* split-screen comparison */}
      <section className="relative pt-16">
        <Reveal>
          <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">
            The roommate gap
          </p>
          <h2 className="mb-5 text-center font-display text-2xl font-semibold leading-tight">
            One year. Two very different stories.
          </h2>
        </Reveal>
        <SplitComparison />
      </section>

      {/* floating lifestyle tags */}
      <section className="relative pt-16">
        <Reveal>
          <h2 className="font-display text-xl font-semibold">
            Find your kind of people.
          </h2>
          <p className="mt-1 text-sm text-muted">
            Sleep, study, spending, outings — we line it all up.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-4">
          <FloatingTags />
        </Reveal>
      </section>

      {/* how it works */}
      <section className="relative pt-16">
        <Reveal>
          <h2 className="font-display text-xl font-semibold">How it works</h2>
        </Reveal>
        <div className="mt-5 space-y-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <Card className="flex gap-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-500 text-canvas shadow-soft">
                  <s.icon className="size-5" />
                </span>
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {s.body}
                  </p>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* trust */}
      <section className="relative pt-16">
        <Reveal>
          <Card variant="sand" className="text-center">
            <ShieldCheck className="mx-auto size-7 text-accent-600" />
            <h2 className="mt-3 font-display text-xl font-semibold">
              Calm by design
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
              No public reviews. No toxic feeds. No ranking people. Just a
              private, respectful way to find someone you&apos;ll live well
              with.
            </p>
            <ul className="mx-auto mt-4 flex max-w-xs flex-col gap-2 text-left text-sm">
              {[
                "Same-gender, same-college matching",
                "Your contact stays private until you share it",
                "Dealbreakers are respected, not ignored",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-success" />
                  <span className="text-muted">{t}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      </section>

      {/* a peek at a match (moved Aanya card) */}
      <section className="relative pt-16">
        <Reveal>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">
            A peek inside
          </p>
          <h2 className="font-display text-xl font-semibold">
            What a match looks like.
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="mt-4">
          <MatchPreview />
        </Reveal>
      </section>

      {/* final CTA */}
      <section className="relative pt-16">
        <Reveal>
          <div className="rounded-4xl bg-accent-500 p-8 text-center text-canvas shadow-card">
            <Users className="mx-auto size-7 opacity-90" />
            <h2 className="mt-3 font-display text-2xl font-semibold">
              Your best year starts with the right roommate.
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-accent-100">
              Set up your profile in a few minutes.
            </p>
            <div className="mt-6">
              <LinkButton
                href="/signup"
                variant="outline"
                size="lg"
                fullWidth
                className="bg-canvas"
              >
                Create my profile <ArrowRight className="size-4" />
              </LinkButton>
            </div>
          </div>
        </Reveal>
      </section>

      {/* footer */}
      <footer className="relative mt-16 flex flex-col items-center gap-2 text-center">
        <Brand size="sm" />
        <p className="font-display text-sm italic text-muted">
          Find the roommate you wish you&apos;d been assigned.
        </p>
        <p className="mt-3 text-[10px] font-medium tracking-wide text-faint">
          © 2026 Sohangi Singh · All rights reserved.
        </p>
      </footer>
    </main>
  );
}
