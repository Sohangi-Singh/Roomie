# FABLE_HANDOFF.md — Dealbreaker system v3

> Handoff for Claude Fable. Self-contained: you should not need to re-read the
> whole codebase. Read this top-to-bottom, then execute. **You are encouraged to
> propose algorithmic improvements beyond this spec — see §6 — but flag them as
> proposals, never make silent semantic changes.**

---

## 0. CRITICAL — which branch you start from

The repo has **two diverged branches** off the common audit commit `10663b8`:

| Branch | Contains | Missing |
|---|---|---|
| `algorithm-fixes-v2` (`803cae9`) | v2 matching: `behavior.{substances,nonveg}` fields, `lib/matching/version.ts` (`ALGORITHM_VERSION=2`), the −15-per-hard / floor-40 dealbreaker math, `dealbreakerFlags: string[]`, `worthDiscussing`, the `BehaviorPrompt` backfill modal | the legacy "Not set" profile fix |
| `main` (`561b8f8`) | the legacy "Not set" hostel/room fix (`lib/firebase/normalise.ts` + `getUser` migration) | ALL of the v2 matching work above |

**Branch `dealbreaker-v3` FROM `algorithm-fixes-v2`** (`git checkout algorithm-fixes-v2 && git checkout -b dealbreaker-v3`). This spec only makes sense on the v2 baseline — it removes the v2 `behavior` fields and bumps `ALGORITHM_VERSION` 2→3, neither of which exist on `main`.

⚠️ **Known gap to flag back, not silently resolve:** the v2 branch does **not** contain `main`'s legacy "Not set" fix (`lib/firebase/normalise.ts`, the `normaliseUserPrefs` call in `getUser`). It is unrelated to dealbreakers, so leave it out of v3 unless the reviewer asks you to cherry-pick `561b8f8`. Note it in your final response.

---

## 1. Context

**Roomie** — compatibility-first roommate matching for college hostel students. A student fills a lifestyle questionnaire; the app scores every same-gender candidate, ranks them, explains why they match/clash, and lets matched users DM. Stack: Next.js 16 (App Router) · React 19 · TS · Tailwind v4 · Firebase (client Auth + Firestore) + firebase-admin (server-side matching) · Vitest. The matching module `lib/matching/*` is **pure** (no Firebase imports) and runs server-side only via Admin SDK in `app/api/*/route.ts`; questionnaires are owner-only readable.

**Current `ALGORITHM_VERSION` = 2** (`lib/matching/version.ts`). You will bump it to **3**.

**The matching pipeline today (v2):** `scorePair(a, b)` →
1. `categoryScores` produces 12 lifestyle scores (sleep, cleanliness, noise, study, lighting, temperature, bathroom, social, spending, outing, travel, sharing).
2. `effectiveWeights` weights them (importance boost) → a weighted `raw` 0–100.
3. `dealbreakerConflicts(a,b)` returns hard/soft conflicts; `raw − 15·hard − 5·soft`, then a floor (40 if any hard, else 27).
4. `buildInsights` produces `reasons` / `worthDiscussing` / `annoyances` / `conflicts`; `dealbreakerFlags: string[]` lists hard-conflict labels.

