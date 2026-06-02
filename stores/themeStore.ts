import { create } from "zustand";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  /** Read the current `data-theme` (set by the no-FOUC script) into the store. */
  hydrate: () => void;
}

const STORAGE_KEY = "roomie-theme";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode etc. */
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light",
  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
  },
  toggle: () => get().setTheme(get().theme === "light" ? "dark" : "light"),
  hydrate: () => {
    if (typeof document === "undefined") return;
    const current = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    set({ theme: current });
  },
}));
