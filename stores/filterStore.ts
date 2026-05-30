import { create } from "zustand";
import type { HostelId, Persona, RoomType, Year } from "@/types";

export interface ExploreFilters {
  year: Year | "any";
  hostel: HostelId | "any";
  roomType: RoomType | "any";
  sleep: "any" | "early" | "late";
  cleanliness: "any" | "relaxed" | "tidy";
  spending: "any" | "budget" | "moderate" | "premium";
  personas: Persona[];
  minScore: number; // 0..100
}

export const DEFAULT_FILTERS: ExploreFilters = {
  year: "any",
  hostel: "any",
  roomType: "any",
  sleep: "any",
  cleanliness: "any",
  spending: "any",
  personas: [],
  minScore: 0,
};

interface FilterState {
  filters: ExploreFilters;
  setFilters: (patch: Partial<ExploreFilters>) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  filters: DEFAULT_FILTERS,
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  reset: () => set({ filters: DEFAULT_FILTERS }),
}));
