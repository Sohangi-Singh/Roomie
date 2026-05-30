"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Home,
  Compass,
  Star,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { z } from "zod";
import { RequireAuth } from "@/components/features/RequireAuth";
import { QuestionStep } from "@/components/features/QuestionStep";
import { CategoryIcon } from "@/components/features/CategoryIcon";
import { Brand } from "@/components/features/Brand";
import { Button, Input, Textarea, Field, Segmented } from "@/components/ui";
import {
  STEPS,
  CATEGORY_META,
  questionnaireSchema,
} from "@/config/questionnaire";
import { YEARS } from "@/config/college";
import {
  HOSTEL_LIST,
  ROOM_TYPE_LABELS,
  allowedRoomTypes,
} from "@/config/hostels";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useAuthStore } from "@/stores/authStore";
import { saveUser, saveQuestionnaire } from "@/lib/firebase/db";
import type { PublicProfile } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import type {
  Gender,
  HostelId,
  Questionnaire,
  RoomType,
  User as TUser,
  UserProfileInput,
  Year,
} from "@/types";

const PROFILE_STEPS = 2;
const TOTAL = PROFILE_STEPS + STEPS.length;

const profileSchema = z.object({
  fullName: z.string().min(2),
  gender: z.enum(["male", "female"]),
  year: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  hostel: z.enum(["uniworld1", "uniworld2"]),
  roomType: z.enum(["small_double", "large_double", "triple"]),
  contactNumber: z.string().regex(/^\d{10}$/),
  instagram: z.string().optional(),
  bio: z.string().optional(),
});

const slide: Variants = {
  enter: (d: number) => ({ x: d > 0 ? 36 : -36, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -36 : 36, opacity: 0 }),
};

function validateStep(step: number, p: Partial<UserProfileInput>): boolean {
  if (step === 0)
    return Boolean(
      p.fullName && p.fullName.trim().length >= 2 && p.gender && p.year,
    );
  if (step === 1)
    return Boolean(
      p.hostel &&
        p.roomType &&
        p.contactNumber &&
        /^\d{10}$/.test(p.contactNumber),
    );
  return true;
}

export default function OnboardingPage() {
  return (
    <RequireAuth requireOnboarded={false}>
      <OnboardingFlow />
    </RequireAuth>
  );
}