**How dealbreakers are currently detected (the part you're replacing):**
- Each of the 6 dealbreakers has a **3-option tolerance** answer (`Stance = "okay" | "annoying" | "dealbreaker"`).
- Whether a person *does* the thing (`exhibits()` in `scoring.ts`) is **derived**: `messyRoom`=`cleanliness.room ≤ 2`, `lateSleeping`=`sleepTime < 330`, `loudMusic`=`reels/gaming ≥ often`, `frequentGuests`=`guests ≥ often`; and `substances`/`nonveg` read the v2 `behavior.{substances,nonveg}` fields (default `null` = unknown).
- A conflict fires when one person exhibits the trait AND the other's stance is `dealbreaker` (hard) or `annoying` (soft).

---

## 2. Why the previous fix (v2: −15/hard, floor 40) did not solve the problem

The v2 round moved the dealbreaker warning "from a tanked score to an explicit flag" by subtracting a flat 15 per hard conflict and flooring at 40. It under-delivered for three concrete reasons, confirmed by a fresh `npx vitest run __tests__/matching.spec.ts` on `algorithm-fixes-v2`:

1. **The penalty is far too gentle.** A flawless-on-paper pair with a genuine *"I cannot live with this"* dealbreaker barely moves:
   - `[Fix3] free = 100% → with one hard dealbreaker = 85%`. An 85% still sorts at the very top of a student's list. The score no longer communicates "serious problem here." (v3's −35 takes a 90% to 55% — visible, but not cratered to noise.)

2. **Dealbreakers rarely fire for the categories that matter most, so genuine risks stay invisible.** The substances/non-veg signal depends on the v2 `behavior` fields, which default to `null` (unknown → no conflict) and are only backfilled via an **opt-in** modal:
   - `Chill Middle-Ground ↔ Substance/Late Nighter → 71%, no flags` — even though that archetype genuinely uses substances. To a roommate who didn't pre-declare a substances dealbreaker, a substance user reads as a clean 71%. In production almost nobody completes the behavior modal, so substance/non-veg dealbreakers effectively never trigger.

3. **Derived exhibits double-count the same trait.** Because `messyRoom` is derived from `cleanliness.room ≤ 2`, a messy person is penalised twice:
   - `Early Bird ↔ Night Owl → 40%`: `cleanliness = 19` (the lifestyle category already tanks) **and** a `Messy room` hard flag fires off the *same* messiness. There's no way for a user to say "I'm messy, but I don't mind a messy roommate" independently of the cleanliness slider.

Structurally, v2 also has only two severity tiers (hard/soft), a split floor (40 vs 27), and no explicit "**I personally do this**" signal — the thing every dealbreaker comparison actually hinges on.

---

## 3. New dealbreaker spec (v3)

### 3.1 New question format — 4 options per dealbreaker category

For **each** of the 6 dealbreaker categories (`substances`, `nonveg`, `loudMusic`, `lateSleeping`, `messyRoom`, `frequentGuests`) the user picks exactly ONE stance:

| Option (UI label) | Suggested internal value | Meaning |
|---|---|---|
| **Will do in room** | `willDo` | I personally do / will do this |
| **Fine** | `fine` | I don't do it, but I'm fine with a roommate who does |
| **Annoying** | `annoying` | It would bother me but isn't a dealbreaker |
| **Dealbreaker** | `dealbreaker` | I cannot live with someone who does this |

This **replaces** the 3-option `Stance` system entirely. `"Will do in room"` is now the **single source of truth** for whether someone does the thing, so:
- **Remove** the v2 `behavior.{substances,nonveg}` fields and the `BehaviorFreq` type — they're redundant.
- **Remove** the derived `exhibits()` logic (room≤2, sleepTime<330, etc.) — all 6 categories now use the explicit stance.
- **Remove** the v2 behavior-backfill modal (`BehaviorPrompt`) — replaced by the v3 migration modal (§4).

> Internal value names are your choice as long as they're consistent across types/schema/UI/scoring/tests. The four UI labels above are fixed product copy.

### 3.2 Penalty matrix (symmetric — order of A vs B does not matter)

Full 4×4 (every cell explicit so there is zero ambiguity):

| A ╲ B | Will do | Fine | Annoying | Dealbreaker |
|---|---|---|---|---|
| **Will do** | 0 | 0 | **−17 MEDIUM** | **−35 HARD** |
| **Fine** | 0 | 0 | **−3 MILD** | 0 |
| **Annoying** | **−17 MEDIUM** | **−3 MILD** | 0 | 0 |
| **Dealbreaker** | **−35 HARD** | 0 | 0 | 0 |

