
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageAnalysis } from '../types';
import { supabaseService } from './supabaseService';
import { r2Service } from './r2Service';
import { STORAGE_KEYS, APP_CONFIG } from '../constants/config';
import { imageUtils } from '../utils/imageUtils';

export interface LocalPreset {
  id: string;
  title: string;
  prompt: string;
  imageUri: string | null;
  timestamp: number;
}

class StorageService {
  // ... existing methods ...

  async getLocalPresets(userId?: string): Promise<LocalPreset[]> {
    try {
      const storageKey = userId ? `${STORAGE_KEYS.LOCAL_PRESETS}_${userId}` : STORAGE_KEYS.LOCAL_PRESETS;
      const json = await AsyncStorage.getItem(storageKey);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('Error loading local presets:', error);
      return [];
    }
  }

  async saveLocalPreset(preset: LocalPreset, userId?: string): Promise<void> {
    try {
      const storageKey = userId ? `${STORAGE_KEYS.LOCAL_PRESETS}_${userId}` : STORAGE_KEYS.LOCAL_PRESETS;
      const current = await this.getLocalPresets(userId);
      const updated = [preset, ...current];
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving local preset:', error);
      throw error;
    }
  }

  async deleteLocalPreset(presetId: string, userId?: string): Promise<void> {
    try {
      const storageKey = userId ? `${STORAGE_KEYS.LOCAL_PRESETS}_${userId}` : STORAGE_KEYS.LOCAL_PRESETS;
      const current = await this.getLocalPresets(userId);
      const updated = current.filter(p => p.id !== presetId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Error deleting local preset:', error);
      throw error;
    }
  }

  // Helper method to get user-specific storage key
  private getUserAnalysesKey(userId?: string): string {
    return userId ? STORAGE_KEYS.ANALYSES + '_' + userId : STORAGE_KEYS.ANALYSES;
  }

  async saveAnalysis(analysis: ImageAnalysis, userId?: string): Promise<void> {
    try {
      // Add userId to analysis if provided
      const analysisWithUser: ImageAnalysis = {
        ...analysis,
        userId: userId || analysis.userId,
      };

      const storageKey: string = this.getUserAnalysesKey(userId);
      const existingAnalyses: ImageAnalysis[] = await this.getAnalyses(userId);
      const updatedAnalyses: ImageAnalysis[] = [analysisWithUser, ...existingAnalyses]
        .slice(0, APP_CONFIG.MAX_ANALYSES_STORED);

      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(updatedAnalyses)
      );
    } catch (error) {
      console.error('Error saving analysis:', error);
      throw new Error('Failed to save analysis');
    }
  }

