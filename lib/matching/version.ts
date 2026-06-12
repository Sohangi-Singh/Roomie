/**
 * Central matching-algorithm version. Bump whenever scoring/dealbreaker/insight
 * behavior changes so cached results and clients can be reasoned about.
 *
 *  1 → original launch algorithm.
 *  2 → behavior-based substances/non-veg, dealbreaker penalty+flag (no 22% floor),
 *      lifestyle floor ~27, exact self-match, near-clone bathroom fix, input
 *      validation, honest insight copy + "Worth discussing" band.
 *  3 → 4-option dealbreaker stances ("Will do in room" is the only doer
 *      signal; derived exhibits/behavior fields removed). Symmetric penalty
 *      matrix −35 hard / −17 medium / −3 mild applied AFTER a base built from
 *      the 12 lifestyle categories only; single floor 35; severity-carrying
 *      dealbreakerFlags (mild never surfaces).
 */
export const ALGORITHM_VERSION = 3 as const;
