# Roomie — Project Handoff

> Continuation doc for a fresh Claude Code session. Repo: `Sohangi-Singh/Roomie` (private). Main branch auto-deploys to Vercel. Read `AGENTS.md` — it warns that this Next.js version has breaking changes vs training data; check `node_modules/next/dist/docs/` before using unfamiliar APIs.

---

# PROJECT OVERVIEW

- **Name:** Roomie
- **Purpose:** Compatibility-first roommate matching for college hostel students. Students fill a lifestyle questionnaire; the app scores every same-gender candidate in their college, shows why they match / where they clash, and lets them DM.
- **Target users:** Indian college hostel students (built for Scaler School of Technology — `sst.scaler.com`).
- **Stage:** Feature-complete MVP, deployed to Vercel, in testing. All originally-planned phases (1–6) + follow-ups done.
- **Core flow:** Landing → signup (college email) → multi-step onboarding (profile + 14-step questionnaire) → `/matches` (ranked list + filters) → open a profile (radar + breakdown + insights) → send request → mutual accept → in-app DM.

---

# TECH STACK

- **Framework:** Next.js 16.2.6 (App Router, Turbopack) · React 19.2.4 · TypeScript 5
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`, CSS `@theme` tokens — NO `tailwind.config.ts`) · Framer Motion 12.40
- **Auth + DB:** Firebase 12.13 (client: Email/Password Auth + Firestore) · `firebase-admin` 13.10 (server-side matching)
- **Charts:** Recharts 3.8 (compatibility radar)
- **Forms/validation:** React Hook Form 7.76 + `@hookform/resolvers` 5.4 + Zod 4.4
- **State:** Zustand 5.0
- **Icons:** lucide-react 1.17 (NOTE: brand icons like `Instagram` removed in this version — use `AtSign`; `Home` exists but brand mark uses `UsersRound`)
- **Utils:** clsx + tailwind-merge (`cn`)
- **Tests:** Vitest 4.1 (matching engine only)
- **Hosting:** Vercel. Matching API routes use `runtime = "nodejs"`, `dynamic = "force-dynamic"`.

---

# CURRENT APPLICATION STRUCTURE

```
app/
  layout.tsx            root: fonts (Geist + Geist_Mono + Fraunces), no-FOUC theme <script>, <Providers>
  providers.tsx         Firebase auth listener → authStore; realtime matches-version listener
  page.tsx              landing (responsive: mobile column + lg: 2-col hero, etc.)
  globals.css           @theme tokens (light) + :root.dark overrides + glass/shimmer utilities
  (auth)/layout.tsx     2-col split on lg (sage brand panel + form)
  (auth)/login/page.tsx · (auth)/signup/page.tsx   RHF + Zod forms
  onboarding/page.tsx   profile steps (Identity, Living) + 14 questionnaire steps; writes to Firestore
  (app)/layout.tsx      RequireAuth guard + TopNav (lg) + BottomNav (<lg)
  (app)/matches/page.tsx        MERGED matches+explore: ranked list + filter sheet + refresh
  (app)/explore/page.tsx        redirect('/matches')
  (app)/groups/page.tsx         create/join 2-3 sharing groups
  (app)/connections/page.tsx    "DMs": requests + conversations list (last-msg preview)
  (app)/connections/[uid]/page.tsx   chat thread (live)
  (app)/profile/[id]/page.tsx   profile; [id]="me" or a uid; radar/breakdown/insights/connect
  (app)/settings/page.tsx       edit profile, dark toggle, redo quiz, sign out
  api/matches/route.ts   GET ranked list (Admin SDK, tier sort) — the main matching endpoint
  api/match/route.ts     GET ?uid= pairwise result (Admin SDK) — used by profile page

components/
  ui/         Button LinkButton Card Chip Avatar ProgressRing SkeletonLoader Toggle Segmented
              Slider RangeBar TimePicker Input Field BottomSheet BottomNav TopNav  (barrel: index.ts)
  features/   Brand ThemeToggle RequireAuth Loader ConfigNotice CategoryIcon CategoryBreakdown
              RadarChart MatchCard MatchList InsightList FilterSheet GroupCard QuestionStep
              ConnectButton EmptyState
  features/landing/  RotatingStat SplitComparison FloatingTags

