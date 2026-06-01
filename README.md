<div align="center">

# Roomie

**Find your kind of roommate.**

A calm, compatibility-first web app that matches Indian college hostel students with
future-year roommates based on how they actually live — sleep, study, cleanliness,
noise, spending, social energy and more. Not luck. Not whoever's left.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=black)
![Framer Motion](https://img.shields.io/badge/Framer%20Motion-12-0055FF?logo=framer&logoColor=white)

Mobile-first · premium and minimal · privacy-first.

</div>

---

## Overview

Picking a roommate for the next year is usually guesswork or "whoever asked first."
Roomie turns it into a calm, compatibility-driven decision. Students fill in a short,
playful questionnaire (sliders and chips, not boring forms), and Roomie scores every
potential roommate of the same gender in their college — showing **why** they match and
**where** they might clash, with a radar chart and a category-by-category breakdown.

Crucially, **your raw answers are never visible to other students.** Matching runs on
the server; everyone else only sees the resulting compatibility, never your inputs.

## Features

- **College-gated email sign-up** — only your college's email domain(s) can join.
- **Delightful onboarding** — a multi-step questionnaire built from sliders, chips,
  time pickers and range bars, with progress, spring transitions and skeleton loaders.
- **Real compatibility scoring** — weighted, category-wise matching with importance
  flags and hard dealbreaker penalties, plus human-readable "why you match" and
  "potential clashes" insights.
- **Match results & Explore** — a sorted list with compatibility rings and a radar
  chart, plus a filterable Explore page (year, hostel, room type, sleep, cleanliness,
  spending tier, outing vibe, minimum match).
- **Groups** — create 2- or 3-sharing groups and let compatible people request open spots.
- **Private contact** — phone / Instagram are revealed only after a mutual connection.
  No public reviews. No toxic feeds. No ranking people.
- **Same-gender, same-year-aware** matching, with hostel room-type rules encoded exactly
  per policy.

## Tech stack

| Area        | Choice                                                          |
| ----------- | --------------------------------------------------------------- |
| Framework   | Next.js (App Router) 16 · React 19 · TypeScript                 |
| Styling     | Tailwind CSS v4 (CSS `@theme` tokens) · Framer Motion           |
| Auth & DB   | Firebase Authentication (email) · Cloud Firestore               |
| Server      | Firebase **Admin SDK** in Next.js Route Handlers (private matching) |
| Charts      | Recharts (compatibility radar)                                  |
| Forms       | React Hook Form · Zod                                           |
| State       | Zustand                                                         |
| Tests       | Vitest (pure matching engine)                                   |
| Hosting     | Vercel                                                          |

## Architecture

Matching is **privacy-first**: the browser never downloads anyone else's answers.

```
  Browser (client)                         Server (Vercel)                 Firestore
  ────────────────                         ───────────────                 ─────────
  signed-in user ──ID token──▶  /api/matches  (Admin SDK) ──reads──▶  questionnaires
                                     │                                  (owner-only
                 ◀── scores + ───────┘                                   to clients)
                     insights +
                     coarse facets only
```

- **Privacy** — `questionnaires` are readable only by their owner (Firestore rules).
  Compatibility is computed server-side with the Admin SDK; clients receive only the
  score, radar, category breakdown, insights, and coarse filter facets
  (early/late · relaxed/tidy · budget/moderate/premium · outing tags) — never raw answers.
- **Performance** — match lists are cached per-user (short TTL) and **shared** between
  Matches and Explore, so navigating between them is instant and doesn't re-hit the
  database. Long lists render incrementally for smooth scrolling. Each candidate costs a
  single read (a compact public-profile snapshot is stored alongside the private answers).
- **Mobile-first** — a persistent bottom nav, bottom-sheet filters, large rounded cards,
  soft shadows, and tasteful spring micro-interactions throughout.

## How matching works

`lib/matching` is a pure, unit-tested module:

- Each of **12 categories** (sleep, cleanliness, noise, study, lighting, temperature,
  bathroom, social, spending, outings, travel, sharing) scores **0–100**. Noise uses an
  asymmetric "discomfort" model (a real clash, not mere difference); sleep/wake use
  circular-time similarity; temperature compares summer **and** winter fan preferences.
- Scores combine with **importance-weighted** weights — if either person flags a category
  as important, it counts for more.
- **Dealbreakers** are applied last: an absolute dealbreaker conflict craters the score;
  annoyances chip away at it.
- Insights are generated from the strongest and weakest categories plus any dealbreaker
  conflicts.

```bash
npm test   # runs the matching-engine unit tests
```

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in the values (see [Environment variables](#environment-variables)).

### 3. Firebase setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication → Sign-in method → Email/Password → Enable.**
3. **Firestore Database → Create database** (production mode, region `asia-south1`).
4. **Project settings → General → Your apps → Web app** → copy the config into the
   `NEXT_PUBLIC_FIREBASE_*` vars.
5. **Project settings → Service accounts → Generate new private key** → copy
   `client_email` and `private_key` into the server-side vars.
6. Publish the rules from [`firestore.rules`](./firestore.rules) (Firestore → Rules → Publish,
   or `firebase deploy --only firestore:rules`).

### 4. Run

```bash
npm run dev      # http://localhost:3000
```

> Sign up with two or more accounts of the same gender to see matches in action.

## Environment variables

**Public (client)** — safe to expose, shipped to the browser:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` … `_APP_ID` | Firebase Web SDK config (6 values) |
| `NEXT_PUBLIC_COLLEGE_NAME` | Display name of the college |
| `NEXT_PUBLIC_COLLEGE_EMAIL_DOMAINS` | Comma-separated allowed sign-up domains |

**Secret (server only)** — never prefixed with `NEXT_PUBLIC_`:

| Variable | Purpose |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Admin SDK project id |
| `FIREBASE_CLIENT_EMAIL` | Service-account email |
| `FIREBASE_PRIVATE_KEY` | Service-account private key (quoted, with `\n` line breaks) |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Matching-engine unit tests |

## Project structure

```
app/
  (auth)/                 login · signup
  (app)/                  authed shell (bottom nav):
                          matches · explore · groups · connections · settings · profile/[id]
  onboarding/             multi-step questionnaire
  api/matches · api/match server-side, private compatibility (Admin SDK)
  page.tsx                landing
components/
  ui/                     Button · Card · Slider · RangeBar · TimePicker · Toggle · Chip ·
                          Segmented · Avatar · ProgressRing · Skeleton · BottomSheet · BottomNav · Input
  features/               RadarChart · MatchCard · MatchList · InsightList · CategoryBreakdown ·
                          FilterSheet · GroupCard · QuestionStep · ConnectButton · Brand · RequireAuth
lib/
  firebase/               client · auth · db · admin
  matching/               scoring · weights · insights · index  (+ __tests__)
  api/                    types · matches (client fetch helpers)
  utils/                  cn · format
hooks/                    useAuth · useMatches · useGroups · useConnections · useHaptics · useMediaQuery
stores/                   authStore · onboardingStore · filterStore · matchesStore
types/                    user · questionnaire · group · connection
config/                   tokens · college · hostels · questionnaire
firestore.rules           security rules
```

## Security & privacy

- **Answers are private.** `questionnaires` are owner-only at the database level; matching
  runs server-side with the Admin SDK, so no client can read another student's answers.
- **Profiles** are readable by signed-in users; **contact details** are surfaced in the app
  only after a mutual connection.
- **Same-gender, same-college** matching is enforced.

## Deployment (Vercel)

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
2. Add **all** env vars in Project Settings — including the three server-side
   `FIREBASE_*` values.
3. Deploy.
4. Add your `*.vercel.app` domain under **Firebase Auth → Settings → Authorized domains**.

## Configuration notes

- **College domains** are set via `NEXT_PUBLIC_COLLEGE_EMAIL_DOMAINS`.
- **Hostel room-type rules** live in `config/hostels.ts` as the single source of truth:
  Uniworld 1 (Neeladri) · female → Small Double; Uniworld 2 (Velankani) · female → Triple
  or Small Double; Uniworld 1 · male → Large/Small Double or Triple; Uniworld 2 · male →
  Small Double or Triple.
- Some dealbreaker behaviours (e.g. substances, non-veg) are inferred from a person's own
  stance, since there's no separate behaviour question.

## Roadmap

- Precompute matches in a scheduled Cloud Function for flat read-cost at large scale.
- Move contact details behind the server so they're only fetched after a mutual connection.
- Profile photo uploads (Firebase Storage).

## License

Copyright © 2026 Sohangi Singh. **All rights reserved.**

This project is proprietary. The code, design and assets may not be copied,
forked, modified, redistributed or used to create derivative works without
prior written permission. See [`LICENSE`](./LICENSE) for the full notice.
