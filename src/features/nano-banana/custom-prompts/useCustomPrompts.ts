import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { storageService } from '../../../services/storageService';

export const useCustomPrompts = () => {
    const { user } = useUser();
    const [promptHistory, setPromptHistory] = useState<{ id: string; prompt_text: string; title?: string; thumbnail_url?: string }[]>([]);
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
            console.log('[useCustomPrompts] Loaded items:', history.length);
            setPromptHistory(history);
        } catch (error) {
            console.error('[useCustomPrompts] Failed to load prompt history', error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadPromptHistory();
    }, [loadPromptHistory]);

    const savePrompt = async (prompt: string, title?: string, thumbnailUrl?: string) => {
        if (!prompt.trim()) return null;
        try {
            console.log('[useCustomPrompts] Saving prompt for user:', user?.id);
            const newId = await storageService.saveCustomPromptToHistory(prompt.trim(), user?.id, title, thumbnailUrl);
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
            await storageService.updateCustomPromptInHistory(id, updates, user?.id);
            // Optimistic update or reload
            setPromptHistory(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
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