lib/
  firebase/   client.ts (web SDK + isFirebaseConfigured, placeholder fallbacks)
              auth.ts (signUp/signIn/signOut + mapAuthError + college-domain gate)
              admin.ts (server-only Admin SDK + uidFromAuthHeader)
              db.ts (ALL Firestore reads/writes + onSnapshot subscriptions)
  matching/   scoring.ts (atoms + 12 category scorers + dealbreaker logic)
              weights.ts (BASE_WEIGHTS + importance multiplier + normalization)
              insights.ts (buildInsights → reasons/annoyances/conflicts)
              index.ts (scorePair, rankCandidates, MatchResult type)
              __tests__/matching.test.ts (18 tests)
  api/        types.ts (PublicProfile, MatchFacets, ApiMatch) · matches.ts (fetchMatches/fetchMatch client)
  utils/      cn.ts · format.ts (formatTime/INR/Km/Duration, initials, etc.)

hooks/    useAuth useMatches useGroups useConnections useChat useInboxBadge useHaptics useMediaQuery
stores/   authStore onboardingStore filterStore matchesStore themeStore  (all Zustand)
types/    user questionnaire group connection message index
config/    college.ts (domain gate, YEARS) · hostels.ts (room rules, overlap/format helpers)
           questionnaire.ts (STEPS data-model, defaults, Zod schema, option sets)
           tokens.ts (JS palette mirror, scoreColor(dark), getRadarTokens(dark))