The only non-zero cells: `Will do × Dealbreaker = −35 (HARD)`, `Will do × Annoying = −17 (MEDIUM)`, `Fine × Annoying = −3 (MILD)`. Everything else — including `Will do × Fine`, `Fine × Dealbreaker`, `Annoying × Dealbreaker`, and all four same-option diagonals — is **0**.

Same-option rule (explicitly, all four are aligned → 0): both `Will do` (both do it, both fine), both `Fine` (neither does it, both tolerant), both `Annoying` (neither does it, both mildly dislike), both `Dealbreaker` (neither does it, neither tolerates).

### 3.3 Algorithm order (THE critical fix)

1. **Base** = compatibility % from the **12 non-dealbreaker categories only** (sleep, cleanliness, noise, study, lighting, temperature, bathroom, social, spending, outing, travel, sharing) — the existing `categoryScores × effectiveWeights` weighted sum. Dealbreakers contribute **nothing** to this number.
2. **Apply the penalty matrix** across all 6 dealbreaker categories: sum every cell's penalty and subtract from the base.
3. **Floor the final displayed score at 35.** (Lifestyle-opposite pairs with no dealbreakers should still floor around 25–30 naturally, so dealbreaker pairs sit at or above honest lifestyle mismatch — correct.)
4. Attach **`dealbreakerFlags`** listing every triggered category with severity (`hard` / `medium`). MILD (−3) produces **no** flag — just a silent score nudge.

### 3.4 Explicit clarifications (read carefully — these prevent the most likely mistakes)

