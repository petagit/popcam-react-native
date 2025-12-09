# PopCam Documentation

## Overview
PopCam is an Expo-managed React Native app that turns mobile photos into AI-generated infographics. The experience is gated by Clerk authentication and organized with a stack navigator: signed-out users see a marketing landing page with authentication flows, while signed-in users land directly in the camera-driven experience. Infographics are generated through OpenAI image edits, persisted locally with AsyncStorage + `expo-file-system`, and optionally associated with user credit balances stored in Supabase.

## Tech Stack
- Expo SDK 53 with React 19 and React Native 0.79
- TypeScript throughout the app (`tsconfig.json`)
- Navigation via `@react-navigation/native` + stack navigator
- Clerk Expo SDK for authentication and session management
- Supabase JavaScript client (`@supabase/supabase-js`) for credit accounting
- Expo modules: Camera, ImagePicker, FileSystem, MediaLibrary, LinearGradient, StatusBar, etc.
- UI: Tailwind-in-RN (`twrnc`) plus bespoke styles in `src/styles/sharedStyles.ts`

## Project Layout (selected)
```
App.tsx               // App entry, Clerk provider, navigation logic
index.ts              // Expo root registration
src/
  components/         // Camera button, sign-out button, profile card
  constants/          // Centralized config & environment lookups
  hooks/              // Custom hooks (user credits)
  screens/            // All navigation destinations
  services/           // API & persistence services (OpenAI, storage, Supabase)
  styles/             // Shared design tokens and StyleSheet helpers
  types/              // Shared TypeScript types (navigation, data models)
  utils/              // Image utilities (conversion, storage hygiene)
assets/               // Logos, landing imagery, splash assets
```

## Navigation & Routing
`App.tsx` defines two stacks against a shared `NavigationContainer`:
- **AuthenticatedApp** (`Home`, `Camera`, `Analysis`, `Gallery`, `Settings`) – default route `Camera`, header hidden, custom horizontal card animation.
- **UnauthenticatedApp** (`Landing`, `SignIn`, `SignUp`, `Camera`) – default route `Landing`; camera is available in demo mode.
`RootStackParamList` in `src/types/index.ts` keeps route params strongly typed.

## Core Screens
- `LandingScreen`: Marketing funnel with animated before/after imagery, Google OAuth CTA (via Clerk), email flows as fallback.
- `SignInScreen` / `SignUpScreen`: Email-password auth, Google OAuth, email verification, share visual assets from `/assets/signin-assets`.
- `HomeScreen`: Authenticated welcome hub, quick actions to camera/gallery/settings, recent analyses preview, profile and sign-out controls.
- `CameraScreen`: Camera view powered by `expo-camera`; supports capture, gallery import, credit checks via `useCredits`, infographic generation with OpenAI, share & reveal toggles, persistent storage via `storageService`.
- `AnalysisScreen`: Detail view for a single analysis with infographic/original toggle, share/save/delete actions, haptic feedback, drawer-style action sheet.
- `GalleryScreen`: Grouped (by day) grid gallery, syncs with AsyncStorage, supports refresh, delete, navigation to detail.
- `SettingsScreen`: Local preference toggles (auto-save, quality, tag display), data clearing, simple about section.
- `NanoBananaScreen`: Preset-driven “Nano Banana Lab” that uses Google Gemini image generation to create new portraits, consuming 1 credit per run and optionally referencing an uploaded photo.

## Services & Utilities
- `openaiService`: Wraps the OpenAI Images Edits endpoint (`gpt-image-1`); handles temporary file creation from base64, FormData upload, response parsing, and cleanup.
- `storageService`: AsyncStorage orchestration for analyses, API key, preferences; handles migrations, per-user keys, file lifecycle (delete/orphan cleanup) using `imageUtils` helpers.
- `supabaseService`: Instantiates Supabase client from env vars, manages credit retrieval/deduction/top-up, user bootstrap on first query.
- `nanoBananaService`: Calls the Google Gemini image generation endpoint (branded in-app as Nano Banana) and returns base64 images for local persistence.
- `useCredits` hook: Bridges Clerk `useUser` with Supabase credit methods, caches state, exposes helpers (`deductCredits`, `hasEnoughCredits`, `refetchCredits`).
- `imageUtils`: Converts URIs to base64, copies/saves images into app storage, validates format/size, cleans orphaned files, reports storage stats.

