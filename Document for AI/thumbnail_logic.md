# Thumbnail Logic Documentation

## Overview
Custom prompt thumbnails are images stored in the `custom_prompts` table in Supabase via the `thumbnail_url` column. They serve as visual identifiers for user-created filters in the Nano Banana grid.

## Persistence Strategy
To ensure thumbnails persist across app reinstalls and device changes:
- **Storage**: Thumbnails are stored in Cloudflare R2 (S3-compatible storage).
- **Format**: Images are resized to **512x512** JPEG before upload to optimize load times.
- **Database**: The Supabase record stores the **R2 Key** (e.g., `generated/user_id/filename.jpg`).
- **Access**: The frontend resolves these keys to **Presigned URLs** via `r2Service` to ensure secure access to the private R2 bucket.

## Workflows

### 1. Manual Creation/Editing
- When a user picks an image from their gallery for a custom prompt.
- **Action**: The image is resized and uploaded to R2 via `createAndUploadThumbnail` in `thumbnail-logic.ts`.
- **Save**: The resulting R2 Key is saved to `custom_prompts` in Supabase.

### 2. Auto-Update from Generation
- When a user generates a result using a custom prompt (non-standard preset).
- **Trigger**: `NanoBananaResultScreen` calls `updatePresetThumbnailIfNeeded` upon successful generation.
- **Logic**: 
    1. The system **always** takes the locally generated image.
    2. Resizes it to a 512x512 thumbnail.
    3. Uploads it to R2 (creating a new unique key).
    4. Updates the `thumbnail_url` in the `custom_prompts` table with the new key.
- **Robustness**: This process runs independently of the user's "Cloud Storage" preference for the main image. Even if the user does not save their generation history to the cloud, the *prompt thumbnail* is still uploaded to R2 to ensure it is visible on other devices.
- **Display**: The `NanoBananaScreen` refreshes its list, and `NanoBananaThumbnail` component resolves the new R2 key to a viewable URL using `r2Service.resolveUrl()`.

## Technical Details
- **File**: `src/features/nano-banana/thumbnail-logic.ts` contains the upload/update logic.
- **Service**: `src/services/r2Service.ts` handles the S3/R2 interaction and URL signing.
- **Note**: `EXPO_PUBLIC_R2_PUBLIC_DOMAIN` logic is currently disabled/bypassed to ensure all URLs are signed, preventing 403 Forbidden errors on private buckets.
