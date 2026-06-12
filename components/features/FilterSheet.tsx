"use client";

import { Segmented, Chip, Slider, Button } from "@/components/ui";
import { useFilterStore, type ExploreFilters } from "@/stores/filterStore";
import { HOSTEL_LIST, ROOM_TYPE_LABELS } from "@/config/hostels";
import { YEARS, BATCH_BY_YEAR } from "@/config/college";
import { PERSONA_OPTIONS } from "@/config/questionnaire";
import type { HostelId, RoomType, Year } from "@/types";

const SPENDING: { value: ExploreFilters["spending"]; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "budget", label: "Budget" },
  { value: "moderate", label: "Moderate" },
  { value: "premium", label: "Premium" },
];

const ROOMS: RoomType[] = ["small_double", "large_double", "triple"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

export function FilterSheet({ onClose }: { onClose: () => void }) {
  const { filters, setFilters, reset } = useFilterStore();

  return (
    <div className="space-y-6 pb-2">
      <Row label="Batch">
        <Segmented
          size="sm"
          options={[
            { value: "any", label: "Any" },
            ...YEARS.map((y) => ({
              value: String(y),
              label: String(BATCH_BY_YEAR[y]),
            })),
          ]}
          value={String(filters.year)}
          onChange={(v) =>
            setFilters({ year: v === "any" ? "any" : (Number(v) as Year) })
          }
        />
      </Row>

      <Row label="Hostel">
        <Segmented
          size="sm"
          options={[
            { value: "any", label: "Any" },
            ...HOSTEL_LIST.map((h) => ({ value: h.id, label: h.alias })),
          ]}
          value={filters.hostel}
          onChange={(v) => setFilters({ hostel: v as HostelId | "any" })}
        />
      </Row>

      <Row label="Room type">
        <div className="flex flex-wrap gap-2">
          <Chip
            selected={filters.roomType === "any"}
            onClick={() => setFilters({ roomType: "any" })}
          >
            Any
          </Chip>
          {ROOMS.map((rt) => (
            <Chip
              key={rt}
              selected={filters.roomType === rt}
              onClick={() => setFilters({ roomType: rt })}
            >
              {ROOM_TYPE_LABELS[rt]}
            </Chip>
          ))}
        </div>
      </Row>

      <Row label="Sleep schedule">
        <Segmented
          size="sm"
          options={[
            { value: "any", label: "Any" },
            { value: "early", label: "Early" },
            { value: "late", label: "Late" },
          ]}
          value={filters.sleep}
          onChange={(v) => setFilters({ sleep: v as ExploreFilters["sleep"] })}
        />
      </Row>

      <Row label="Cleanliness">
        <Segmented
          size="sm"
          options={[
            { value: "any", label: "Any" },
            { value: "relaxed", label: "Relaxed" },
            { value: "tidy", label: "Tidy" },
          ]}
          value={filters.cleanliness}
          onChange={(v) =>
            setFilters({ cleanliness: v as ExploreFilters["cleanliness"] })
          }
        />
      </Row>

      <Row label="Spending">
        <div className="flex flex-wrap gap-2">
          {SPENDING.map((s) => (
            <Chip
              key={s.value}
              selected={filters.spending === s.value}
              onClick={() => setFilters({ spending: s.value })}
            >
              {s.label}
            </Chip>
          ))}
        </div>
      </Row>

      <Row label="Outing vibe">
        <div className="flex flex-wrap gap-2">
          {PERSONA_OPTIONS.map((o) => {
            const has = filters.personas.includes(o.value);
            return (
              <Chip
                key={o.value}
                selected={has}
                onClick={() =>
                  setFilters({
                    personas: has
                      ? filters.personas.filter((p) => p !== o.value)
                      : [...filters.personas, o.value],
                  })
                }
              >
                <span aria-hidden>{o.emoji}</span> {o.label}
              </Chip>
            );
          })}
        </div>
      </Row>

      <Row label={`Minimum match · ${filters.minScore}%`}>
        <Slider
          value={filters.minScore}
          min={0}
          max={100}
          step={5}
          format={(v) => `${v}%`}
          onChange={(v) => setFilters({ minScore: v })}
        />
      </Row>

      <div className="flex gap-3 pt-1">
        <Button variant="outline" fullWidth onClick={reset}>
          Reset
        </Button>
        <Button fullWidth onClick={onClose}>
          Show results
        </Button>
      </div>
    </div>
  );
}