## Data Models
`src/types/index.ts` defines:
- `ImageAnalysis`: Canonical record saved per capture (URIs, description/prompt, tags, timestamps, infographic metadata, user association).
- `InfographicGenerationResult`: Shape returned by OpenAI generation helper.
- Credit-related interfaces (`UserCredits`, `CreditTransaction`) for future extensions.
- `RootStackParamList` for navigation.

Analyses persist in AsyncStorage under user-scoped keys, while generated/selected images live in the sandboxed `documentDirectory`. Credit balance lives server-side in Supabase.

## External Integrations & Environment
The app relies on three primary external services. Environment variables are read from Expo runtime (`process.env.EXPO_PUBLIC_*`); create a `.env` file as documented in `ENVIRONMENT_SETUP.md`.
- **Clerk**: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (required). Missing configuration renders the `ClerkNotConfigured` placeholder (see `App.tsx`).
- **OpenAI**: `EXPO_PUBLIC_OPENAI_API_KEY` (required for infographic generation). Users can override at runtime via in-app storage (`storageService.saveApiKey`).
- **Google Gemini / Nano Banana**: `EXPO_PUBLIC_NANO_BANANA_API_KEY` (required for the Nano Banana Lab presets). Missing configuration disables Nano Banana generation.
- **Supabase**: `EXPO_PUBLIC_SUPABASE_URL` & `EXPO_PUBLIC_SUPABASE_ANON_KEY` (required if credit system is enabled). `supabaseService` throws early if they are absent.

Device permissions needed: camera, media library read/write (declared in `app.json` for iOS InfoPlist), optional microphone (future video features).

## Running Locally
1. Install dependencies (Node 18+ recommended):
   ```bash
   npm install
   ```
2. Create `.env` file with the keys above (see `ENVIRONMENT_SETUP.md`).
3. Start development server:
   ```bash
   npm start
   ```
4. Use Expo Go or a simulator to open the app; sign in via Clerk or use guest camera mode.

## Application Workflows
- **Authentication**: Clerk provider in `App.tsx` listens to session state. `SignedIn` renders the main stack; `SignedOut` renders onboarding. Google OAuth is handled via `useOAuth` hooks.
- **Capture → Infographic Pipeline**: `CameraScreen` captures or imports an image, copies it to app storage, validates format/size, converts to base64, calls `openaiService.createInfographicFromImage`, saves the result locally, stores analysis metadata, and deducts credits.
- **Gallery & Detail Flow**: `GalleryScreen` groups stored analyses by date, renders a grid. Selecting an item pushes `AnalysisScreen`, which loads the full record, toggles between original and infographic, and offers share/save/delete utilities.
- **Nano Banana Flow**: Users pick a preset, optionally upload a reference image, and generate a Gemini-powered result that is stored via `storageService.saveAnalysis`, consumes 1 credit, and appears in the gallery as an infographic.
- **Settings & Persistence**: Preferences are saved immediately through `storageService.saveUserPreferences`. Clearing data wipes analyses, API keys, and preferences.
- **Credit Management**: `useCredits` bootstraps Supabase user records, fetches balances, and ensures deductions are synced. UI reacts to insufficient credits with alerts and disabled actions.

## Styling & UI Conventions
- Layout relies on `twrnc` utility classes for quick Tailwind-like styling.
- Shared tokens (`colors`, `spacing`, `typography`, `shadows`) live in `src/styles/sharedStyles.ts` and are reused in bespoke components.
- Emojis are used as quick iconography (camera button, action feedback) alongside custom PNG assets.

## Error Handling & UX Guards
- Missing permissions display prompts with navigation to settings.
- Network/service errors surface via Alerts (e.g., OpenAI failures, Supabase credit errors).
- Image storage operations include optimistic fallbacks and cleanup to avoid orphan files.
- Credit checks gate infographic generation; guest users can still capture photos but will fail credit deductions gracefully.

## Extensibility Notes
- `ImageAnalysis` includes optional `confidence`, `tags`, and infographic metadata: ready for richer AI responses.
- `storageService.getAllAnalyses` and file cleanup utilities support potential admin dashboards or syncing.
- Supabase methods (`addCredits`, `createOrUpdateUser`) pave the way for in-app purchases or usage tracking.
- Consider moving hard-coded OpenAI prompt/size to configurable settings for future customization.

For detailed setup instructions around Clerk and environment variables, refer to `CLERK_SETUP.md` and `ENVIRONMENT_SETUP.md` already in the repo.
