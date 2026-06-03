"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, SearchX } from "lucide-react";
import { useMatches, type RankedMatch } from "@/hooks/useMatches";
import { useFilterStore, type ExploreFilters } from "@/stores/filterStore";
import { MatchList } from "@/components/features/MatchList";
import { EmptyState } from "@/components/features/EmptyState";
import { FilterSheet } from "@/components/features/FilterSheet";
import { BottomSheet, SkeletonCard, Button } from "@/components/ui";

function passes(m: RankedMatch, f: ExploreFilters): boolean {
  const { user, facets, result } = m;
  if (f.year !== "any" && user.year !== f.year) return false;
  if (f.hostel !== "any" && !user.hostelPrefs.includes(f.hostel)) return false;
  if (f.roomType !== "any" && !user.roomTypePrefs.includes(f.roomType))
    return false;
  if (f.sleep !== "any" && facets.sleep !== f.sleep) return false;
  if (f.cleanliness === "relaxed" && facets.cleanliness !== "relaxed") return false;
  if (f.cleanliness === "tidy" && facets.cleanliness !== "tidy") return false;
  if (f.spending !== "any" && facets.spending !== f.spending) return false;
  if (f.personas.length > 0 && !f.personas.some((p) => facets.personas.includes(p)))
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
  if (f.spending !== "any") n++;
  if (f.personas.length > 0) n++;
  if (f.minScore > 0) n++;
  return n;
}

export default function ExplorePage() {
  const { loading, matches } = useMatches();
  const filters = useFilterStore((s) => s.filters);
  const resetFilters = useFilterStore((s) => s.reset);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () => matches.filter((m) => passes(m, filters)),
    [matches, filters],
  );
  const active = countActive(filters);
  const filterKey = JSON.stringify(filters);

  return (
    <div>
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Explore</h1>
          <p className="mt-1 text-sm text-muted">
            {loading
              ? "Finding people…"
              : `${filtered.length} ${
                  filtered.length === 1 ? "person" : "people"
                }`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <SlidersHorizontal className="size-4" /> Filters
          {active > 0 && (
            <span className="ml-1 rounded-full bg-accent-500 px-1.5 text-[10px] font-semibold text-canvas">
              {active}
            </span>
          )}
        </Button>
      </header>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="No one matches these filters"
          body="Try widening your filters to see more people."
          action={
            <Button variant="secondary" onClick={resetFilters}>
              Clear filters
            </Button>
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <MatchList key={filterKey} matches={filtered} />
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Filters">
        <FilterSheet onClose={() => setOpen(false)} />
      </BottomSheet>
    </div>
  );
}