  async getAnalyses(userId?: string, options: { skipVerification?: boolean } = {}): Promise<ImageAnalysis[]> {
    try {
      const storageKey: string = this.getUserAnalysesKey(userId);
      const guestKey: string = STORAGE_KEYS.ANALYSES;

      // 1. Check for possible migration first if we have a userId
      if (userId) {
        const guestJson = await AsyncStorage.getItem(guestKey);
        if (guestJson) {
          try {
            const guestAnalyses: ImageAnalysis[] = JSON.parse(guestJson);
            if (guestAnalyses.length > 0) {
              console.log(`[Storage] Migrating ${guestAnalyses.length} guest items to user ${userId}`);
              const userJson = await AsyncStorage.getItem(storageKey);
              const userAnalyses: ImageAnalysis[] = userJson ? JSON.parse(userJson) : [];

              // Merge (avoid duplicates by ID)
              const existingIds = new Set(userAnalyses.map(a => a.id));
              const newItems = guestAnalyses
                .filter(a => !existingIds.has(a.id))
                .map(a => ({ ...a, userId }));

              if (newItems.length > 0) {
                const merged = [...newItems, ...userAnalyses].slice(0, APP_CONFIG.MAX_ANALYSES_STORED);
                await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
              }

              // CRITICAL: Clear guest storage after migration to avoid re-migrating
              await AsyncStorage.removeItem(guestKey);
              console.log('[Storage] Migration complete. Guest storage cleared.');
            }
          } catch (migrateError) {
            console.error('[Storage] Migration error:', migrateError);
          }
        }
      }

      // 2. Load the actual data for the current key
      const analysesJson: string | null = await AsyncStorage.getItem(storageKey);
      if (!analysesJson) {
        return [];
      }

      const analyses: ImageAnalysis[] = JSON.parse(analysesJson);
      const items: ImageAnalysis[] = analyses.map(a => ({
        ...a,
        timestamp: new Date(a.timestamp),
      }));

      // 3. Optional: Logic to skip expensive file verification on every load
      if (options.skipVerification) {
        return items;
      }

      // 4. Verification and Cleanup Logic (PROACTIVE CLEANUP)
      const validatedAnalyses: ImageAnalysis[] = [];
      let hasChanges = false;

      for (const analysis of items) {
        // Check if local file exists
        const { exists } = await imageUtils.verifyLocalImage(analysis.imageUri);

        if (exists) {
          validatedAnalyses.push(analysis);
          continue;
        }

        // Local file missing. Check for Cloud URL
        if (analysis.cloudUrl) {
          console.log(`[Storage] Local file missing for ${analysis.id}, attempting Cloud fallback`);

          try {
            // Resolve the cloud URL (it might be a key needing signing)
            const resolvedUrl = await r2Service.resolveUrl(analysis.cloudUrl);

            if (resolvedUrl) {
              validatedAnalyses.push({
                ...analysis,
                imageUri: resolvedUrl,
              });
              continue;
            }
          } catch (r2Error) {
            console.warn(`[Storage] Cloud resolution failed temporarily for ${analysis.id}:`, r2Error);
          }

          validatedAnalyses.push(analysis);
          continue;
        }

        // No local file and no cloud URL -> Cleanup
        console.warn(`[Storage] Cleaning up invalid analysis ${analysis.id} (metadata only, no source)`);
        hasChanges = true;
      }

      // Only save if we actually removed items
      if (hasChanges && validatedAnalyses.length !== analyses.length) {
        this.saveAnalyses(validatedAnalyses, userId).catch(err => console.error('Error persisting cleanup:', err));
      }

      return validatedAnalyses;
    } catch (error) {
      console.error('Error loading analyses:', error);
      return [];
    }
  }

  /**
   * Fetches and resolves URIs for a user's analyses, ensuring cloud-only items have valid signed URLs.
   */
  async getResolvedAnalyses(userId?: string): Promise<ImageAnalysis[]> {
    try {
      // Use skipVerification: true because we resolve manually here anyway
      const analyses: ImageAnalysis[] = await this.getAnalyses(userId, { skipVerification: true });

      const resolved = await Promise.all(analyses.map(async (analysis) => {
        try {
          const item = { ...analysis };

          // Resolve main image URI if it looks like an R2 key (not http/file)
          if (item.imageUri && !item.imageUri.startsWith('http') && !item.imageUri.startsWith('file://')) {
            const url = await r2Service.resolveUrl(item.imageUri);
            if (url) item.imageUri = url;
          }

          // Resolve infographic URI if it looks like an R2 key
          if (item.infographicUri && !item.infographicUri.startsWith('http') && !item.infographicUri.startsWith('file://')) {
            const url = await r2Service.resolveUrl(item.infographicUri);
            if (url) item.infographicUri = url;
          }

          return item;
        } catch (err) {
          console.warn(`[StorageService] Failed to resolve URI for ${analysis.id}:`, err);
          return analysis;
        }
      }));

      return resolved;
    } catch (error) {
      console.error('[StorageService] Error in getResolvedAnalyses:', error);
      return [];
    }
  }

  // Helper method to save multiple analyses at once
  private async saveAnalyses(analyses: ImageAnalysis[], userId?: string): Promise<void> {
    try {
      const storageKey: string = this.getUserAnalysesKey(userId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(analyses));
    } catch (error) {
      console.error('Error saving analyses:', error);
      throw new Error('Failed to save analyses');
    }
  }

