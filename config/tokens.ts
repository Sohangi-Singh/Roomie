/**
 * JS mirror of the core design tokens for places that need raw color strings
 * at runtime (Recharts, canvas, inline SVG gradients). Keep in sync with the
 * @theme block in app/globals.css.
 */
export const palette = {
  canvas: "#FEFCF6",
  sand: "#F4EFE6",
  surface: "#FFFDF8",
  surface2: "#F8F4EC",
  line: "rgba(33,30,24,0.08)",

  accent: {
    50: "#F3F5F2",
    100: "#E4E8E2",
    200: "#C9D0C6",
    300: "#ADB7A9",
    400: "#869180",
    500: "#5E6C5B",
    600: "#4D584A",
    700: "#3C453A",
    800: "#2C322B",
    900: "#1B1F1B",
  },

  ink: "#211E18",
  muted: "#6B6F66",
  faint: "#9DA096",

  success: "#5E7A59",
  warning: "#B8893E",
  danger: "#B5635A",
} as const;

/** Score → color, used by ProgressRing and match cards. */
export function scoreColor(score: number): string {
  if (score >= 80) return palette.success;
  if (score >= 60) return palette.accent[500];
  if (score >= 40) return palette.warning;
  return palette.danger;
}

export const radar = {
  stroke: palette.accent[500],
  fill: palette.accent[400],
  grid: "rgba(33,30,24,0.10)",
  axisLabel: palette.muted,
} as const;
