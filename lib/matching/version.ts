/**
 * Central matching-algorithm version. Bump whenever scoring/dealbreaker/insight
 * behavior changes so cached results and clients can be reasoned about.
 *
 *  1 → original launch algorithm.
 *  2 → behavior-based substances/non-veg, dealbreaker penalty+flag (no 22% floor),
 *      lifestyle floor ~27, exact self-match, near-clone bathroom fix, input
 *      validation, honest insight copy + "Worth discussing" band.
 */
export const ALGORITHM_VERSION = 2 as const;
