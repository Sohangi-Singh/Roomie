"use client";

import { Sparkles, SearchX, RefreshCw } from "lucide-react";
import { useMatches } from "@/hooks/useMatches";
import { useCurrentUser } from "@/hooks/useAuth";
import { MatchList } from "@/components/features/MatchList";
import { EmptyState } from "@/components/features/EmptyState";
import { SkeletonCard, LinkButton } from "@/components/ui";

export default function MatchesPage() {
  const me = useCurrentUser();
  const { loading, matches, error, refresh, refreshing } = useMatches();
  const firstName = me?.fullName?.split(" ")[0] ?? "there";

  return (
    <div>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Hey {firstName} 👋</p>
          <h1 className="font-display text-3xl font-semibold">Your matches</h1>
          <p className="mt-1 text-sm text-muted">
            Sorted by how well you&apos;d live together.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          aria-label="Refresh matches"
          className="mt-1 rounded-full p-2 text-muted transition-colors hover:bg-sand disabled:opacity-50"
        >
          <RefreshCw className={refreshing ? "size-5 animate-spin" : "size-5"} />
        </button>
      </header>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <EmptyState
          icon={SearchX}
          title="Couldn't load matches"
          body={error}
        />
      )}

      {!loading && !error && matches.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="No matches yet"
          body="As more students in your college finish their profiles, your matches will show up here."
          action={
            <LinkButton href="/explore" variant="secondary">
              Explore everyone
            </LinkButton>
          }
        />
      )}

      {!loading && matches.length > 0 && <MatchList matches={matches} />}
    </div>
  );
}
