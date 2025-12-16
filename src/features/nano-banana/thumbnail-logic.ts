import * as ImageManipulator from 'expo-image-manipulator';
import { r2Service } from '../../services/r2Service';
import { storageService } from '../../services/storageService';
import { NANO_BANANA_PRESETS } from '../../lib/nanobanana-presets';

/**
 * Resizes an image to thumbnail size and uploads it to R2.
 * Returns the R2 key if successful, or null.
 */
export const createAndUploadThumbnail = async (imageUri: string, userId: string): Promise<string | null> => {
    try {
        console.log('[ThumbnailLogic] Creating thumbnail from:', imageUri);
        // Resize to 512x512
        const manipulatorResult = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: 512 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        const thumbnailUri = manipulatorResult.uri;
        const uploadedKey = await r2Service.uploadImage(thumbnailUri, userId);
        return uploadedKey;
    } catch (error) {
        console.error('[ThumbnailLogic] Error creating/uploading thumbnail:', error);
        return null;
    }
};

/**
 * Updates the thumbnail for a custom, non-standard preset if it doesn't already have one.
 * ALWAYS uploads a resized version to the cloud (R2).
 * 
 * @param presetId - ID of the preset to update
 * @param resultUri - Local URI of the generated image (to be resized and uploaded)
 * @param cloudUrl - (Ignored for thumbnail purposes, we generate a specific thumbnail)
 * @param userId - User ID
 */
export const updatePresetThumbnailIfNeeded = async (
    presetId: string | undefined,
    resultUri: string,
    cloudUrl: string | undefined,
    userId: string | undefined
): Promise<void> => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/7568f864-cfb0-4b28-aa9e-daea10a985f3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'thumbnail-logic.ts:entry', message: 'updatePresetThumbnailIfNeeded called', data: { presetId, resultUri: resultUri?.substring(0, 50), cloudUrl: cloudUrl?.substring(0, 50), userId }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    if (!presetId || !userId || presetId === 'custom') {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/7568f864-cfb0-4b28-aa9e-daea10a985f3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'thumbnail-logic.ts:earlyReturn', message: 'Early return due to invalid params', data: { presetId, userId, isCustomLiteral: presetId === 'custom' }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion
        return;
    }

    // Check if it's a standard preset (we don't update standard presets)
    const isStandard = NANO_BANANA_PRESETS.some(p => p.id === presetId);
    if (isStandard) {
        return;
    }

    try {
        console.log('[ThumbnailLogic] Updating thumbnail for preset. Creating cloud thumbnail...');

        // 1. Create and Upload Thumbnail
        const uploadedKey = await createAndUploadThumbnail(resultUri, userId);

        if (uploadedKey) {
            console.log('[ThumbnailLogic] Thumbnail uploaded to R2:', uploadedKey);

            // 2. Update storage with the Cloud Key
            await storageService.updateCustomPromptInHistory(
                presetId,
                { thumbnail_url: uploadedKey },
                userId
            );

            console.log('[ThumbnailLogic] Thumbnail record updated successfully.');
        } else {
            console.warn('[ThumbnailLogic] Failed to upload thumbnail, skipping DB update (thumbnail remains empty).');
        }

    } catch (error) {
        console.error('[ThumbnailLogic] Error updating preset thumbnail:', error);
    }
};