  async deleteAnalysis(id: string, userId?: string): Promise<void> {
    try {
      const analyses: ImageAnalysis[] = await this.getAnalyses(userId);
      const analysisToDelete = analyses.find((analysis: ImageAnalysis) => analysis.id === id);

      // Delete associated local image files
      if (analysisToDelete) {
        try {
          // Delete original image if it's in our app storage
          if (analysisToDelete.imageUri) {
            await imageUtils.deleteLocalImage(analysisToDelete.imageUri);
          }

          // Delete infographic if it's in our app storage
          if (analysisToDelete.infographicUri) {
            await imageUtils.deleteLocalImage(analysisToDelete.infographicUri);
          }
        } catch (fileError) {
          console.warn('Error deleting associated files:', fileError);
          // Continue with analysis deletion even if file deletion fails
        }
      }

      const filteredAnalyses: ImageAnalysis[] = analyses.filter(
        (analysis: ImageAnalysis) => analysis.id !== id
      );

      await this.saveAnalyses(filteredAnalyses, userId);
    } catch (error) {
      console.error('Error deleting analysis:', error);
      throw new Error('Failed to delete analysis');
    }
  }

  // Method to get all analyses across all users (for admin/migration purposes)
  async getAllAnalyses(): Promise<ImageAnalysis[]> {
    try {
      const allKeys: readonly string[] = await AsyncStorage.getAllKeys();
      const analysisKeys: string[] = allKeys.filter((key: string) =>
        key.startsWith(STORAGE_KEYS.ANALYSES)
      );

      const allAnalyses: ImageAnalysis[] = [];

      for (const key of analysisKeys) {
        const analysesJson: string | null = await AsyncStorage.getItem(key);
        if (analysesJson) {
          const analyses: ImageAnalysis[] = JSON.parse(analysesJson);
          allAnalyses.push(...analyses.map((analysis: any) => ({
            ...analysis,
            timestamp: new Date(analysis.timestamp),
          })));
        }
      }

      return allAnalyses.sort((a: ImageAnalysis, b: ImageAnalysis) =>
        b.timestamp.getTime() - a.timestamp.getTime()
      );
    } catch (error) {
      console.error('Error loading all analyses:', error);
      return [];
    }
  }

  /**
   * Clean up orphaned files that are no longer referenced by any analysis
   */
  async cleanupOrphanedFiles(userId?: string): Promise<void> {
    try {
      const analyses: ImageAnalysis[] = await this.getAnalyses(userId);
      const referencedFiles: string[] = [];

      // Collect all referenced file URIs
      analyses.forEach((analysis: ImageAnalysis) => {
        if (analysis.imageUri) {
          referencedFiles.push(analysis.imageUri);
        }
        if (analysis.infographicUri) {
          referencedFiles.push(analysis.infographicUri);
        }
      });

      // Clean up files not referenced by any analysis
      await imageUtils.cleanupOrphanedFiles(referencedFiles);
    } catch (error) {
      console.error('Error cleaning up orphaned files:', error);
    }
  }

