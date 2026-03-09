# Database Interaction Documentation

This document provides a detailed breakdown of how the PopCam application interacts with its databases (Supabase/PostgreSQL) and storage (Cloudflare R2, AsyncStorage).

## 1. Architecture Overview
PopCam uses a hybrid storage approach to balance performance, cost, and cross-device synchronization:
- **Supabase (PostgreSQL)**: Source of truth for user profiles, credit balances, custom prompts, and generated image metadata.
- **Cloudflare R2 (S3)**: Persistent storage for heavy assets (images, thumbnails).
- **AsyncStorage**: Local cache for fast access, offline support, and guest mode.
- **expo-file-system**: Local sandbox for high-resolution images.

---

## 2. Feature-Specific Interactions

### 2.1 User Authentication & Profile
- **Trigger**: User signs in via Clerk.
- **Interaction**:
    - `App.tsx` provides the Clerk session token to `supabaseService`.
    - `supabaseService.getUserCredits` checks if a record exists in the `users` table.
    - **Bootstrap Logic**: If no record exists, `createOrUpdateUser` inserts a new row with default credits (5).
- **Table**: `users`
- **Keys**: `id` (Clerk User ID), `email`, `credits`.

### 2.2 Credit Management
- **Trigger**: AI generation (Infographic or Nano Banana).
- **Interaction**:
    - **Check**: `useCredits` hook calls `getUserCredits`.
    - **Deduct**: After successful generation, `deductCredits` is called.
    - **Sync**: Credits are updated in the Supabase `users` table via an `update` query.
- **Service**: [supabaseService.ts](file:///Users/fengzhiping/popcam-react-native/src/services/supabaseService.ts)

### 2.3 Generated Images (Gallery)
- **Trigger**: Successful AI generation.
- **Interaction**:
    1.  **Storage**: Image is uploaded to Cloudflare R2 via `r2Service`.
    2.  **Metadata**: `saveGeneratedImage` inserts a record into Supabase `generated_images`.
    3.  **Local Cache**: `storageService.saveAnalysis` saves the metadata (including the R2 URL/Key as `cloudUrl`) to `AsyncStorage`.
- **Syncing**: `storageService.syncCloudHistory` fetches the last 50 images from Supabase and restores any missing items to local storage.
- **Tables**: `generated_images`, `image_generation_jobs`.

### 2.4 Custom Prompts (Presets)
- **Trigger**: User creates or edits a custom AI prompt.
- **Interaction**:
    - **Authenticated**: CRUD operations target the `custom_prompts` table in Supabase.
    - **Guest/Fallback**: Operations target `AsyncStorage` under `STORAGE_KEYS.CUSTOM_PROMPT_HISTORY`.
- **Dual Logic**: `storageService` dynamically switches between Supabase and local storage based on the presence of a `userId`.
- **Table**: `custom_prompts`

---

## 3. Data Synchronization & Migration

### 3.1 Guest to User Migration
When a guest user signs in, the app automatically migrates their local data:
- `storageService.getAnalyses` checks for data under the guest key.
- It moves these records to the user-specific key (`analyses_{userId}`).
- It clears the guest data to prevent duplication.

### 3.2 Cloud Fallback
If a local image file is missing (e.g., app reinstalled), the gallery logic:
1.  Identifies the missing file.
2.  Checks for a `cloudUrl` or R2 key in the metadata.
3.  Calls `r2Service.resolveUrl` to get a signed URL and update the URI for display.

---

## 4. Key Database Tables (Supabase)

| Table | Purpose | Primary Key | Relation |
| :--- | :--- | :--- | :--- |
| `users` | Profile and credits | `id` (String) | - |
| `generated_images` | AI generation history | `id` (UUID) | `user_id` -> `users.id` |
| `custom_prompts` | Saved AI presets | `id` (UUID) | `user_id` -> `users.id` |
| `subscriptions` | Payment status | `id` (UUID) | `user_id` -> `users.id` |
| `image_generation_jobs`| Async job tracking | `id` (UUID) | `user_id` -> `users.id` |

---

## 5. Local Storage Schema (AsyncStorage)

| Key Prefix | Content |
| :--- | :--- |
| `analyses_` | Array of `ImageAnalysis` objects. |
| `user_preferences_` | User-specific settings (auto-save, etc). |
| `local_presets_` | Local-only presets (if not synced). |
| `openai_api_key` | User-provided OpenAI key (optional). |
