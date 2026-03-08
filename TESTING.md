# PopCam Backend Refactor — Testing Guide

## Overview

This document describes how to test the iOS → shared web backend migration.
All automated tests live in `popcamcode/scripts/` and run against a local
Next.js dev server.

---

## Prerequisites

```bash
# In the web backend repo
cd ~/popcamcode
npm install

# Start the dev server (keep this running while tests execute)
npm run dev
```

The dev server must be running on `http://localhost:3000` for all tests.

---

## Phase 1 — Mobile Bearer Token Auth

**What it tests:**
The web backend accepts Clerk JWTs from the iOS app via `Authorization: Bearer`
headers, in addition to the existing cookie-based browser session.

**Run:**
```bash
cd ~/popcamcode
node scripts/test-phase1.mjs
```

**Tests:**

| # | Description | Expected |
|---|---|---|
| 1 | `GET /api/user/credits` — no auth header | `401 Unauthorized` |
| 2 | `GET /api/user/credits` — invalid Bearer token | `401 Unauthorized` |
| 3 | `GET /api/user/credits` — valid Clerk JWT in Bearer | `200` with `{ credits: N }` |

**How test 3 works:**
The script uses `@clerk/backend` to call `clerk.sessions.getToken(sessionId)`
for the first active session it finds in the Clerk account. This gives a real
JWT identical to what the iOS app sends. It requires at least one signed-in
browser session to exist — open `pop-cam.com` and sign in if the test fails.

**Files changed (web backend):**
- `lib/mobile-auth.ts` — `getMobileUserId(request?)` helper
- `app/api/user/credits/route.ts` — uses `getMobileUserId`
- `app/api/user/sync/route.ts` — uses `getMobileUserId`
- `app/api/generate/route.ts` — uses `getMobileUserId`
- `app/api/upload-url/route.ts` — uses `getMobileUserId` (also added auth guard)
- `app/api/custom-prompts/route.ts` — uses `getMobileUserId`
- `app/api/prompt-history/route.ts` — uses `getMobileUserId`
- `app/api/nanobanana/route.ts` — uses `getMobileUserId`
- `next.config.js` — CORS headers for all `/api/*` routes

---

## Phase 2 — AI Generation Through Web Backend

**What it tests:**
AI generation (Gemini / OpenAI) routes through the web backend instead of
being called directly from the iOS app. API keys are no longer embedded in
the iOS binary.

**Run:**
```bash
cd ~/popcamcode
node scripts/test-phase2.mjs
```

**Tests:**

| # | Description | Expected |
|---|---|---|
| 1 | `POST /api/nanobanana` — no auth | `401` |
| 2 | `POST /api/nanobanana` — invalid token | `401` |
| 3 | `GET /api/upload-url` — valid token | `200` with `uploadUrl` + `key` |
| 4 | `POST /api/nanobanana` — valid token + tiny test image | Auth passes (200, 402, or Gemini 500 for invalid image) |

> **Note on test 4:** A 1×1 PNG is used to keep the test fast. Gemini
> rejects it as too small, returning 500. This is expected — it proves auth
> worked and the request reached Gemini. A real device image will return 200.

**Files changed (iOS app):**
- `src/services/apiClient.ts` — NEW: shared fetch client with Clerk Bearer token provider
- `App.tsx` — wires `setApiTokenProvider()` at auth init (same place Supabase token is set)
- `src/services/nanoBananaService.ts` — calls `POST /api/nanobanana` instead of Gemini directly
- `src/services/openaiService.ts` — calls `POST /api/generate` instead of OpenAI directly
- `src/screens/NanoBananaResultScreen.tsx` — replaces `deductCredits(1)` with `refetchCredits()` to prevent double-deduction (backend already deducts)

---

## Phase 3 — Credits via Web Backend (No Direct Supabase Writes)

**What it tests:**
Credit fetching and user sync go through the web backend instead of direct
Supabase client calls. The backend is now the single source of truth for
credit operations.