**(a) Dealbreakers contribute ZERO to the base.** The 6 dealbreaker categories are NOT among the 12 base categories. They exist only as penalties applied AFTER the base. "Both same option = 0 penalty" means **zero, not a bonus** — never let dealbreaker alignment add positive points anywhere. (Note: the base category `cleanliness` — from the tidiness sliders — stays in the base; it is *not* the `messyRoom` dealbreaker. They're now fully independent inputs. Same for `sleep`/`lateSleeping`, `noise`/`loudMusic`. This independence is the point — it removes the v2 double-counting.)

**(b) Penalties stack additively across all 6 categories, with no cap before the 35 floor.** Worked example: a 90% base with one HARD (−35), one MEDIUM (−17), one MILD (−3) → `90 − 35 − 17 − 3 = 35` (right at the floor). The only clamp is the 35 floor.

**(c) MILD (−3) penalties never appear in ANY UI surface** — not flags, not "Worth discussing," not detail-view clashes, not tooltips. They silently move the %. Rationale: −3 is below the threshold a user would act on; surfacing it clutters cards with non-actionable cautions.

**(d) The `dealbreakerFlags` array contains ONLY hard and medium entries — never mild.** Mild penalties hit the score in scoring but are never written to the flags array.

**(e) Importance weighting applies ONLY to the 12 base categories.** Dealbreaker penalties are NOT scaled by importance — `−35 / −17 / −3` are absolute. Rationale: picking "Dealbreaker" already expresses maximum importance; scaling would double-count.

**(f) Self-match short-circuit is preserved.** `scorePair(user, user)` (same `uid`) returns exactly `100`, no flags, no penalty computation — keep the v2 short-circuit (`index.ts` ~L83).

### 3.5 `dealbreakerFlags` shape change

v2 is `dealbreakerFlags: string[]`. Change `MatchResult.dealbreakerFlags` to carry severity so the UI can colour and phrase correctly, e.g.:

```ts
dealbreakerFlags: { category: DealbreakerKey; label: string; severity: "hard" | "medium" }[]
```

Update every consumer (match card, profile detail) accordingly.

### 3.6 UI behavior

- **HARD** → red ⚠️ on the match card. In the detail view's **"Potential clashes"** section, name the conflict in plain language, e.g. *"Smoking in room — they will, you can't live with it."*
- **MEDIUM** → orange caution on the match card. In the detail view's **"Worth discussing"** section, e.g. *"Loud music — they'll play it, you'd find it annoying."*
- **MILD** → never surfaces; silently affects the %.

---

## 4. Migration plan

Existing users have answers in the old 3-option format (`okay`/`annoying`/`dealbreaker`). Map on read (safe default — never auto-assigns "Will do"):

| Old value | New value |
|---|---|
| `"okay"` (a.k.a. "fine") | `Fine` |
| `"annoying"` | `Annoying` |
| `"dealbreaker"` | `Dealbreaker` |
| — | `Will do in room` is **never** auto-assigned; it requires explicit user consent |

On next app open, an already-onboarded user sees a **one-time modal**:

> "We've improved how we ask about lifestyle dealbreakers. Take 30 seconds to update your answers so your matches stay accurate."

The modal walks them through all 6 dealbreaker categories with the new 4-option format and saves their answers to their own questionnaire (a normal user-initiated write — no admin/migration script). Until they complete it, treat them as holding the mapped answers above (so nobody is falsely flagged as "Will do").

**Also remove the v2 behavior-fields migration modal entirely** (`BehaviorPrompt` + its mount in `(app)/layout.tsx` + `updateQuestionnaireBehavior` in `db.ts` + the `behavior` read-migration in `getQuestionnaire`). The new dealbreaker modal replaces it.

---

## 5. Files to modify (paths + v2 line ranges)

> Line numbers are on the `algorithm-fixes-v2` baseline. Treat as a guide — verify before editing.

**Types**
- `types/questionnaire.ts`
  - L11 `Stance` (3-option) → replace with the 4-option dealbreaker stance type.
  - L15 `BehaviorFreq` → **delete**.
  - L82–85 `behavior: { substances; nonveg }` field → **delete**.
  - L88 `dealbreakers: Record<DealbreakerKey, Stance>` → keep, using the new 4-option type.

**Config / questionnaire**
- `config/questionnaire.ts`
  - L68 `STANCE_OPTIONS` (3) → 4 options with the new labels.
  - L77 `BEHAVIOR_OPTIONS`, L84 `BEHAVIOR_QUESTIONS` → **delete**.
  - L92 `DEALBREAKER_META` → keep (labels reused for flags/clash copy).
  - L203 `Step` union member `kind: "behavior"` → **delete**.
  - ~L495–500 the `behavior` step object in `STEPS` → **delete**.
  - L529 `behavior: { substances: null, nonveg: null }` in `defaultQuestionnaire` → **delete**; update the `dealbreakers` default to the new default stance (`Fine`).
  - L561 `const stance = z.enum([...])` → 4-option enum. L562 `behaviorFreq` zod → **delete**. L620–623 `behavior` in `questionnaireSchema` → **delete**. L627 `dealbreakers` schema → keep with the new enum.

**Matching engine**
- `lib/matching/scoring.ts`
  - L211 local `DEALBREAKER_KEYS` → keep.
  - L225 `behaviorState()` → **delete**.
  - L236–255 `exhibits()` → **delete** the derived logic; "does this person do it" is now `stance === willDo` (used by the matrix).
  - L257 `DealbreakerConflict` interface & L263–~280 `dealbreakerConflicts()` → **rewrite** as the symmetric penalty-matrix evaluator returning, per category, `{ category, penalty, severity }` for `hard | medium | mild`.
- `lib/matching/insights.ts`
  - L35 `DEALBREAKER_LINES` → keep/repurpose for hard (clashes) + medium (worth-discussing) copy.
  - L77 `unknownBehaviorNote` and L153–159 unknown-behavior notes → **delete**.
  - L94 `buildInsights` → route HARD dealbreakers → `conflicts` (red), MEDIUM → `worthDiscussing` (orange); MILD → nothing.
- `lib/matching/index.ts`
  - L45–51 `HARD_PENALTY/SOFT_PENALTY/DEALBREAKER_FLOOR/LIFESTYLE_FLOOR` → replace with the v3 matrix constants + single `FLOOR = 35`.
  - L23–41 `MatchResult` → change `dealbreakerFlags` to the severity-carrying shape (§3.5).
  - L78–140 `scorePair` → new order (§3.3); keep the L83 self-match short-circuit; importance only on base (§3.4e).
- `lib/matching/version.ts` L10 → `ALGORITHM_VERSION = 3`.

**Persistence**
- `lib/firebase/db.ts`
  - L64–77 `getQuestionnaire` behavior read-migration → **delete**; add the old→new stance read-migration (§4).
  - L79–86 `updateQuestionnaireBehavior` → **delete**; add a `updateQuestionnaireDealbreakers` (or similar) for the new modal.

**UI**
- `components/features/BehaviorPrompt.tsx` (72 lines) → **delete**; create the new v3 dealbreaker migration modal.
- `components/features/BehaviorQuestions.tsx` (54 lines) → **delete** or repurpose into the new 4-option dealbreaker question renderer (shared by onboarding + modal).
- `components/features/QuestionStep.tsx` — L18 import + L37–43 `behavior` branch → **delete**; L289+ `DealbreakersStep` → render the new 4 options (note "Will do in room" is a long label — use a 2-col grid like the old BehaviorQuestions, not a 4-wide Segmented).
- `components/features/MatchCard.tsx` L34–37 → render hard (red) vs medium (orange) from the new flag shape.
- `app/(app)/profile/[id]/page.tsx` L153–160 (banner) + L180–182 (`InsightList`) → split hard→Potential clashes, medium→Worth discussing; use severity.
- `components/features/InsightList.tsx` — `worthDiscussing` (medium) and `conflicts` (hard) sections already exist; wire severity through.
- `app/(app)/layout.tsx` L2 + L20 `BehaviorPrompt` → swap for the new modal.

**API** (keep v2's Fix 6 validation)
- `app/api/match/route.ts` L3/L28/L34 — `IncompleteProfileError` catch stays.
- `app/api/matches/route.ts` L55 `exhibits(q,"lateSleeping")` is used for the **coarse "late sleeper" facet** (Explore filter), not a dealbreaker. Since `exhibits` is being deleted, replace this with a direct check (`q.sleep.sleepTime < 330`) so the facet keeps working. L93 `rankCandidates` unchanged.

**Fixtures & tests**
- `scripts/generate-test-users.ts` — remove `behavior` from archetypes; convert their `dealbreakers` to the 4-option stances (give the substance/late archetype `willDo` on substances, etc. so conflicts are testable).
- `__tests__/matching.spec.ts` and `lib/matching/__tests__/matching.test.ts` — update for the new math/shape and add the §5-below cases.

---

## 6. Test plan (every case must exist)

**Penalty matrix — 8 cases, each asserted in BOTH orderings (A,B) and (B,A) to prove symmetry:**
1. `Will do × Dealbreaker` → −35, severity `hard`.
2. `Will do × Annoying` → −17, severity `medium`.
3. `Fine × Annoying` → −3, severity `mild` (no flag).
4. `Fine × Dealbreaker` → 0, no flag.
5. `Will do × Will do` → 0.
6. `Fine × Fine` → 0.
7. `Annoying × Annoying` → 0.
8. `Dealbreaker × Dealbreaker` → 0.

**Composite scenarios:**
- High base (88%) + one HARD → **53%**, red flag.
- Medium base (60%) + one MEDIUM (−17) → **43%**, orange flag.
- High base (90%) + three MILD (−3 each) → **81%**, **no** flags.
- Low base (40%) + one HARD → **35%** (floored), red flag.
- High base (85%) + one HARD + two MEDIUM → `85 − 35 − 34 = 16` → **35** (floored), red flag dominates.
- Migration: an existing user with old `"okay"` answers loads as `Fine` with **no** "Will do" flags.
- Self-match still **100%**.
- Still-passing invariants: determinism, full-match symmetry `score(A,B)===score(B,A)`, importance weighting affecting only the 12 base categories.

> To hit precise base values (88/90/60/40) construct fixtures whose 12-category weighted base lands there with **no** dealbreaker conflicts, then layer the dealbreaker stances on top. A small helper that asserts `base` and `final` separately keeps these robust to rounding.

---

## 7. Improvement Opportunities for Fable

You are explicitly encouraged to propose algorithmic improvements beyond the listed fixes, including but not limited to:
- Smarter handling of partially-completed questionnaires (v2 throws `IncompleteProfileError`; is there a graceful partial-score with a "incomplete" badge?).
- Better category-score aggregation — e.g. should `bathroom` weight equal `sleep`, or be lower? Are the current `BASE_WEIGHTS` defensible?
- More nuanced insight generation in `insights.ts` — the current band thresholds (78 / 50 / 30) are blunt; propose better ones if they exist.
- Improved interaction between importance-weighting and dealbreaker penalties.
- Anything else your judgment says would make Roomie's matching meaningfully smarter for real users.

**Rules for proposed improvements:**
1. Implement ONLY if you're highly confident they improve the product AND they're additive (don't conflict with §3).
2. Document every implemented improvement in `MATCHING_AUDIT.md` under a new **"v3 Improvements"** section: what changed, why, a before/after example, and a test proving it.
3. If uncertain, **flag the idea in your final response and wait for review** — do not silently change semantic behavior the reviewer might disagree with.

---

## 8. Acceptance criteria (checklist — satisfy ALL before declaring done)

- [ ] Branched `dealbreaker-v3` from `algorithm-fixes-v2`.
- [ ] Dealbreaker questions are the 4-option format; old 3-option `Stance` and the `BehaviorFreq`/`behavior` fields are fully removed (no dangling references).
- [ ] `exhibits()` derivation and `behaviorState()` removed; all 6 dealbreakers use the explicit stance.
- [ ] Base score uses only the 12 lifestyle categories; dealbreakers add zero positive points anywhere.
- [ ] Penalty matrix implemented exactly per §3.2 (verified by the 8 symmetric matrix tests).
- [ ] Order is base → penalties → floor 35; importance affects only the base.
- [ ] `dealbreakerFlags` carries `{category,label,severity}`, contains only hard+medium, never mild.
- [ ] MILD penalties affect the score but appear in **no** UI surface.
- [ ] Self-match returns exactly 100, no flags.
- [ ] Migration: old answers map okay→Fine / annoying→Annoying / dealbreaker→Dealbreaker; never auto-`willDo`; one-time modal collects new answers; v2 `BehaviorPrompt` and its plumbing removed.
- [ ] UI: hard = red on card + "Potential clashes"; medium = orange on card + "Worth discussing"; named in plain language.
- [ ] `ALGORITHM_VERSION` bumped 2 → 3.
- [ ] All composite + invariant tests in §6 pass; `npm run typecheck && npm run lint && npm test && npm run build` all green.
- [ ] `MATCHING_AUDIT.md` updated with a "v3 — Dealbreaker rework" section incl. the re-run of the 5 explain pairs (before/after) and any §7 improvements.
- [ ] Full `git diff` shown at the end.

---

## 9. Constraints (hard rules)

- Branch name: **`dealbreaker-v3`**, off `algorithm-fixes-v2`.
- **No production data writes**; all testing in-memory against fake profiles (`scripts/generate-test-users.ts`). Do not run anything that connects to Firebase/Firestore/production.
- **No deploy. No merge to main.**
- Bump `ALGORITHM_VERSION` from **2 → 3**.
- Show the full `git diff` at the end.
- Keep `lib/matching` pure (no Firebase imports). Keep the privacy guarantee — raw questionnaires never leave the server; only computed results + coarse facets reach the client.
- Verify with `typecheck` / `lint` / `test` / `build` before declaring done.
