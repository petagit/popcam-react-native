# Thumbnail Logic Documentation

## Overview
Custom prompt thumbnails are images stored in the `custom_prompts` table in Supabase via the `thumbnail_url` column. They serve as visual identifiers for user-created filters in the Nano Banana grid.

## Persistence Strategy
To ensure thumbnails persist across app reinstalls and device changes:
- **Storage**: Thumbnails are stored in Cloudflare R2 (S3-compatible storage).
- **Database**: The Supabase record stores the full public URL or R2 key (e.g., `https://...` or `generated/...`).

## Workflows

### 1. Manual Creation/Editing
- When a user picks an image from their gallery for a custom prompt.
- **Action**: The image is immediately uploaded to R2 via `r2Service.uploadImage`.
- **Save**: The resulting R2 URL is saved to `custom_prompts` in Supabase.

### 2. Auto-Update from Generation
- When a user generates a result using a custom prompt.
- **Logic**: The app attempts to update the custom prompt's thumbnail with the new result.
- **Persistence Check**:
    - The system checks if the generated image is already on the cloud (based on user "Cloud Storage" preference).
    - **Force Upload**: If the image is *local only* (user opted out of history backup), the system **forces an upload** of the thumbnail to R2 specifically for the prompt metadata.
- **Save**: The remote URL is then saved to `custom_prompts`, ensuring the thumbnail is not a broken local link (`file://`) upon reinstall.
