"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, Pencil, TriangleAlert } from "lucide-react";
import { useCurrentUser, useQuestionnaire } from "@/hooks/useAuth";
import { getUser } from "@/lib/firebase/db";
import { fetchMatch } from "@/lib/api/matches";
import type { MatchResult } from "@/lib/matching";
import {
  Avatar,
  Card,
  ProgressRing,
  LinkButton,
  Skeleton,
} from "@/components/ui";
import { RadarChart } from "@/components/features/RadarChart";
import { InsightList } from "@/components/features/InsightList";
import { CategoryBreakdown } from "@/components/features/CategoryBreakdown";
import { ConnectButton } from "@/components/features/ConnectButton";
import { ThemeToggle } from "@/components/features/ThemeToggle";
import { formatHostelPrefs, formatRoomTypePrefs } from "@/config/hostels";
import { PERSONA_OPTIONS } from "@/config/questionnaire";
import { formatTime } from "@/lib/utils/format";
import type { Questionnaire, User } from "@/types";

function verdict(score: number) {
  if (score >= 80) return "You'd likely live really well together.";
  if (score >= 60) return "Solid potential — worth a conversation.";
  if (score >= 40) return "Some friction, but workable with effort.";
  return "Quite different lifestyles.";
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-accent-800">
      {children}
    </span>
  );
}

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const me = useCurrentUser();
  const myQ = useQuestionnaire();

  const targetUid = params.id === "me" ? (me?.uid ?? null) : params.id;
  const isSelf = !!me && !!targetUid && targetUid === me.uid;

  const [user, setUser] = useState<User | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!targetUid) return;
      setLoading(true);
      setNotFound(false);
      if (isSelf) {
        setUser(me);
        setMatch(null);
        setLoading(false);
        return;
      }
      const [u, res] = await Promise.all([
        getUser(targetUid),
        fetchMatch(targetUid),
      ]);
      if (!active) return;
      if (!u) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setUser(u);
      setMatch(res);
      setLoading(false);
    }
    void run();
    return () => {
      active = false;
    };
  }, [targetUid, isSelf, me]);

  if (loading) return <ProfileSkeleton />;
  if (notFound || !user)
    return (
      <div className="py-24 text-center text-muted">
        This profile isn&apos;t available.
      </div>
    );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full p-2 text-muted transition-colors hover:bg-sand"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isSelf && (
            <Link
              href="/settings"
              className="rounded-full p-2 text-muted transition-colors hover:bg-sand"
              aria-label="Settings"
            >
              <Settings className="size-5" />
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center text-center">
        <Avatar name={user.fullName} src={user.photoURL} size="xl" ring />
        <h1 className="mt-3 font-display text-2xl font-semibold">
          {user.fullName}
        </h1>
        <p className="text-sm text-muted">Year {user.year}</p>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          <Badge>{formatHostelPrefs(user.hostelPrefs)}</Badge>
          <Badge>{formatRoomTypePrefs(user.roomTypePrefs)}</Badge>
        </div>
        {user.bio && (
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            {user.bio}
          </p>
        )}
      </div>

      {match && (
        <>
          <Card className="mt-6 flex flex-col items-center">
            <ProgressRing
              value={match.overall}
              size={124}
              stroke={11}
              sublabel="compatibility"
            />
            <p className="mt-3 max-w-xs text-center text-sm text-muted">
              {verdict(match.overall)}
            </p>
          </Card>

          {match.dealbreakerFlags.length > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                <span className="font-semibold">
                  Dealbreaker{match.dealbreakerFlags.length > 1 ? "s" : ""}:
                </span>{" "}
                {match.dealbreakerFlags.join(", ")}
              </p>
            </div>
          )}

          <Card className="mt-4">
            <h2 className="mb-1 font-display text-lg font-semibold">
              Compatibility shape
            </h2>
            <RadarChart data={match.radar} />
          </Card>

          <Card className="mt-4">
            <h2 className="mb-4 font-display text-lg font-semibold">
              Category breakdown
            </h2>
            <CategoryBreakdown categories={match.categories} />
          </Card>

          <Card className="mt-4">
            <InsightList
              reasons={match.reasons}
              worthDiscussing={match.worthDiscussing}
              annoyances={match.annoyances}
              conflicts={match.conflicts}
            />
          </Card>

          <div className="mt-5">
            <ConnectButton target={user} />
          </div>
        </>
      )}

      {isSelf && (
        <>
          <Card className="mt-6">
            <h2 className="mb-3 font-display text-lg font-semibold">
              Your snapshot
            </h2>
            {myQ ? (
              <Snapshot q={myQ} />
            ) : (
              <p className="text-sm text-muted">
                Finish onboarding to see your snapshot.
              </p>
            )}
          </Card>
          <div className="mt-4">
            <LinkButton href="/settings" variant="outline" fullWidth size="lg">
              <Pencil className="size-4" /> Edit profile
            </LinkButton>
          </div>
        </>
      )}
    </div>
  );
}

function Snapshot({ q }: { q: Questionnaire }) {
  const personas = q.outingPersona
    .map((p) => PERSONA_OPTIONS.find((o) => o.value === p)?.label)
    .filter(Boolean) as string[];

  const chips = [
    `Sleeps ${formatTime(q.sleep.sleepTime)}`,
    `Wakes ${formatTime(q.sleep.wakeTime)}`,
    `Tidiness ${q.cleanliness.room}/5`,
    q.social.introExtro >= 50 ? "More extrovert" : "More introvert",
    `Fan ${q.temperature.fanSummer}/5 in summer`,
    q.study.mode === "group" ? "Group study" : "Solo study",
    ...personas,
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c, i) => (
        <span
          key={i}
          className="rounded-full bg-sand px-3 py-1.5 text-xs font-medium text-accent-800"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center">
      <Skeleton className="size-24 rounded-full" />
      <Skeleton className="mt-4 h-5 w-40" />
      <Skeleton className="mt-2 h-3 w-28" />
      <Skeleton className="mt-6 h-32 w-full rounded-3xl" />
      <Skeleton className="mt-4 h-56 w-full rounded-3xl" />
    </div>
  );
}
