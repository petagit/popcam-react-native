import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '@clerk/clerk-expo';
import { apiFetch } from '../services/apiClient';

export interface UseCreditsReturn {
  credits: number;
  isLoading: boolean;
  error: string | null;
  refetchCredits: () => Promise<void>;
  hasEnoughCredits: (amount?: number) => boolean;
  deductCredits: (amount: number) => Promise<boolean>;
}

export const useCredits = (): UseCreditsReturn => {
  const { user } = useUser();
  const [credits, setCredits] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const resolveUserEmail = useCallback((): string | null => {
    if (!user?.id) return null;
    return (
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      `${user.id}@placeholder.popcam`
    );
  }, [user]);

  const fetchCredits = useCallback(async (): Promise<void> => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const email = resolveUserEmail();
      if (!email) throw new Error('No email available for the current user.');

      // Sync user with web backend (creates or updates record)
      await apiFetch('/api/user/sync', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      // Fetch credits from web backend
      const res = await apiFetch('/api/user/credits');
      if (!res.ok) {
        throw new Error(`Failed to fetch credits: ${res.status}`);
      }

      const data = await res.json();
      setCredits(data.credits ?? 0);
    } catch (err) {
      console.error('Error fetching credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch credits');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, resolveUserEmail]);

  const refetchCredits = useCallback(async (): Promise<void> => {
    await fetchCredits();
  }, [fetchCredits]);

  const hasEnoughCredits = useCallback((amount: number = 1): boolean => {
    return credits >= amount;
  }, [credits]);

  const deductCredits = useCallback(async (amount: number): Promise<boolean> => {
    // Note: Deductions should ideally happen on the backend during the API call
    // This is maintained for compatibility
    console.warn('[useCredits] deductCredits called on client. Ensure backend handles deductions.');
    if (credits >= amount) {
      setCredits(prev => prev - amount);
      return true;
    }
    return false;
  }, [credits]);

  useFocusEffect(
    useCallback(() => {
      fetchCredits();
    }, [fetchCredits])
  );

  return {
    credits,
    isLoading,
    error,
    refetchCredits,
    hasEnoughCredits,
    deductCredits,
  };
};
