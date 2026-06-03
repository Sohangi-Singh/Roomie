"use client";

import { useMemo, useState } from "react";
import {
  Sparkles,
  SearchX,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { useMatches, type RankedMatch } from "@/hooks/useMatches";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useFilterStore,
  DEFAULT_FILTERS,
  type ExploreFilters,
} from "@/stores/filterStore";
import { MatchList } from "@/components/features/MatchList";
import { EmptyState } from "@/components/features/EmptyState";
import { FilterSheet } from "@/components/features/FilterSheet";
import { ThemeToggle } from "@/components/features/ThemeToggle";
import { BottomSheet, SkeletonCard, Button } from "@/components/ui";
function passes(m: RankedMatch, f: ExploreFilters): boolean {
  const { user, facets, result } = m;
  if (f.year !== "any" && user.year !== f.year) return false;
  if (f.hostel !== "any" && !user.hostelPrefs.includes(f.hostel)) return false;
  if (f.roomType !== "any" && !user.roomTypePrefs.includes(f.roomType))
    return false;
  if (f.sleep !== "any" && facets.sleep !== f.sleep) return false;
  if (f.cleanliness === "relaxed" && facets.cleanliness !== "relaxed")
    return false;
  if (f.cleanliness === "tidy" && facets.cleanliness !== "tidy") return false;
  if (f.spending !== "any" && facets.spending !== f.spending) return false;
  if (
    f.personas.length > 0 &&
    !f.personas.some((p) => facets.personas.includes(p))
  )
    return false;
  if (result.overall < f.minScore) return false;
  return true;
}

function countActive(f: ExploreFilters): number {
  let n = 0;
  if (f.year !== "any") n++;
  if (f.hostel !== "any") n++;
  if (f.roomType !== "any") n++;
  if (f.sleep !== "any") n++;
  if (f.cleanliness !== "any") n++;
  if (f.spending !== DEFAULT_FILTERS.spending) n++;
  if (f.personas.length > 0) n++;
  if (f.minScore > 0) n++;
  return n;
}

export default function MatchesPage() {
  const me = useCurrentUser();
  const { loading, matches, error, refresh, refreshing } = useMatches();
  const filters = useFilterStore((s) => s.filters);
  const resetFilters = useFilterStore((s) => s.reset);
  const [sheetOpen, setSheetOpen] = useState(false);

  const firstName = me?.fullName?.split(" ")[0] ?? "there";

  const filtered = useMemo(
    () => matches.filter((m) => passes(m, filters)),
    [matches, filters],
  );
  const active = countActive(filters);
  const filterKey = JSON.stringify(filters);

  return (
    <div>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">Hey {firstName} 👋</p>
          <h1 className="font-display text-3xl font-semibold">Your matches</h1>
          <p className="mt-1 text-sm text-muted">
            {loading
              ? "Sorted by how well you'd live together."
              : `${filtered.length} ${
                  filtered.length === 1 ? "person" : "people"
                }`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle className="mt-1" />
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Open filters"
            className="relative mt-1 inline-flex size-9 items-center justify-center rounded-full text-muted ring-1 ring-line transition-colors hover:bg-sand hover:text-ink"
          >
            <SlidersHorizontal className="size-4" />
            {active > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-canvas ring-2 ring-canvas">
                {active}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh matches"
            className="mt-1 rounded-full p-2 text-muted transition-colors hover:bg-sand disabled:opacity-50"
          >
            <RefreshCw
              className={refreshing ? "size-5 animate-spin" : "size-5"}
            />
          </button>
        </div>
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

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title={
            active > 0 ? "No one matches these filters" : "No matches yet"
          }
          body={
            active > 0
              ? "Try widening your filters to see more people."
              : "As more students in your college finish their profiles, your matches will show up here."
          }
          action={
            active > 0 ? (
              <Button variant="secondary" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <MatchList key={filterKey} matches={filtered} />
      )}

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
      >
        <FilterSheet onClose={() => setSheetOpen(false)} />
      </BottomSheet>
    </div>
  );
}
