# Roomie — Matching Algorithm Pre-Launch Audit

**Scope:** read-only validation of `lib/matching`. The algorithm was **not modified**.
**Date:** 2026-06-05 · **Vitest:** 4.1.7 · pure in-memory (no Firebase, no I/O, no writes).

> **Constraint note.** You authorized me to "do what's best" for the one logistics
> blocker: the repo's `vitest.config.ts` only discovered `lib/**/*.test.ts`, so a
> spec at `__tests__/matching.spec.ts` could not run, and there is no `--include`
> CLI override. I made the **single smallest** change to unblock it: appended
> `"__tests__/**/*.spec.ts"` to the `include` array (purely additive; existing
> discovery unchanged). **No scoring / weights / thresholds / `lib/matching`
> code was touched.** Files created: `scripts/generate-test-users.ts`,
> `__tests__/matching.spec.ts`, `MATCHING_AUDIT.md`.

## How to run

```bash
npm test                                  # full suite (existing 18 + audit 19)
npx vitest run __tests__/matching.spec.ts --reporter=verbose   # audit only, with explain output
```

---

## TL;DR — verdict before launch

The engine is **internally consistent, deterministic, and symmetric**, and importance
weighting + dealbreakers behave as designed. But several **human-obvious expectations do
not hold**, and two of them are worth a product decision before real users see scores:

| # | Severity | Finding |
|---|----------|---------|
| A | 🔴 High | **A substance-using / 4am / messy roommate reads as a clean 71% match** to anyone who didn't pre-flag those dealbreakers. The `substances`/`nonveg` signal is the *self-reported tolerance* ("okay" = "I do it"), so concerns only surface if the *other* person flagged them. |
| B | 🔴 High | **`"okay"` (the default stance) = "exhibits it."** A brand-new user who leaves substances/non-veg at the default trips a *hard dealbreaker* for anyone who flags those — and is themselves treated as a substance user / non-veg eater. |
| C | 🟠 Med | **The 22% dealbreaker floor breaks "dealbreaker = worst."** A hard-dealbreaker pair (floored to 22%) ranks **above** a non-dealbreaker pair that's a genuine lifestyle opposite (~5%). (Test 4 fails.) |
| D | 🟠 Med | **A 22% hard-dealbreaker match still says "Why you match: *You have a balanced, workable mix of habits.*"** The fallback reason fires whenever no category ≥ 78, regardless of how bad the match is. Reads as falsely reassuring. |
| E | 🟡 Low | **You are not 100% compatible with yourself** (you get ~94–97%). Bathroom timing is intentionally *reversed* (sharing your own timing scores 0 on that sub-component → bathroom caps ~60); empty persona sets score 60. (Test 1 fails.) |
| F | 🟡 Low | **Lifestyle opposites only reach ~38%** without a dealbreaker; a 5-hour sleep gap still scores **71%** on the sleep category. Real separation depends heavily on dealbreakers firing. |
| G | 🟡 Low | **`scorePair` has no input validation** — a half-finished questionnaire throws (missing sub-object) or returns `NaN` (missing leaf). Safe today only because the API route gates on `_onboarded`. |

None of these are crashes or math errors in the happy path. A–D are **design decisions with
user-visible consequences** that you should consciously accept or change. I did **not** change
any of them.

---

## Step 1 — Synthetic user generator (`scripts/generate-test-users.ts`)

Pure, fully-typed factories built on the real `defaultQuestionnaire` + `@/types`. Named
archetypes:

| Archetype | Shape (key traits) |
|---|---|
| **Early Bird Neat Freak** | sleeps 22:00, spotless (5/5/5), needs silence (tol 1), introvert (10), silent solo study. **Flags** messy-room + loud-music as *dealbreakers*, late-sleeping as *annoying*. |
| **Night Owl Gamer** | sleeps 03:00, messy (2/2/1), loud (gaming "always"), extrovert (70), bright/late. Flags nothing. |
| **Studious Introvert** | 22:30 sleeper, tidy (4/4/4), silent solo study (seriousness 5), introvert (15). **Flags** frequent-guests as *dealbreaker*. |
| **Social Butterfly** | 01:00 sleeper, extrovert (95), guests/calls "always", splurges. Flags nothing. |
| **Chill Middle-Ground** | the defaults + a moderate persona set. |
| **Substance User + Late Nighter** | sleeps 04:00, messy, loud, substances/non-veg "okay" (→ *exhibits* them in this model). |
| **Early Bird (near-clone)** | Early Bird ± tiny numeric tweaks (sleep +15m, ₹+500, +2km). |
| **Randomized** | `randomTestUsers(n, seed)` — deterministic (mulberry32), schema-valid. |

Generator decisions (the *only* "tuning" I did — none of it touches the algorithm):
the Early Bird and Studious Introvert were given **on-brand dealbreakers** (a neat freak who
needs silence really would flag mess/noise; an introvert would flag guests). Every archetype
was given a non-empty persona set so the `outing` category isn't stuck at the empty-set
default of 60. These are *realistic-input* choices; they cannot fix the explanation problems
below, which live in `lib/matching/insights.ts`.

---

## Step 2 — Human-obvious truths (8 asserted)

Run: `npm test`. Result: **6 pass, 2 fail** (the 2 failures are findings, intentionally not fixed).

| # | Expectation | Result | Actual |
|---|-------------|--------|--------|
| 1 | Self-match = 100% | ❌ **FAIL** | **97%** (see Finding E) |
| 2 | Near-clone > 90% | ✅ pass | 97% |
| 3 | Early Bird vs Night Owl < 35% | ✅ pass | **22%** (via 2 hard dealbreakers + floor) |
| 4 | Any dealbreaker pair < any non-dealbreaker pair | ❌ **FAIL** | dealbreaker **22%** vs worst non-dealbreaker **5%** (Finding C) |
| 5 | Sleep not ~90% when times differ ~5h | ✅ pass | 71% (passes < 90, but lenient — Finding F) |
| 5b | Cleanliness reflects tidiness gap | ✅ pass | 5-vs-1 = 0, 5-vs-4 = 75 |
| 6 | `rankCandidates` deterministic + sorted | ✅ pass | identical across runs; sorted desc |
| 7 | Flagging cleanliness makes a clean↔messy mismatch hurt more | ✅ pass | flagged 73% vs unflagged 83% |
| 8 | Symmetry: score(A,B) = score(B,A) | ✅ pass | exactly equal (22=22, 71=71, …) |

**Why Test 1 fails (self ≠ 100%).** `bathroomScore` intentionally *rewards different* bath
timing (shared-resource avoidance), so matching your own (identical) timing scores **0** on
that sub-component → the bathroom category caps near **60**. Empty persona sets also score 60
on `outing`. Net self-match ≈ 94% (no personas) to ~97–98% (with personas). This is a direct
consequence of two **documented, intentional** design choices, not a coding error.

**Why Test 4 fails (dealbreaker not always worst).** `scorePair` floors any hard-dealbreaker
pair at **22%** ("…so people can still discover and message each other"). But a genuine
lifestyle-opposite pair with *no* dealbreaker (opposite on sleep/clean/noise/study/social/
spending/sharing/outing) legitimately scores **~5%**. So the floored 22% dealbreaker pair
ranks **above** the 5% non-dealbreaker pair — violating "a dealbreaker is the worst case."

---

## Step 3 — Explain pass (5 pairs) + human review

Printed verbatim from the run (`[overall%] · 12 categories · reasons / annoyances / clashes`):

### 1. Early Bird ↔ near-clone → **97%** (no dealbreaker)
```
categories: sleep=100 cleanliness=100 noise=100 study=100 lighting=100 temperature=100
            bathroom=60 social=100 spending=98 outing=100 travel=97 sharing=100
✓ why you match : similar sleep | similar tidiness | noise levels line up | study compatibly
~ might be a prob: —
✗ potential clash: —
```
**Review:** ✅ Reads exactly right. (Note bathroom=60 even for a near-twin — the reversal again.)