firestore.rules   (published manually in Firebase console)
```

**Key services/utilities:**
- `lib/firebase/db.ts` — single source for all DB ops. Notable: `saveQuestionnaire` & `updateQuestionnaireProfile` embed a `_profile` snapshot AND call `bumpMatchesVersion()`. `subscribeToConversation`, `subscribeToMatchesVersion`, `getLastMessagesByPeer`, `getMessagesTo`.
- `config/questionnaire.ts` — **the questionnaire is data-driven**: `STEPS[]` defines every onboarding step; `QuestionStep.tsx` renders from it. Add/edit questions here.
- `config/hostels.ts` — room-type rules + `allowedRoomTypesForHostels`, `hostelsOverlap`, `roomTypesOverlap`, `formatHostelPrefs`, `formatRoomTypePrefs`.

---

# DATABASE STRUCTURE (Firestore)

All docs keyed where noted. Timestamps are JS epoch ms (numbers, not Firestore Timestamps).

### `users/{uid}`
```
uid, email, fullName, year (1|2|3|4), gender ("male"|"female"),
hostelPrefs: HostelId[],            // ["uniworld1"] | ["uniworld2"] | both
roomTypePrefs: RoomType[],          // subset of allowed union
contactNumber (10-digit string), instagram?, bio?, photoURL?,
onboarded: boolean, createdAt, updatedAt
```
`HostelId = "uniworld1" | "uniworld2"` (display: "Uniworld 1 · Neeladri", "Uniworld 2 · Velankani").
`RoomType = "small_double" | "large_double" | "triple"`.

### `questionnaires/{uid}` — PRIVATE (owner-only reads)
Full `Questionnaire` type (see types/questionnaire.ts) PLUS server-only embedded fields:
```
_gender: Gender, _onboarded: true, _profile: PublicProfile
```
`_profile` = `{ uid, fullName, year, gender, hostelPrefs, roomTypePrefs, photoURL?, bio? }`.
Questionnaire shape:
```
sleep:{sleepTime,wakeTime (min from midnight 0-1439), naps:Freq}
cleanliness:{room,desk,laundry: Level 1-5}
noise:{tolerance:Level, gaming:Freq, reelsMusic:Freq}
study:{seriousness:Level, environment:"silent"|"music"|"ambient", mode:"solo"|"group"}
lighting:{lightsOff:"early"|"late", brightness:"dim"|"bright"}
temperature:{fanSummer,fanWinter: 0-5}      // NOTE: AC removed; fan-only, per season
bathroom:{timing:"morning"|"evening"|"night", durationMin, hygieneWeight:Level}
social:{introExtro:0-100, guests:Freq, calls:Freq}
spending:{monthly INR, common:Level, outings:Level}
outingPersona: Persona[]   // nature|shopping|arcade|cafe|nightlife|sports
travel:{maxKm, style:"spontaneous"|"planned"}
sharing:{food,clothes,cosmetics: Tri "no"|"maybe"|"yes"}
importance: Record<Category, 0|1|2>
dealbreakers: Record<DealbreakerKey, "okay"|"annoying"|"dealbreaker">
completedAt
```
`Freq = never|rarely|sometimes|often|always` (→ index 0..4). `Category` = 12 keys (sleep, cleanliness, noise, study, lighting, temperature, bathroom, social, spending, outing, travel, sharing). `DealbreakerKey = substances|nonveg|loudMusic|lateSleeping|messyRoom|frequentGuests`.

### `groups/{id}`  — groups live in ONE room, so singular hostel/roomType
```
id, name, ownerUid, memberUids: string[], size (2|3), openSlots,
hostel: HostelId, roomType: RoomType, gender, status ("open"|"full"|"closed"), createdAt
```

### `connections/{id}` — DM requests
```
id, from, to, participants: [from,to], type ("invite"|"request"|"group_request"),
groupId?, message?, status ("pending"|"accepted"|"declined"), createdAt
```

### `messages/{id}` — chat
```
id, from, to, participants: [from,to], text (1-2000 chars), createdAt
```

### `meta/matches` — realtime refresh tick
```
{ version: number, updatedAt: number }   // incremented (transaction) on any questionnaire write
```

**Relationships:** matching joins `questionnaires` only (1 read/candidate via `_profile`). Connections/messages keyed by `participants` array (`array-contains` queries). No Firestore composite indexes required (queries are single-field `where` + client-side sort/filter).

---

# FIREBASE CONFIGURATION

- **Project:** `roomie-e9632`.
- **Auth:** Email/Password enabled. College-domain gate enforced in `lib/firebase/auth.ts` (`isCollegeEmail`, domain from `NEXT_PUBLIC_COLLEGE_EMAIL_DOMAINS`). Add deployed domains to Auth → Authorized domains.
- **Firestore:** production mode, region asia-south1. Rules below — **must be published manually in console** after any change.
- **Storage:** NOT used. No photo uploads; avatars are initials on sage (`Avatar.tsx`). `photoURL` field exists but is never written.
- **Cloud Functions:** NONE. Server-side matching runs in Next.js API routes via Admin SDK (Vercel nodejs runtime), not Firebase Functions.
- **Admin SDK:** initialized in `lib/firebase/admin.ts` from `FIREBASE_*` env (service account). Used only in `app/api/*/route.ts`.

---

# FIRESTORE RULES (complete, current)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

    match /users/{uid} {
      allow read: if isSignedIn();
      allow create: if isOwner(uid) && request.resource.data.uid == uid;
      allow update: if isOwner(uid);
      allow delete: if isOwner(uid);
    }
    match /questionnaires/{uid} {
      allow read: if isOwner(uid);   // PRIVATE — matching runs server-side (Admin SDK bypasses rules)
      allow write: if isOwner(uid) && request.resource.data.uid == uid;
    }
    match /groups/{id} {
      allow read: if isSignedIn();
      allow create: if isSignedIn()
        && request.resource.data.ownerUid == request.auth.uid
        && (request.auth.uid in request.resource.data.memberUids);
      allow update: if isSignedIn() && (
        (request.auth.uid in resource.data.memberUids) ||
        (request.auth.uid in request.resource.data.memberUids)
      );
      allow delete: if isSignedIn() && resource.data.ownerUid == request.auth.uid;
    }
    match /connections/{id} {
      allow read: if isSignedIn() && (request.auth.uid in resource.data.participants);
      allow create: if isSignedIn()
        && request.resource.data.from == request.auth.uid
        && (request.auth.uid in request.resource.data.participants);
      allow update: if isSignedIn() && (request.auth.uid in resource.data.participants);
      allow delete: if isSignedIn() && request.auth.uid == resource.data.from;
    }
    match /meta/{id} {
      allow read: if isSignedIn();
      allow write: if isSignedIn();   // just an integer counter
    }
    match /messages/{id} {
      allow read: if isSignedIn() && (request.auth.uid in resource.data.participants);
      allow create: if isSignedIn()
        && request.resource.data.from == request.auth.uid
        && (request.auth.uid in request.resource.data.participants)
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.text.size() <= 2000;
      allow update: if isSignedIn()
        && (request.auth.uid in resource.data.participants)
        && request.resource.data.text == resource.data.text
        && request.resource.data.from == resource.data.from
        && request.resource.data.to == resource.data.to
        && request.resource.data.createdAt == resource.data.createdAt;
      allow delete: if isSignedIn() && request.auth.uid == resource.data.from;
    }
  }
}
```

# STORAGE RULES
N/A — Firebase Storage not used.

---

# MATCHING SYSTEM

Pure, unit-tested module in `lib/matching` (no Firebase deps → testable). Runs SERVER-SIDE only (Admin SDK in API routes) so raw answers never reach clients.

### Category scores (`scoring.ts`) — each returns 0–100
Atoms: `simLinear(a,b,range)=100*(1-|a-b|/range)` clamped; `simFreq` (range 4); `simLevel` (range 4); `simEqual(a,b,floor)` (=100 if equal else floor); `simCircularTime` (24h wrap); `simTri` (range 2).
Per-category:
- **sleep** = 0.45·`simTolerantTime`(sleepTime) + 0.35·`simTolerantTime`(wakeTime) + 0.2·simFreq(naps). `simTolerantTime`: ≤60min→100, ≤120→~93, ≤240→~75, ≤480→~28, ≤720→0 (forgiving curve so 1-2h gaps barely penalize).
- **cleanliness** = 0.5·room + 0.25·desk + 0.25·laundry (simLevel).
- **noise** = asymmetric clash model: discomfort = max(0, otherOutput − myTolerance) both ways; 100 − (sumDiscomfort/8)*100.
- **study** = 0.4·seriousness + 0.3·environment(silent/ambient/music as 0/1/2) + 0.3·simEqual(mode, floor 40).
- **lighting** = 0.55·simEqual(lightsOff, floor 20) + 0.45·simEqual(brightness, floor 50).
- **temperature** = 0.5·simLinear(fanSummer,5) + 0.5·simLinear(fanWinter,5).  *(AC removed.)*
- **bathroom** = 0.4·(100−timingSimilarity) + 0.2·duration + 0.4·hygieneWeight. **REVERSED**: DIFFERENT bath times score higher (shared-resource conflict avoidance).
- **social** = 0.5·introExtro + 0.25·guests + 0.25·calls.
- **spending** = 0.5·simLinear(monthly,15000) + 0.25·common + 0.25·outings.
- **outing** = Jaccard of outingPersona sets ×100 (60 if both empty).
- **travel** = 0.5·simLinear(maxKm,30) + 0.5·simEqual(style, floor 45).
- **sharing** = mean of simTri(food, clothes, cosmetics).

### Weights (`weights.ts`)
`BASE_WEIGHTS`: sleep 1.3, cleanliness 1.3, noise 1.2, social 1.1, study 1.0, bathroom 0.9, spending 0.9, sharing 0.9, lighting 0.8, temperature 0.8, outing 0.7, travel 0.6.
`importanceMultiplier(i) = 1 + 0.6*i` (0→×1, 1→×1.6, 2→×2.2). For each category, use `max(aImportance, bImportance)`. Weights normalized to sum 1.

### Overall score (`scorePair` in index.ts)
```
overall = Σ(categoryScore[c] * weight[c])
overall *= 0.25 ^ hardDealbreakers       // each absolute dealbreaker craters
overall -= 5 * softDealbreakers           // each annoyance chips
overall = clamp(0,100, round(overall))
if (hardDealbreakers > 0 && overall < 22) overall = 22   // FLOOR — still discoverable/DM-able
```

### Dealbreaker logic (`dealbreakerConflicts`)
`exhibits(q,key)`: lateSleeping = sleepTime<330 (before 5:30am); messyRoom = room≤2; loudMusic = reelsMusic≥3 OR gaming≥3; frequentGuests = guests≥3; substances/nonveg = stance==="okay" (no behaviour question, "okay" is the proxy for "does it").
Conflict = if B exhibits key AND A's stance is "dealbreaker" → **hard**; if "annoying" → **soft** (checked both directions).

### Sorting (`/api/matches/route.ts`)
After `rankCandidates` (by overall desc), re-sort into **preference tiers** (dominates score):
- Tier 0: hostelPrefs overlap AND roomTypePrefs overlap
- Tier 1: hostel OR room overlaps
- Tier 2: neither overlaps (still shown — discovery)
Within a tier: overall desc. `normaliseProfile()` migrates legacy `{hostel, roomType}` singular snapshots → arrays on read.

### Insights (`insights.ts → buildInsights`) — three buckets
- **reasons** ("Why you match", green): categories ≥78.
- **annoyances** ("Might be a problem, but is fine", yellow): categories 30–49 + SOFT dealbreaker lines.
- **conflicts** ("Potential clashes", pale-red): categories <30 + HARD dealbreaker lines.
Hard and soft dealbreakers NEVER mix buckets.

---

# MESSAGING SYSTEM

- **Request flow:** `ConnectButton` (on profile) → `useConnectionWith` → `createConnection({from,to,participants,type:"invite",status:"pending"})`. **No compatibility gating** — anyone can request anyone (compat only affects ranking).
- **Acceptance:** recipient sees it under "Requests for you" in `/connections`; Accept/Decline → `updateConnectionStatus(id,"accepted"|"declined")`.
- **Inbox (`/connections`):** three sections — Requests for you (incoming pending), Conversations (accepted, sorted by last message, links to chat), Sent (outgoing pending). Header subtext: "DM your requests and discuss the grey areas with them if need be."
- **Conversation (`/connections/[uid]`):** `useChat(otherUid)` → `subscribeToConversation` (Firestore `onSnapshot`, live). Messages stored flat in `messages` collection, filtered to the pair client-side, sorted by createdAt. Composer: Enter to send, Shift+Enter newline, 2000 cap, optimistic via re-subscription. Phone/Instagram surfaced in chat header.
- **Permissions:** messages participants-only (rules above). On permission-denied (rules not published), `useChat` exposes `error` and the page shows a danger card instead of hanging.
- **Badge (`useInboxBadge`):** counts unseen pending requests (`to`==me, createdAt > last DMs-list visit) + unread messages (`to`==me, createdAt > per-peer last-chat-visit). Per-device via `localStorage` keys `roomie-inbox-seen` and `roomie-chat-seen-{peer}`. `markInboxSeen()` / `markChatSeen(peer)` clear; cross-component sync via `window` event `roomie-inbox-seen`. Red pill on DMs icon in TopNav + BottomNav.

---

# AUTHENTICATION FLOW

- **Signup (`/signup`):** RHF+Zod; email refined by `isCollegeEmail`. `signUp()` → `createUserWithEmailAndPassword` + `updateProfile(displayName)` → redirect `/onboarding`.
- **Login (`/login`):** `signIn()` (also domain-gated) → redirect `/matches`.
- **User doc creation:** happens at the END of onboarding (`onboarding/page.tsx`), not at signup. Builds `User` + `Questionnaire`, calls `saveUser` + `saveQuestionnaire(q, profileSnapshot)`, sets `onboarded:true`, patches authStore, resets matches cache, → `/matches`.
- **Session:** `providers.tsx` subscribes `onAuthChange`; on user, loads `getUser` + `getQuestionnaire` into `authStore` (status: loading|authed|guest). `RequireAuth` redirects guests→/login, un-onboarded→/onboarding. `setAuth` always PATCHES (never wipes fbUser) so a quiz retake can't log the user out.

---

# IMPLEMENTED FEATURES

**Auth & onboarding:** college-email gating, email/password, 14-step data-driven questionnaire (sliders/chips/time pickers/range bars/segmented), importance flags, dealbreakers, multi-select hostel + "Not decided yet", multi-select room types (filtered to allowed union per hostel+gender), redo-quiz from settings.
**Matching:** server-side private scoring, 12 weighted categories, importance weighting, dealbreaker cratering + 22% floor, tolerant sleep curve, reversed bath time, fan summer/winter, tier-based hostel/room ranking, radar chart, category breakdown, 3-section insights.
**Discovery:** `/matches` merged list+filters (year/hostel/room/sleep/cleanliness/spending/persona/min-score) in a bottom sheet, infinite-scroll rendering, cached + realtime auto-refresh on any questionnaire write, manual refresh button.
**Social:** groups (create/join 2–3 sharing, open slots), connection requests (unrestricted), in-app DMs (live), inbox with request + unread-message badges.
**Profiles:** self + other-user view, radar, breakdown, insights, connect button, snapshot chips.
**UI:** dark mode (global toggle every page, persisted, no-FOUC), desktop responsive (TopNav on lg, BottomNav <lg, 2-col landing/auth, 2-col match grid), premium Framer Motion throughout.

---

# PENDING / NOT BUILT

- **Photo uploads** — `photoURL` field exists but no Storage integration; avatars are initials.
- **Cloud Function precomputed matches** — currently every `/matches` open recomputes against all same-gender candidates (O(N) reads). Fine for testing; at ~1200+ daily users move top-K into `matches/{uid}` via a scheduled/on-write Function for flat cost.
- **Cross-device badge sync** — badges are `localStorage` per-device; would need an `inboxSeenAt`/`lastReadAt` on the user doc.
- **Richer desktop layout** — current desktop is responsive (top nav, wider columns, grids) but not a bespoke multi-pane app (e.g. profile side-panel beside the list).
- **License** — `LICENSE` is "All Rights Reserved" (proprietary); repo private.

---

# RECENTLY REQUESTED CHANGES

**All implemented** (this is the audit trail; nothing here is outstanding unless noted):
- Matching: "Not decided yet" hostel, multi-select hostel (overlap), multi-select room (overlap), reversed bath time, gentler sleep/wake curve, 22% dealbreaker floor, tier-based hostel+room ranking. ✅
- Match explanations: 3 sections (green Why you match / yellow Might be a problem / pale-red Potential clashes); annoying→yellow, dealbreaker→red, never mixed. ✅
- Messaging: DMs allowed regardless of compatibility; Match+Explore merged into `/matches`; dedicated "DMs" nav + in-app chat; inbox helper subtext; red badge for new requests AND messages. ✅
- Questionnaire UX: dealbreaker subheading "Choose dealbreakers carefully and minimally."; importance subheading "Tap on one, 2 times to increase the intensity." ✅
- Dark mode: global toggle on every page; readability pass (brighter accent-100/200, soft variants, muted/faint, radar grid lines visible, lighter score-color greens, importance L1 = accent-300). ✅
- Desktop responsiveness: TopNav, wider container, 2-col landing hero, 2-col auth, 2-col match grid; landing comparison-card accent bars fixed to full-height clean edges on lg. ✅
- Hostel naming: kept "Uniworld 1/2" (IDs stay `uniworld1`/`uniworld2`). ✅
- Branding: brand icon `UsersRound` (was Home); branded `app/icon.svg` favicon. ✅

---

# KNOWN BUGS / EDGE CASES

- **Logout-on-retake (UNREPRODUCED):** user reported being logged out after retaking the quiz. Could not reproduce from code (`setAuth` patches, never clears fbUser; no signOut path on that flow). Defensive guards added. If it recurs, get exact repro steps.
- **Per-device badges:** unread counts reset per device until you visit DMs there (localStorage). Not a bug, a limitation.
- **Legacy data:** users created before the multi-select migration have singular `hostel`/`roomType`. `normaliseProfile()` migrates on read in `/api/matches`; `formatHostelPrefs/RoomTypePrefs` accept undefined. Old accounts may rank in Tier 2 until they re-save (which writes new arrays).
- **Cost at scale:** matching reads scale with cohort size × visits (see Pending → Cloud Function).
- **Firestore rules must be re-published manually** after any `firestore.rules` edit — easy to forget; symptom is permission-denied on chat/matches.

---

# DESIGN SYSTEM

- **Palette (light):** canvas `#FEFCF6`, sand `#F4EFE6`, surface `#FFFDF8`; accent (sage) ramp 50→900 around primary `#5E6C5B`; ink `#211E18`, muted `#6B6F66`, faint `#9DA096`; success `#5E7A59`, warning `#B8893E`, danger `#B5635A`.
- **Palette (dark, `:root.dark`):** canvas `#0A100A`, sand `#181F17`, surface `#1F281A`, surface-2 `#2D3925`; accent ramp brightened (accent-500 `#818F6F`, accent-100 `#354826`, accent-200 `#485E3A`); ink `#F4EFE6`, muted `#B6BCAE`, faint `#8A8E82`; brighter soft status tints.
- **Theme system:** Tailwind v4 `@theme` declares tokens → utilities (`bg-canvas`, `text-ink`, etc.). Dark mode = `.dark` class on `<html>` overriding the CSS vars (NOT `data-theme` — that was tried and didn't cascade reliably with v4). `themeStore` (Zustand) toggles via `classList.add/remove("dark")` + persists to `localStorage["roomie-theme"]`. No-FOUC inline `<script>` in `app/layout.tsx` sets `.dark` before hydration. JS color mirrors in `config/tokens.ts` for Recharts/inline (`scoreColor(score, dark)`, `getRadarTokens(dark)`).
- **Typography:** UI = Geist (sans), display/headings = Fraunces (serif, used via `font-display`), mono = Geist Mono. Loaded in `app/layout.tsx` via `next/font/google`.
- **Conventions:** large radii (rounded-2xl/3xl/4xl), soft shadows (shadow-soft/card/lift), `glass` utility (blur+translucent) for navs/sheets, spring Framer transitions, mobile-first; every responsive addition is `lg:`-scoped or `hidden lg:*`/`lg:hidden` so mobile never changes.

---

# ENVIRONMENT VARIABLES

Public (client, shipped to browser — safe):
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID` — Firebase web SDK config.
- `NEXT_PUBLIC_COLLEGE_NAME` — display name ("Scaler School of Technology").
- `NEXT_PUBLIC_COLLEGE_EMAIL_DOMAINS` — comma-separated allowed signup domains ("sst.scaler.com").

Server (secret — never `NEXT_PUBLIC`):
- `FIREBASE_PROJECT_ID` — Admin SDK project id.
- `FIREBASE_CLIENT_EMAIL` — service-account email.
- `FIREBASE_PRIVATE_KEY` — service-account private key. In Vercel paste raw (with literal `\n`); `admin.ts` replaces `\n`→newline. In `.env.local` keep wrapped in double quotes.

App runs without real keys (shows ConfigNotice) but auth/matching need them. `.env.local` is gitignored; `.env.local.example` is the template.

---

# DEPLOYMENT

- **Local:** `npm install` → copy `.env.local.example` → `.env.local` (fill values) → `npm run dev` (port 3000).
- **Verify:** `npm run typecheck` · `npm run lint` · `npm test` (18 matching tests) · `npm run build`.
- **Deploy:** push to `main` → Vercel auto-builds/deploys. Add ALL 11 env vars in Vercel project settings (incl. the 3 server `FIREBASE_*`). Add the `*.vercel.app` domain to Firebase Auth → Authorized domains.
- **Firestore rules:** publish `firestore.rules` manually in console (or `firebase deploy --only firestore:rules`). REQUIRED after any rules change — chat + realtime matches depend on `/messages` and `/meta` blocks.
- Preview tooling: `.claude/launch.json` runs `npm run start -p 3100` for screenshots (gitignored).

---

# ARCHITECTURAL DECISIONS (preserve these)

1. **Matching is server-only (Admin SDK in API routes), questionnaires are owner-only readable.** This is the privacy guarantee — clients NEVER receive others' raw answers, only computed results + coarse facets. Don't move scoring to the client or loosen the questionnaire read rule.
2. **`_profile` snapshot embedded in questionnaire docs** → 1 read per candidate (not 2). Keep `saveUser`/`saveQuestionnaire`/`updateQuestionnaireProfile` writing it in sync.
3. **`matching` module is pure** (no Firebase imports) so it's unit-testable and runnable on server. Keep it dependency-free.
4. **Matches are cached (3-min TTL) + shared** between surfaces via `matchesStore`; realtime invalidation via `meta/matches` version + `onSnapshot`. Avoids recompute on every navigation.
5. **Groups use singular hostel/roomType** (a group is one physical room) while Users use arrays (preferences). Intentional asymmetry.
6. **Tier ranking dominates score** so users mostly see realistically-roomable people, but incompatible ones are still visible (never hard-filtered) for discovery/DM.
7. **Dark mode via `.dark` class** (not `data-theme`) — Tailwind v4 + `@theme` cascades reliably this way.
8. **Mobile is sacred:** all desktop work is `lg:`-scoped. Never alter base/mobile classes when doing responsive work.
9. **Data-driven questionnaire** (`config/questionnaire.ts STEPS`) — add questions there, not by hand-coding steps.
10. **Tailwind v4, no config file** — tokens live in `globals.css @theme`. Next 16 has breaking changes; consult `node_modules/next/dist/docs/`.

---

# CURRENT STATUS

- **Working:** landing, auth, onboarding, matching + ranking, profiles, groups, requests, in-app DMs (if rules published), dark mode, desktop layouts, all 18 tests, production build green. Deployed at `roomie-tau.vercel.app`.
- **Partially working / depends on user action:** realtime matches + chat REQUIRE the latest `firestore.rules` published (`/meta` + `/messages`). Photo `photoURL` plumbed but unused.
- **Broken:** none known. (Logout-on-retake unconfirmed.)
- **Next priorities:** (a) confirm latest rules published; (b) photo uploads (Storage); (c) Cloud Function precompute if scaling; (d) cross-device badge sync; (e) reproduce/close the logout report.

---

# START HERE

If continuing development:
1. **Read `AGENTS.md`** (Next 16 has breaking changes vs your training data — check `node_modules/next/dist/docs/` before unfamiliar APIs). Skim this file's ARCHITECTURAL DECISIONS.
2. **Sanity check the build:** `npm install && npm run typecheck && npm run lint && npm test && npm run build`. All must pass before changing anything.
3. **Confirm Firestore rules are published** in the Firebase console (`roomie-e9632`) — the file is `firestore.rules`; `/meta` and `/messages` blocks are required for realtime matches + chat. If chat shows a "Chat isn't enabled" error, this is why.
4. **Then do whatever the user asks.** If they have no specific task, the highest-value next items are: photo uploads (Firebase Storage + Avatar), then Cloud Function match precompute (sustainability at scale). 
5. **Workflow norms this project follows:** make the change → `typecheck`/`lint`/`test`/`build` green → `git commit` (Co-Authored-By trailer) → `git push` (auto-deploys). Keep mobile untouched when doing desktop work (`lg:`-scope everything). Verify visual/UI changes with the preview tool at real widths (1440 desktop, 375 mobile) before claiming done.