function OnboardingFlow() {
  const router = useRouter();
  const fbUser = useAuthStore((s) => s.fbUser);
  const existingUser = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    step,
    profile,
    answers,
    editMode,
    init,
    setStep,
    next,
    prev,
    updateProfile,
    updateAnswers,
    reset,
  } = useOnboardingStore();

  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fbUser) return;
    init(fbUser.uid);
    if (!profile.fullName && fbUser.displayName) {
      updateProfile({ fullName: fbUser.displayName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbUser]);

  useEffect(() => {
    if (!editMode && existingUser?.onboarded) router.replace("/matches");
  }, [editMode, existingUser, router]);

  const isLast = step === TOTAL - 1;
  const progress = ((step + 1) / TOTAL) * 100;
  const canAdvance = useMemo(
    () => validateStep(step, profile),
    [step, profile],
  );

  const meta = useMemo<{ icon: ReactNode; title: string; subtitle: string }>(() => {
    if (step === 0)
      return {
        icon: <User className="size-5" />,
        title: "About you",
        subtitle: "The basics other students will see.",
      };
    if (step === 1)
      return {
        icon: <Home className="size-5" />,
        title: "Where you'll stay",
        subtitle: "Your hostel and room preference.",
      };
    const s = STEPS[step - PROFILE_STEPS];
    let icon: ReactNode = <Sparkles className="size-5" />;
    if (s.kind === "category")
      icon = (
        <CategoryIcon name={CATEGORY_META[s.category].icon} className="size-5" />
      );
    else if (s.kind === "persona") icon = <Compass className="size-5" />;
    else if (s.kind === "importance") icon = <Star className="size-5" />;
    else if (s.kind === "dealbreakers") icon = <ShieldAlert className="size-5" />;
    return { icon, title: s.title, subtitle: s.subtitle };
  }, [step]);

  const goNext = () => {
    setError(null);
    if (isLast) {
      void handleFinish();
      return;
    }
    setDirection(1);
    next();
  };

  const goPrev = () => {
    setError(null);
    if (step === 0) {
      router.push("/");
      return;
    }
    setDirection(-1);
    prev();
  };

  async function handleFinish() {
    if (!fbUser || !answers) return;
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      setStep(0);
      setError("Please complete your profile details.");
      return;
    }
    setSubmitting(true);
    try {
      const now = Date.now();
      const p = parsed.data;
      const user: TUser = {
        uid: fbUser.uid,
        email: fbUser.email ?? "",
        fullName: p.fullName,
        year: p.year,
        gender: p.gender,
        hostel: p.hostel,
        roomType: p.roomType,
        contactNumber: p.contactNumber,
        onboarded: true,
        createdAt: now,
        updatedAt: now,
        ...(p.instagram ? { instagram: p.instagram } : {}),
        ...(p.bio ? { bio: p.bio } : {}),
      };
      const q: Questionnaire = { ...answers, uid: fbUser.uid, completedAt: now };
      if (!questionnaireSchema.safeParse(q).success) {
        setError("Something's off with your answers. Please review.");
        setSubmitting(false);
        return;
      }
      const profileSnapshot: PublicProfile = {
        uid: fbUser.uid,
        fullName: user.fullName,
        year: user.year,
        gender: user.gender,
        hostel: user.hostel,
        roomType: user.roomType,
        ...(user.photoURL ? { photoURL: user.photoURL } : {}),
        ...(user.bio ? { bio: user.bio } : {}),
      };
      await saveUser(user);
      await saveQuestionnaire(q, profileSnapshot);
      setAuth({ user, questionnaire: q, status: "authed" });
      reset();
      router.replace("/matches");
    } catch {
      setError("Couldn't save. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  let content: ReactNode = null;
  if (step === 0)
    content = <IdentityStep profile={profile} update={updateProfile} />;
  else if (step === 1)
    content = <LivingStep profile={profile} update={updateProfile} />;
  else if (answers)
    content = (
      <QuestionStep
        step={STEPS[step - PROFILE_STEPS]}
        answers={answers}
        onChange={updateAnswers}
      />
    );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5">
      <header className="sticky top-0 z-10 -mx-5 bg-canvas/85 px-5 pb-3 pt-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-full p-2 text-muted transition-colors hover:bg-sand"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-xs font-medium text-muted">
            {step + 1} / {TOTAL}
          </span>
          <Brand size="sm" />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent-100">
          <motion.div
            className="h-full rounded-full bg-accent-500"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </header>

      <div className="flex-1 overflow-x-hidden py-6">
        <div className="mb-6 flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
            {meta.icon}
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold leading-tight">
              {meta.title}
            </h1>
            <p className="mt-1 text-sm text-muted">{meta.subtitle}</p>
          </div>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="sticky bottom-0 -mx-5 bg-canvas/85 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur">
        {error && (
          <p className="mb-2 text-center text-xs text-danger">{error}</p>
        )}
        <Button
          fullWidth
          size="lg"
          onClick={goNext}
          loading={submitting}
          disabled={!canAdvance}
        >
          {isLast ? (
            <>
              Finish <Check className="size-4" />
            </>
          ) : (
            <>
              Continue <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </footer>
    </main>
  );
}

/* --------------------------- profile steps ------------------------------ */

function IdentityStep({
  profile,
  update,
}: {
  profile: Partial<UserProfileInput>;
  update: (p: Partial<UserProfileInput>) => void;
}) {
  return (
    <div className="space-y-6">
      <Field label="Full name">
        <Input
          value={profile.fullName ?? ""}
          onChange={(e) => update({ fullName: e.target.value })}
          placeholder="Your name"
        />
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium">Gender</p>
        <Segmented
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
          value={profile.gender ?? ""}
          onChange={(v) =>
            update({ gender: v as Gender, roomType: undefined })
          }
        />
        <p className="mt-1.5 text-xs text-faint">
          Matches are kept within your own gender.
        </p>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Year</p>
        <Segmented
          options={YEARS.map((y) => ({ value: String(y), label: `Year ${y}` }))}
          value={profile.year ? String(profile.year) : ""}
          onChange={(v) => update({ year: Number(v) as Year })}
        />
      </div>
    </div>
  );
}

function LivingStep({
  profile,
  update,
}: {
  profile: Partial<UserProfileInput>;
  update: (p: Partial<UserProfileInput>) => void;
}) {
  const gender = profile.gender;
  const hostel = profile.hostel;
  const allowed: RoomType[] =
    gender && hostel ? allowedRoomTypes(hostel, gender) : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium">Hostel</p>
        <Segmented
          options={HOSTEL_LIST.map((h) => ({
            value: h.id,
            label: `${h.name} · ${h.alias}`,
          }))}
          value={hostel ?? ""}
          onChange={(v) => {
            const h = v as HostelId;
            const opts = gender ? allowedRoomTypes(h, gender) : [];
            update({
              hostel: h,
              roomType:
                profile.roomType && opts.includes(profile.roomType)
                  ? profile.roomType
                  : opts[0],
            });
          }}
        />
      </div>

      {hostel && gender && (
        <div>
          <p className="mb-2 text-sm font-medium">Room type</p>
          <div className="grid gap-2">
            {allowed.map((rt) => {
              const selected = profile.roomType === rt;
              return (
                <button
                  key={rt}
                  type="button"
                  onClick={() => update({ roomType: rt })}
                  className={cn(
                    "flex items-center justify-between rounded-2xl p-4 text-left text-sm font-medium transition-colors",
                    selected
                      ? "bg-accent-500 text-canvas"
                      : "bg-surface shadow-soft ring-1 ring-line",
                  )}
                >
                  {ROOM_TYPE_LABELS[rt]}
                  {selected && <Check className="size-4" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Field label="Contact number" hint="Shared only after you both connect.">
        <Input
          type="tel"
          inputMode="numeric"
          value={profile.contactNumber ?? ""}
          onChange={(e) =>
            update({
              contactNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
            })
          }
          placeholder="10-digit number"
        />
      </Field>
      <Field label="Instagram (optional)">
        <Input
          value={profile.instagram ?? ""}
          onChange={(e) => update({ instagram: e.target.value })}
          placeholder="@username"
        />
      </Field>
      <Field label="Short bio (optional)">
        <Textarea
          value={profile.bio ?? ""}
          onChange={(e) => update({ bio: e.target.value })}
          placeholder="A line about you…"
          maxLength={160}
        />
      </Field>
    </div>
  );
}
