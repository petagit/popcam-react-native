# PopCam: iOS → Shared Web Backend Refactor Plan

## Context

Both apps (web and iOS) already share the same Supabase database and Clerk auth provider.
The goal is to route all iOS API calls through the web backend (`pop-cam.com`) so there
is one backend to maintain instead of two.

## Repo Branches

| Repo | Branch |
|---|---|
| `popcam-react-native` | `feat/shared-backend` |
| `popcamcode` | `feat/mobile-auth` |

---

## What Stays the Same

- Supabase DB (no migration needed — already shared)
- Clerk auth provider (both apps already use it)
- Cloudflare R2 storage buckets
- StoreKit for iOS in-app purchases (Apple-mandated)
- Stripe for web payments

---

## What Changes

### iOS App (`popcam-react-native`)
- Stops calling OpenAI and Gemini directly
- Stops writing credits/images directly to Supabase from the client
- Calls web backend API routes instead, with a Clerk JWT Bearer token

### Web Backend (`popcamcode`)
- Auth layer updated to accept both cookie-based (web) and Bearer token (mobile) auth
- CORS configured for mobile requests
- Middleware updated to not redirect API-only requests
- New endpoint added for StoreKit receipt validation

---

## Phase 1 — Web Backend: Accept Mobile Auth Tokens

**Goal:** Make every existing API route accept a Clerk JWT Bearer token in addition
to the existing cookie-based browser session.

**Files changed in `popcamcode`:**

| File | Change |
|---|---|
| `lib/mobile-auth.ts` | New helper: resolves userId from either cookie session or Bearer token |
| `app/api/user/credits/route.ts` | Use `getMobileUserId()` instead of `auth()` |
| `app/api/user/sync/route.ts` | Use `getMobileUserId()` instead of `auth()` |
| `app/api/generate/route.ts` | Use `getMobileUserId()` instead of `auth()` |
| `app/api/upload-url/route.ts` | Use `getMobileUserId()` instead of `auth()` |
| `app/api/custom-prompts/route.ts` | Use `getMobileUserId()` instead of `auth()` |
| `app/api/prompt-history/route.ts` | Use `getMobileUserId()` instead of `auth()` |
| `next.config.js` | Add CORS headers for all `/api/*` routes |
| `middleware.ts` | Skip canonical host redirect for API routes |

**Test criteria:**
- `GET /api/user/credits` with `Authorization: Bearer <clerk_jwt>` → 200
- `GET /api/user/credits` with no token → 401
- Web app browser session still works unchanged

---

## Phase 2 — iOS: Replace Direct AI Calls

**Goal:** Route OpenAI and Gemini calls through the web backend. API keys no longer
embedded in the iOS app.

**New file in `popcam-react-native`:**

```
services/api-client.ts
  - Base URL: EXPO_PUBLIC_BACKEND_URL (default: https://pop-cam.com)
  - Attaches Clerk JWT to every request as Authorization: Bearer <token>
  - Wraps fetch with standard error handling
```

**Files changed in `popcam-react-native`:**

| File | Change |
|---|---|
| `services/api-client.ts` | New — shared API client with auth header |
| `services/OpenAIService.ts` | Replace direct OpenAI call → `POST /api/generate` via api-client |
| `services/NanoBananaService.ts` | Replace direct Gemini call → `POST /api/nanobanana` via api-client |
| `services/R2Service.ts` | Replace direct R2 presign → `GET /api/upload-url` via api-client |

**Test criteria:**
- Image generation works on TestFlight build
- Network inspector shows requests going to `pop-cam.com`, not `api.openai.com`
- No OpenAI or Gemini API keys in iOS app bundle

---

## Phase 3 — iOS: Replace Direct Supabase Writes

**Goal:** Credit deduction and image recording happen server-side only, not from
the client. Prevents client-side manipulation.

**Files changed in `popcam-react-native`:**

| File | Change |
|---|---|
| `services/SupabaseService.ts` | Remove `deductCredits()` and `recordGeneratedImage()` write calls |
| `hooks/useCredits.ts` | Fetch credits from `GET /api/user/credits` instead of Supabase directly |
| `services/SupabaseService.ts` | Keep read-only Supabase calls (prompt history display, etc.) |

**Note:** Custom prompt reads can stay as direct Supabase reads for now — lower risk.

**Test criteria:**
- Credits deduct correctly after generation (confirmed in web Prisma DB)
- Generated image appears in history on both web and iOS
- Attempting to manually set credits via Supabase client is blocked by RLS

---

## Phase 4 — Web Backend: StoreKit Receipt Validation

**Goal:** After Apple confirms an iOS in-app purchase, the iOS app calls the web
backend to add credits. Web backend validates the receipt with Apple before crediting.

**New file in `popcamcode`:**

```
app/api/storekit/verify/route.ts
  POST — accepts { receiptData: string, productId: string }
  Auth: Bearer token (mobile only)
  - Verifies receipt with Apple's verification server
  - Maps productId → credit amount:
      com.popcam.app.credits24 → 24 credits
      com.popcam.app.credits48 → 48 credits
      com.popcam.app.credits96 → 96 credits
  - Adds credits via Prisma (same addCredits() used by Stripe webhook)
  - Returns { credits: newTotal }
  - Rejects duplicate receipts
```

**Files changed in `popcam-react-native`:**

| File | Change |
|---|---|
| `services/StoreKitService.ts` | After purchase success, call `POST /api/storekit/verify` instead of writing to Supabase directly |

**Test criteria:**
- Sandbox StoreKit purchase adds correct credits
- Duplicate receipt is rejected (idempotency)
- Credits visible on both iOS app and web app immediately

---

## Testing Checklist

```
Phase 1
  [ ] curl /api/user/credits with Bearer token → 200
  [ ] curl /api/user/credits with no token → 401
  [ ] Web app browser login still works

Phase 2
  [ ] Image generation works on iOS branch build
  [ ] Network logs show pop-cam.com, not api.openai.com
  [ ] Upload URL flow works

Phase 3
  [ ] Credits deduct after generation (verified in DB)
  [ ] Generated image saved to history
  [ ] Custom prompts save/load correctly

Phase 4
  [ ] Sandbox IAP adds correct credits
  [ ] Duplicate receipt rejected
  [ ] Credits reflected on both platforms
```

---

## Merge Strategy

1. Each phase is reviewed and tested before moving to the next
2. `popcamcode/feat/mobile-auth` is deployed to a Vercel preview URL for testing
3. iOS `feat/shared-backend` points at the preview URL during development
4. Only after all phases pass: merge web backend → master, then iOS → master
5. iOS master → TestFlight → App Store submission