### 2. Early Bird ↔ Night Owl Gamer → **22%** (hard dealbreaker)
```
categories: sleep=56 cleanliness=19 noise=56 study=22 lighting=34 temperature=50
            bathroom=63 social=39 spending=45 outing=0 travel=23 sharing=17
✓ why you match : You have a balanced, workable mix of habits.
~ might be a prob: late-night vs early sleeper | lights early vs late | one more social | budgets differ
✗ potential clash: loud music | tidiness gap flagged as a dealbreaker | different outings | sharing | one tidier
```
**Review:** 🔴 **Contradictory.** A 22% hard-dealbreaker match should not say *"Why you
match: you have a balanced, workable mix of habits."* That's the **fallback reason**
(`insights.ts`) that fires whenever no category ≥ 78 — it ignores the overall score and the
dealbreaker. 🟡 Minor: cleanliness surfaces **twice** in clashes ("tidiness gap flagged as a
dealbreaker" + "one keeps things tidier"). *These are `insights.ts` issues — not fixable by
tuning the generator.*

### 3. Chill Middle-Ground ↔ Studious Introvert → **77%** (no dealbreaker)
```
categories: sleep=95 cleanliness=75 noise=88 study=65 lighting=56 temperature=90
            bathroom=68 social=64 spending=84 outing=67 travel=95 sharing=67
✓ why you match : similar sleep | travel similarly | similar temperature | noise lines up
~ might be a prob: —
✗ potential clash: —
```
**Review:** ✅ Reasons are good. 🟡 A 77% match shows **zero** caveats even though study/
lighting/social/sharing sit at 56–67 — the **50–77 band is never surfaced** (reasons need
≥78, annoyances need 30–49). Slightly sparse but not wrong.

### 4. Social Butterfly ↔ Studious Introvert → **22%** (hard: frequent guests)
```
categories: sleep=86 cleanliness=69 noise=81 study=22 lighting=34 temperature=80
            bathroom=65 social=16 spending=52 outing=20 travel=23 sharing=17
✓ why you match : similar sleep | noise lines up | similar temperature
~ might be a prob: loud music | lights early vs late
✗ potential clash: frequent guests flagged as a dealbreaker | one more social | sharing | different outings
```
**Review:** ✅ Coherent and human — real reasons fired (sleep/noise/temp ≥ 78), the guest
dealbreaker is the headline clash. Good example of the system working.

### 5. Chill Middle-Ground ↔ Substance User + Late Nighter → **71%** (no dealbreaker)
```
categories: sleep=66 cleanliness=75 noise=88 study=75 lighting=78 temperature=80
            bathroom=83 social=89 spending=74 outing=0 travel=39 sharing=67
✓ why you match : social energy aligned | noise lines up | bathroom routines complement nicely | similar temperature
~ might be a prob: different appetite for how far/planned outings are
✗ potential clash: different kinds of outings
```
**Review:** 🔴 **The headline problem.** This person sleeps at 4am, is messy, and is flagged
as a substance user — yet because *Chill* flagged nothing, none of that surfaces. It reads as
a reassuring 71% ("you'd live well together," social/noise/bathroom all praised). A thoughtful
human RA would absolutely mention the substances / 4am / mess. The model only raises them if
**the viewer pre-declared** them dealbreakers. ("Bathroom routines complement nicely" — from
different shower timing — is, on its own, a *good* explanation.)

**Conclusion for Step 3:** the robotic/contradictory bits (#2 fallback reason, #5 hidden
substance/late/mess, #2 redundancy, #3 sparse mid-band) all originate in
`lib/matching/insights.ts` and the dealbreaker model — **not** in the generated input. Tuning
the generator cannot fix them, and per the constraints I did not modify `insights.ts`.

---

## Step 4 — Edge cases

| Case | Behavior | Verdict |
|---|---|---|
| Unfinished questionnaire — **missing a category** (`sleep` absent) | `scorePair` **throws** (`Cannot read properties of undefined`) | ⚠️ No input guard. Safe only because API routes gate on `_onboarded`. |
| Unfinished questionnaire — **missing a leaf** (`sleep.sleepTime = undefined`) | `overall` = **`NaN`** (propagates, no validation) | ⚠️ Garbage-in → `NaN`-out. Recommend validating with the existing Zod `questionnaireSchema` at the matching boundary, or documenting the precondition. |
| Identical answers, **different importance** | 97% → 98% (barely moves) | ✅ Expected — importance only re-weights *differences*; identical answers have none. |
| Identical answers, **flag bathroom critical** | 97% → **94%** (drops) | 🟡 Quirk: because bathroom self-score is only ~60 (reversal), making it "critical" *lowers* a perfect-twin match. |
| User flags **EVERYTHING** a dealbreaker, vs an exhibiting roommate | **22%** (floored), `dealbreaker=true` | ✅ Craters as expected; all 6 conflicts collapse to the same 22 (no gradation between "1 dealbreaker" and "6"). |
| User flags **EVERYTHING**, vs a **plain default** roommate | **22%**, `dealbreaker=true`, clashes = *substances + non-veg* | 🔴 **Finding B** — the default `"okay"` stance counts as *exhibiting* substances & non-veg, so even a blank-slate roommate trips hard conflicts. |
| User flags **NOTHING** important | 77%, finite | ✅ Normal — base weights, no divide-by-zero. |

---

## Step 5 — Report

### Weights / thresholds I tuned
**None.** `lib/matching` is byte-for-byte unchanged (read-only audit). The only non-test edit
was the one additive `include` line in `vitest.config.ts` (above). All "tuning" was in the
**generator's archetype definitions** (realistic dealbreakers + persona sets), documented in
Step 1 — never in scoring code.

### Remaining risks before launch (prioritized)

1. **🔴 Substances / non-veg are inferred from tolerance, not behavior (Findings A + B).**
   `exhibits(q, "substances") = (q.dealbreakers.substances === "okay")`. Consequences:
   (a) the default "okay" labels *every* new user as a substance user / non-veg eater;
   (b) a real substance user is invisible to anyone who didn't pre-flag it.
   *Decision for you:* add explicit behavior questions ("Do you smoke/drink in the room?",
   "Do you eat non-veg in the room?") and read those in `exhibits()`. (I will not change this.)

2. **🔴 Misleading explanation copy (Finding D).** The fallback `"You have a balanced,
   workable mix of habits."` should not appear as a *reason to match* on a low / dealbreaker
   match. Consider suppressing reasons when `overall` is low or `dealbreaker` is true.

3. **🟠 The 22% floor inverts ranking vs true opposites (Finding C).** Decide whether a
   hard-dealbreaker pair should really outrank a 5% lifestyle-opposite pair. Note the live
   `/api/matches` tier sort *also* keeps dealbreaker people visible — so floor + tiers
   compound. If the floor stays, at least the *ordering* expectation in Test 4 is knowingly
   void.

4. **🟠 Leniency (Finding F).** Lifestyle opposites bottom out at ~38% without a dealbreaker;
   a 5-hour sleep gap scores 71% on sleep. Real differentiation leans on dealbreakers. If you
   want lifestyle alone to separate people more, the tolerant sleep curve, the one-directional
   noise model, and the `simEqual` floors (20–50) / travel floor (45) are the levers — your
   call, not mine.

5. **🟡 No input validation in `scorePair` (Finding G).** Throws / `NaN` on incomplete data.
   Today it's shielded by `_onboarded` gating; if matching is ever called on partial data it
   will crash or emit `NaN`. Validate at the boundary.

6. **🟡 Self-match ≠ 100% (Finding E)** and the bathroom-criticality quirk. Low real-world
   impact (self-compat isn't shown to users), but it's a sign the bathroom reversal leaks into
   otherwise-perfect matches (a near-twin caps at 97%). Acceptable if intentional.

### What's solid ✅
- Deterministic & stable ordering (Test 6); exact symmetry (Test 8).
- Importance weighting correctly amplifies flagged mismatches (Test 7).
- Dealbreaker cratering + floor behave as coded; obvious opposites *do* land at 22% **once a
  dealbreaker fires** (Test 3).
- All 12 category scores and `overall` stay within 0–100 on valid input; near-clones score
  ~97% (Test 2).

### Plain-English bottom line
The math is sound and predictable. The risks are **product/semantic**, concentrated in
(1) how substances/non-veg are inferred and (2) how matches are *explained*. I have **not
changed any algorithm code** — these are yours to decide.

---

# Fixes Applied — v2 (branch `algorithm-fixes-v2`)

> Implemented the six fixes on a dedicated branch (not merged). `ALGORITHM_VERSION`
> bumped **1 → 2** in `lib/matching/version.ts`. Full suite: **49 passed** (18 existing
> lib tests adjusted + 31 v2 spec tests). `typecheck` / `lint` / `build` all green.
> Run: `npm test` or `npx vitest run __tests__/matching.spec.ts --reporter=verbose`.

| Fix | What changed | Key files |
|---|---|---|
| **1 — behavior, not tolerance** | New private `behavior.{substances,nonveg}` field (`Never/Occasionally/Regularly/Prefer not to say`, default `null`). `exhibits()` now reads it; `null`/`prefer_not` = **unknown** → no conflict, but a neutral "haven't shared" note. Read-migration defaults old docs to `null`; a `BehaviorPrompt` modal backfills onboarded users; onboarding gained the two questions. | `types/questionnaire.ts`, `config/questionnaire.ts`, `lib/matching/scoring.ts`, `lib/firebase/db.ts`, `components/features/BehaviorQuestions.tsx` + `BehaviorPrompt.tsx`, `QuestionStep.tsx`, `(app)/layout.tsx` |
| **2 — honest copy** | Reassuring fallback is suppressed when `overall < 60`, a hard dealbreaker exists, or any category `< 30` — replaced by an honest neutral line. New neutral **"Worth discussing"** band surfaces 50–77 categories. | `lib/matching/insights.ts`, `components/features/InsightList.tsx` |
| **3 — dealbreaker penalty + flag** | Honest score first, then **−15 per hard / −5 per soft**, floor **40** (no more ×0.25 crater to 22). `dealbreakerFlags: string[]` added to `MatchResult` → ⚠️ badge on cards (now lists *which* dealbreakers) + a prominent banner in the detail view. | `lib/matching/index.ts`, `MatchCard.tsx`, `profile/[id]/page.tsx` |
| **4 — lifestyle floor** | Non-dealbreaker pairs floor at **27** (was ~5), so they sit *below* dealbreaker pairs (40). | `lib/matching/index.ts` |
| **5 — self = 100 / near-clone** | `scorePair(user,user)` short-circuits to **exactly 100**, no insights. Bathroom timing reworked (identical timing 85 → opposite 100 instead of 0→100) so a **near-clone now scores 99** (was 97) and bathroom no longer caps at 60. | `lib/matching/index.ts`, `lib/matching/scoring.ts` |
| **6 — input validation** | `scorePair` validates both questionnaires with the Zod schema and throws a typed **`IncompleteProfileError`** (with `missingFields`). `rankCandidates` skips incomplete candidates; `/api/match` returns a friendly "hasn't finished their questionnaire yet" instead of NaN/crash. | `lib/matching/errors.ts`, `lib/matching/index.ts`, `api/match/route.ts` |

### Resolves the original audit findings
- **A/B (substances proxy)** → fixed by Fix 1. An everything-flagger vs a plain default profile went from a **hard-conflict floor** to **93% with no false flag** (`hard=false`); a real substance user only conflicts when the viewer actually flagged substances.
- **C (floor inverts ranking)** → addressed by Fix 3 + 4 (your chosen ordering: dealbreaker pairs at 40 sit above lifestyle opposites at 27).
- **D (false reassurance)** → fixed by Fix 2.
- **E (self ≠ 100)** → fixed by Fix 5.
- **G (no validation)** → fixed by Fix 6.

## Fixes Applied — Before / After (the 5 explain pairs)

| Pair | v1 overall | v2 overall | What changed in the explanation |
|---|---|---|---|
| Early Bird ↔ near-clone | 97% | **99%** | bathroom 60 → 94 (near-clone no longer penalised for shared timing) |
| Early Bird ↔ Night Owl Gamer | 22% | **40%** | flags **Loud music, Messy room**; the false *"balanced, workable mix"* reason is gone, replaced by an honest friction line |
| Chill ↔ Studious Introvert | 77% | **78%** | new **Worth discussing** notes (lighting, social, study) instead of a silent 50–77 band |
| Social Butterfly ↔ Studious Introvert | 22% | **40%** | flag **Frequent guests**; warning moved from a tanked score to an explicit flag |
| Chill ↔ Substance/Late Nighter | 71% | **71%** | substance use is now *real behavior* — it correctly does **not** fire here because Chill never flagged substances (it would fire for a flagger) |

### New v2 explain output (verbatim)

```
──────── Early Bird ↔ Night Owl Gamer → 40%  (hardDealbreaker=true)
  flags: Loud music, Messy room
  ✓ why you match : —
  ? worth discussing: This match has notable friction points — review the clashes below before deciding. | Fan preferences differ a touch | Sleep timings differ a little | Some difference in noise comfort
  ~ might be a prob: late-night vs early sleeper | lights early vs late | one more social | budgets differ
  ✗ potential clash: loud music | tidiness gap flagged as a dealbreaker | different outings | sharing | one tidier

──────── Chill ↔ Studious Introvert → 78%  (hardDealbreaker=false)
  ✓ why you match : similar sleep | travel similarly | similar temperature | noise lines up
  ? worth discussing: Minor lighting differences | Somewhat different social energy | You focus a bit differently
  (no annoyances / clashes)

──────── Social Butterfly ↔ Studious Introvert → 40%  (hardDealbreaker=true)
  flags: Frequent guests
  ✓ why you match : similar sleep | bathroom complements | noise lines up | similar temperature
  ✗ potential clash: Frequent guests flagged as a dealbreaker | one more social | sharing | different outings

──────── Chill ↔ Substance/Late Nighter → 71%  (hardDealbreaker=false)
  ✓ why you match : social energy aligned | noise lines up | bathroom complements | similar temperature
  (substance use no longer mis-handled; would flag only if the viewer declared it a dealbreaker)
```

## Remaining notes / risks (post-fix)
- **A substance user is still "quiet" to a non-flagger** (Chill ↔ Substance/Late = 71%, no flag). This is now *correct by design* — dealbreakers only fire when the viewer declares they care — but it means discovery of substance use depends on the *viewer* having flagged it. If you want it surfaced regardless, that's a separate product call.
- **Validation cost:** `scorePair` runs a Zod parse on both inputs every call, so `rankCandidates` re-parses `me` once per candidate. Fine at current scale; if cohorts grow, validate `me` once in the API route and skip re-validation in the loop.
- **Behavior backfill is per-user, opt-in via the modal.** Until a user fills it, their substance/non-veg is `unknown` (no conflict, soft note) — intended, no data was inferred from old answers.
- **Tuning constants** live at the top of `lib/matching/index.ts` (`HARD_PENALTY=15`, `SOFT_PENALTY=5`, `DEALBREAKER_FLOOR=40`, `LIFESTYLE_FLOOR=27`) — easy to adjust if you want different separation.
