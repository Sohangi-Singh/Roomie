/**
 * College access configuration.
 *
 * Set NEXT_PUBLIC_COLLEGE_EMAIL_DOMAINS (comma-separated) to the real college
 * domain(s), e.g. "presidencyuniversity.in,student.presidency.in". Until then
 * it falls back to a permissive placeholder so the app still runs in dev.
 */
const RAW_DOMAINS =
  process.env.NEXT_PUBLIC_COLLEGE_EMAIL_DOMAINS ?? "college.edu";

export const COLLEGE_NAME =
  process.env.NEXT_PUBLIC_COLLEGE_NAME ?? "your college";

export const COLLEGE_EMAIL_DOMAINS: string[] = RAW_DOMAINS.split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

/** True if the email belongs to an allowed college domain (or subdomain). */
export function isCollegeEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 0) return false;
  const domain = normalized.slice(at + 1);
  return COLLEGE_EMAIL_DOMAINS.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
  );
}

export const YEARS = [1, 2, 3, 4] as const;

/**
 * Graduation-batch label shown everywhere a user's academic year appears.
 * Display-only: `year` stays numeric in storage, filtering and ranking, and
 * batch years are ordinally adjacent to years (1↔2029, 2↔2028, …) so any
 * proximity logic is unaffected.
 */
export const BATCH_BY_YEAR: Record<(typeof YEARS)[number], number> = {
  1: 2029,
  2: 2028,
  3: 2027,
  4: 2026,
};

export function batchLabel(year: (typeof YEARS)[number]): string {
  return `Batch ${BATCH_BY_YEAR[year]}`;
}
