import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { storageService } from '../../../services/storageService';
import { r2Service } from '../../../services/r2Service';

export const useCustomPrompts = () => {
    const { user } = useUser();
    const [promptHistory, setPromptHistory] = useState<{ id: string; prompt_text: string; title?: string; thumbnail_url?: string; secondary_image_url?: string }[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const loadPromptHistory = useCallback(async () => {
        if (!user?.id) {
            console.log('[useCustomPrompts] Skipping load, no user ID.');
            return;
        }

        setIsLoading(true);
        try {
            console.log('[useCustomPrompts] Loading history for:', user.id);
            const history = await storageService.getCustomPromptHistory(user.id);
            console.log('[useCustomPrompts] Loaded items from DB:', history.length);

            // Resolve URLs (e.g. presigned URLs)
            const resolvedHistory = await Promise.all(history.map(async (item) => {
                let resolvedUrl = item.thumbnail_url;
                if (item.thumbnail_url) {
                    try {
                        const url = await r2Service.resolveUrl(item.thumbnail_url);
                        if (url) resolvedUrl = url;
                    } catch (e) {
                        console.warn('Failed to resolve URL for item', item.id, e);
                    }
                }

                // Also resolve secondary image if present
                let resolvedSecondaryUrl = item.secondary_image_url;
                if (item.secondary_image_url) {
                    try {
                        const url = await r2Service.resolveUrl(item.secondary_image_url);
                        if (url) resolvedSecondaryUrl = url;
                    } catch (e) {
                        console.warn('Failed to resolve secondary URL for item', item.id, e);
                    }
                }

                return { ...item, thumbnail_url: resolvedUrl, secondary_image_url: resolvedSecondaryUrl };
            }));

            setPromptHistory(resolvedHistory);
        } catch (error) {
            console.error('[useCustomPrompts] Failed to load prompt history', error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadPromptHistory();
    }, [loadPromptHistory]);

    const savePrompt = async (prompt: string, title?: string, thumbnailUrl?: string, secondaryImageUrl?: string) => {
        if (!prompt.trim()) return null;
        try {
            console.log('[useCustomPrompts] Saving prompt for user:', user?.id);
            const newId = await storageService.saveCustomPromptToHistory(prompt.trim(), user?.id, title, thumbnailUrl, secondaryImageUrl);
            await loadPromptHistory();
            return newId;
        } catch (error: any) {
            console.error('Save prompt error:', error);
            // Alert.alert('Error', 'Failed to save prompt: ' + (error.message || 'Unknown error'));
            return null;
        }
    };

    const updatePrompt = async (id: string, updates: { prompt_text?: string; title?: string; thumbnail_url?: string }) => {
        try {
            console.log('[useCustomPrompts] Updating prompt:', id);

            // 1. Update DB with raw values (keys are fine for DB)
            await storageService.updateCustomPromptInHistory(id, updates, user?.id);

            // 2. Resolve URL if a new thumbnail key was provided
            let resolvedUpdates = { ...updates };

            if (updates.thumbnail_url) {
                // If it looks like a key (not http), try to resolve it
                if (!updates.thumbnail_url.startsWith('http') && !updates.thumbnail_url.startsWith('file')) {
                    const url = await r2Service.resolveUrl(updates.thumbnail_url);
                    if (url) resolvedUpdates.thumbnail_url = url;
                }
            }

            // 3. Update local state with RESOLVED values
            setPromptHistory(prev => prev.map(p => p.id === id ? { ...p, ...resolvedUpdates } : p));
            return true;
        } catch (error) {
            console.error('Update prompt error:', error);
            // Alert.alert('Error', 'Failed to update prompt');
            return false;
        }
    };

    const deletePrompt = async (id: string) => {
        try {
            console.log('[useCustomPrompts] Deleting prompt:', id);
            await storageService.deleteCustomPromptFromHistory(id, user?.id);
            setPromptHistory(prev => prev.filter(p => p.id !== id));
            return true;
        } catch (error) {
            console.error('Delete prompt error:', error);
            Alert.alert('Error', 'Failed to delete prompt');
            return false;
        }
    };

    return {
        promptHistory,
        isLoading,
        loadPromptHistory,
        savePrompt,
        deletePrompt,
        updatePrompt,
    };
};
