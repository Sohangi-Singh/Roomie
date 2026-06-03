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

/** Score → color (light mode). */
const LIGHT_SCORE = {
  high: palette.success, //   ≥ 80
  mid: palette.accent[500], // 60-79
  warn: palette.warning, //    40-59
  low: palette.danger, //     < 40
};

/** Score → color (dark mode). Brighter / lighter shades so the progress
 *  rings and category bars stay legible against the dark canvas. */
const DARK_SCORE = {
  high: "#b8d4ad",
  mid: "#a3b594",
  warn: "#e6c994",
  low: "#e6a99c",
};

/** Score → color. Pass `dark` from a component's theme store. */
export function scoreColor(score: number, dark = false): string {
  const c = dark ? DARK_SCORE : LIGHT_SCORE;
  if (score >= 80) return c.high;
  if (score >= 60) return c.mid;
  if (score >= 40) return c.warn;
  return c.low;
}

const RADAR_LIGHT = {
  stroke: palette.accent[500],
  fill: palette.accent[400],
  grid: "rgba(33,30,24,0.10)",
  axisLabel: palette.muted,
} as const;

const RADAR_DARK = {
  stroke: "#b6c4a8",
  fill: "#b6c4a8",
  // Slightly more opaque than the light counterpart so grid lines stay
  // visible against the dark canvas.
  grid: "rgba(244,239,230,0.22)",
  axisLabel: "#bcc2b4",
} as const;

export function getRadarTokens(dark = false) {
  return dark ? RADAR_DARK : RADAR_LIGHT;
}

/** Kept for any non-themed callers — equals the light token set. */
export const radar = RADAR_LIGHT;
