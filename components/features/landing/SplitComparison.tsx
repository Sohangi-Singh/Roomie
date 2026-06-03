"use client";

import { motion } from "framer-motion";
import {
  Gamepad2,
  Volume2,
  PartyPopper,
  Wallet,
  ArrowLeftRight,
  Moon,
  Sparkles,
  BookOpen,
  Compass,
  Coins,
  type LucideIcon,
} from "lucide-react";
import { Card, ProgressRing } from "@/components/ui";
import { palette } from "@/config/tokens";

type Item = { icon: LucideIcon; label: string };

const RANDOM: Item[] = [
  { icon: Gamepad2, label: "Loud games until 5 AM" },
  { icon: Volume2, label: "Reels on speaker" },
  { icon: PartyPopper, label: "Surprise guests every weekend" },
  { icon: Wallet, label: "Sketchy about shared costs" },
  { icon: ArrowLeftRight, label: "Different hobbies" },
];

const ROOMIE: Item[] = [
  { icon: Moon, label: "Same sleep hours" },
  { icon: Sparkles, label: "Keeps the room tidy" },
  { icon: BookOpen, label: "Quiet, focused study time" },
  { icon: Coins, label: "Splits room essentials fairly" },
  { icon: Compass, label: "Same kind of outings" },
];

function PaneList({ items, tone }: { items: Item[]; tone: "bad" | "good" }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <motion.li
          key={it.label}
          initial={{ opacity: 0, x: tone === "bad" ? -8 : 8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{
            delay: 0.18 + i * 0.07,
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="flex items-center gap-2.5 text-sm"
        >
          <span
            className={
              tone === "bad"
                ? "inline-flex size-7 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger"
                : "inline-flex size-7 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success"
            }
          >
            <it.icon className="size-3.5" />
          </span>
          <span className="text-ink">{it.label}</span>
        </motion.li>
      ))}
    </ul>
  );
}

export function SplitComparison() {
  return (
    <div className="space-y-3">
      <motion.div
        initial={{ opacity: 0, x: -18 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="relative pl-4 lg:overflow-hidden">
          <span
            aria-hidden
            className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-danger lg:inset-y-0 lg:w-1.5 lg:rounded-none"
          />
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-danger">
                Random roommate
              </p>
              <p className="mt-1 font-display text-lg font-semibold leading-tight">
                Friction every week.
              </p>
            </div>
            <ProgressRing
              value={32}
              size={62}
              stroke={6}
              sublabel="match"
              color={palette.danger}
            />
          </div>
          <PaneList items={RANDOM} tone="bad" />
        </Card>
      </motion.div>

      <div className="flex items-center gap-3 px-2">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-faint">
          vs
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <motion.div
        initial={{ opacity: 0, x: 18 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{
          duration: 0.55,
          delay: 0.1,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <Card className="relative pl-4 lg:overflow-hidden">
          <span
            aria-hidden
            className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-success lg:inset-y-0 lg:w-1.5 lg:rounded-none"
          />
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-success">
                Roomie match
              </p>
              <p className="mt-1 font-display text-lg font-semibold leading-tight">
                A year that just works.
              </p>
            </div>
            <ProgressRing
              value={94}
              size={62}
              stroke={6}
              sublabel="match"
              color={palette.success}
            />
          </div>
          <PaneList items={ROOMIE} tone="good" />
        </Card>
      </motion.div>
    </div>
  );
}