  /**
          tags: ['restored'],
          timestamp: new Date(item.created_at),
          hasInfographic: true, // check this? generated_images are usually results.
          userId: userId,
        };

        newAnalyses.push(newAnalysis);
        addedCount++;
      }

      if (addedCount > 0) {
        console.log(`[Storage] Restoring ${addedCount} images from cloud.`);
        // Merge and save
        // We put new ones at the top? Or sort by date?
        const merged = [...newAnalyses, ...localAnalyses].sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        await this.saveAnalyses(merged, userId);

        // Trigger a get to ensure URLs are resolved for immediate display?
        // User likely will refresh or component will re-render.
      }

      return addedCount;
    } catch (error) {
      console.error('[Storage] Error syncing cloud history:', error);
      return 0;
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{ totalFiles: number; totalSize: number; formattedSize: string }> {
    try {
      const info = await imageUtils.getStorageInfo();
      const formattedSize = this.formatBytes(info.totalSize);
      return {
        ...info,
        formattedSize,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { totalFiles: 0, totalSize: 0, formattedSize: '0 B' };
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async saveApiKey(apiKey: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OPENAI_API_KEY, apiKey);
    } catch (error) {
      console.error('Error saving API key:', error);
      throw new Error('Failed to save API key');
    }
  }

  async getApiKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY);
    } catch (error) {
      console.error('Error loading API key:', error);
      return null;
    }
  }

  async syncCloudHistory(userId: string): Promise<void> {
    try {
      console.log('[StorageService] Syncing cloud history for:', userId);
      const cloudImages = await supabaseService.getGeneratedImages(userId, 50); // Get last 50
      console.log(`[StorageService] Found ${cloudImages.length} items in cloud for user ${userId}`);
      if (cloudImages.length === 0) {
        console.log('[StorageService] No cloud history found.');
        return;
      }

      // Skip verification when comparing for sync to make it fast
      const localAnalyses = await this.getAnalyses(userId, { skipVerification: true });
      console.log(`[StorageService] Comparing with ${localAnalyses.length} local items`);
      const storageKey = `${STORAGE_KEYS.ANALYSES}_${userId}`;
      let hasChanges = false;
      const newAnalyses = [...localAnalyses];

      for (const cloudItem of cloudImages) {
        // Check if exists locally
        // We compare cloudUrl or infographicUri or simply if we have an analysis with this cloudUrl
        const exists = localAnalyses.some(a =>
          a.cloudUrl === cloudItem.image_url ||
          a.infographicUri === cloudItem.image_url ||
          (a.imageUri && a.imageUri.endsWith(cloudItem.image_url)) // Check suffix if full URL vs key
        );

        if (!exists) {
          console.log('[StorageService] Restoring missing item:', cloudItem.id);
          // Create new analysis object
          const newAnalysis: ImageAnalysis = {
            id: cloudItem.id, // Use Supabase ID
            imageUri: cloudItem.image_url, // UI handles resolving this key
            infographicUri: cloudItem.image_url,
            hasInfographic: true,
            description: cloudItem.prompt || 'Restored Generation',
            tags: ['restored', 'nano-banana'],
            timestamp: new Date(cloudItem.created_at),
            userId: userId,
            cloudUrl: cloudItem.image_url
          };
          newAnalyses.push(newAnalysis);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        // storageService.saveAnalyses expects to overwrite or we update manually
        // We can just setItem directly since we constructed the full list
        // Sort by timestamp desc
        newAnalyses.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        await AsyncStorage.setItem(storageKey, JSON.stringify(newAnalyses));
        console.log('[StorageService] Synced and saved', newAnalyses.length, 'analyses');
      } else {
        console.log('[StorageService] No new items to sync');
      }

    } catch (error) {
      console.error('[StorageService] Sync error:', error);
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ANALYSES,
        STORAGE_KEYS.OPENAI_API_KEY,
        STORAGE_KEYS.USER_PREFERENCES,
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error('Failed to clear data');
    }
  }

  async clearUserData(userId: string): Promise<void> {
    try {
      const userAnalysesKey: string = this.getUserAnalysesKey(userId);
      const userPreferencesKey: string = STORAGE_KEYS.USER_PREFERENCES + '_' + userId;

      await AsyncStorage.multiRemove([userAnalysesKey, userPreferencesKey]);
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw new Error('Failed to clear user data');
    }
  }

  async saveUserPreferences(preferences: Record<string, any>, userId?: string): Promise<void> {
    try {
      const storageKey: string = userId
        ? STORAGE_KEYS.USER_PREFERENCES + '_' + userId
        : STORAGE_KEYS.USER_PREFERENCES;

      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw new Error('Failed to save preferences');
    }
  }

  async getUserPreferences(userId?: string): Promise<Record<string, any>> {
    try {
      const storageKey: string = userId
        ? STORAGE_KEYS.USER_PREFERENCES + '_' + userId
        : STORAGE_KEYS.USER_PREFERENCES;

      const preferencesJson: string | null = await AsyncStorage.getItem(storageKey);
      const preferences = preferencesJson ? JSON.parse(preferencesJson) : {};

      // Default cloudStorage to true if not explicitly set
      if (preferences.cloudStorage === undefined) {
        preferences.cloudStorage = true;
      }

      return preferences;
    } catch (error) {
      console.error('Error loading preferences:', error);
      return {};
    }
  }

  async getCustomPromptHistory(userId?: string): Promise<{ id: string; prompt_text: string; title?: string; thumbnail_url?: string; secondary_image_url?: string }[]> {
    try {
      if (userId) {
        return await supabaseService.getCustomPrompts(userId);
      }

      // Fallback local storage
      const storageKey = STORAGE_KEYS.CUSTOM_PROMPT_HISTORY;
      const historyJson = await AsyncStorage.getItem(storageKey);
      return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
      console.error('Error loading custom prompt history:', error);
      return [];
    }
  }

  async getCustomPrompt(id: string, userId?: string): Promise<{ id: string; prompt_text: string; title?: string; thumbnail_url?: string; secondary_image_url?: string } | null> {
    try {
      if (userId) {
        return await supabaseService.getCustomPrompt(id, userId);
      }

      // Fallback local
      const history = await this.getCustomPromptHistory();
      return history.find(p => p.id === id) || null;
    } catch (error) {
      console.error('Error loading single custom prompt:', error);
      return null;
    }
  }

  async deleteCustomPromptFromHistory(id: string, userId?: string): Promise<void> {
    try {
      if (userId) {
        await supabaseService.deleteCustomPrompt(id, userId);
        return;
      }

      // Fallback local
      const storageKey = STORAGE_KEYS.CUSTOM_PROMPT_HISTORY;
      const currentHistory = await this.getCustomPromptHistory();
      const filteredHistory = currentHistory.filter(p => p.id !== id);
      await AsyncStorage.setItem(storageKey, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error('Error deleting prompt:', error);
      throw error;
    }
  }

  async saveCustomPromptToHistory(
    prompt: string,
    userId?: string,
    title?: string,
    thumbnailUrl?: string,
    secondaryImageUrl?: string
  ): Promise<string | null> {
    try {
      if (!prompt || !prompt.trim()) return null;

      if (userId) {
        return await supabaseService.saveCustomPrompt(userId, prompt, title, thumbnailUrl, secondaryImageUrl);
      }

      // Fallback local logic
      const storageKey = STORAGE_KEYS.CUSTOM_PROMPT_HISTORY;
      const currentHistory = await this.getCustomPromptHistory();
      // Simple local ID generation for fallback
      const newId = Date.now().toString();
      const newItem = {
        id: newId,
        prompt_text: prompt,
        title: title,
        thumbnail_url: thumbnailUrl,
        secondary_image_url: secondaryImageUrl
      };

      // Filter out exact duplicate prompt text if we want to avoid dupes? 
      // But user might want same prompt with different image/title. 
      // Let's rely on ID uniqueness or just append. 
      // Original logic filtered by prompt_text to avoid dupes.
      const filteredHistory = currentHistory.filter(p => p.prompt_text !== prompt);
      const newHistory = [newItem, ...filteredHistory].slice(0, 20);
      await AsyncStorage.setItem(storageKey, JSON.stringify(newHistory));
      return newId;
    } catch (error) {
      console.error('Error saving custom prompt history:', error);
      throw error;
    }
  }

  async updateCustomPromptInHistory(
    id: string,
    updates: { prompt_text?: string; title?: string; thumbnail_url?: string; secondary_image_url?: string },
    userId?: string
  ): Promise<void> {
    try {
      if (userId) {
        const success = await supabaseService.updateCustomPrompt(id, userId, updates);
        if (!success) {
          throw new Error('Supabase update failed');
        }
        return;
      }

      // Fallback local
      const storageKey = STORAGE_KEYS.CUSTOM_PROMPT_HISTORY;
      const currentHistory = await this.getCustomPromptHistory();
      const updatedHistory = currentHistory.map(item => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        return item;
      });
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error updating custom prompt:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService(); 