**Run:**
```bash
cd ~/popcamcode
node scripts/test-phase3.mjs
```

**Tests:**

| # | Description | Expected |
|---|---|---|
| 1 | `POST /api/user/sync` — no auth | `401` |
| 2 | `POST /api/user/sync` — valid token + email | `200` with `{ user }` |
| 3 | `GET /api/user/credits` — valid token | `200` with `{ credits: N }` |
| 4 | Credits consistent — sync then fetch returns same value | credits from sync ≈ credits from credits endpoint |

**Files changed (iOS app):**
- `src/hooks/useCredits.ts` — replaces Supabase calls with `apiFetch('/api/user/sync')` and `apiFetch('/api/user/credits')`; removes `deductCredits` export (backend handles it)
- `src/screens/NanoBananaResultScreen.tsx` — removes `supabaseService.saveGeneratedImage()` (backend records in `/api/nanobanana`); removes unused `supabaseService` import

---

## Phase 4 — StoreKit Receipt Validation

**What it tests:**
After Apple confirms an in-app purchase, the iOS app calls the web backend
to validate the receipt with Apple and add credits. Supabase is no longer
written to directly from the client.

**Run:**
```bash
cd ~/popcamcode
node scripts/test-phase4.mjs
```

**Tests:**

| # | Description | Expected |
|---|---|---|
| 1 | `POST /api/storekit/verify` — no auth | `401` |
| 2 | `POST /api/storekit/verify` — missing fields | `400` |
| 3 | `POST /api/storekit/verify` — unknown productId | `400` |
| 4 | `POST /api/storekit/verify` — valid auth + known productId + fake receipt | `400` with `appleStatus` in body (auth passes; Apple correctly rejects fake receipt) |

> **Note on test 4:** A fake base64 receipt is used to confirm the full
> auth → routing → Apple validation pipeline runs. Apple returns a non-zero
> status code (e.g. 21002) which the backend converts to a 400 response.
> Real device purchases will return 200.

**Files changed:**
- `app/api/storekit/verify/route.ts` (web backend) — NEW: receipt validation endpoint
- `src/screens/PurchaseCreditsScreen.tsx` (iOS) — calls `apiFetch('/api/storekit/verify')` instead of `supabaseService.addCredits()`

**Production setup:**
Set `APPLE_IAP_SHARED_SECRET` in the Vercel environment (App-Specific Shared
Secret from App Store Connect → App → In-App Purchases → Shared Secret).
Without it, Apple still validates the receipt but without the shared secret
confirmation step.

---

## Manual Testing (On Device / Simulator)

After running automated tests, verify end-to-end on device:

```
1. Open app — credits display should load (from web backend)
2. Pick a photo → NanoBanana style → Generate
   - Network inspector should show requests to pop-cam.com, not api.openai.com or generativelanguage.googleapis.com
   - Generation should succeed
   - Credits should decrement (fetched from web backend after generation)
3. Open Gallery — previously generated images should appear
4. Check web app (pop-cam.com) — same user's history and credits should match
```

---

## Troubleshooting

**"No active sessions found" in test scripts**
Open `https://pop-cam.com` in a browser and sign in. The test script needs
at least one active Clerk session to borrow a token from.

**401 on all requests even with valid token**
Check that `CLERK_SECRET_KEY` in `popcamcode/.env` matches the Clerk instance
used by the iOS app (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `popcam-react-native/.env`).
Both should use `pk_test_bW9yZS1wb3NzdW0tMjUuY2xlcmsuYWNjb3VudHMuZGV2JA`.

**Credits not updating after generation**
The backend deducts credits. The iOS app calls `refetchCredits()` after
generation which calls `GET /api/user/credits`. If credits don't update,
check the Vercel function logs for `/api/nanobanana` to confirm deduction ran.

**CORS errors**
Ensure the `feat/mobile-auth` branch is deployed to Vercel. CORS headers are
set in `next.config.js` for all `/api/*` routes.
