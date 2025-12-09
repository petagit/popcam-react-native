import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { supabaseService } from '../services/supabaseService';

export interface UseCreditsReturn {
  credits: number;
  isLoading: boolean;
  error: string | null;
  refetchCredits: () => Promise<void>;
  deductCredits: (amount?: number) => Promise<number>;
  hasEnoughCredits: (amount?: number) => boolean;
}

export const useCredits = (): UseCreditsReturn => {
  const { user } = useUser();
  const [credits, setCredits] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const resolveUserEmail = useCallback((): string | null => {
    if (!user?.id) {
      return null;
    }

    const primaryEmail = user.primaryEmailAddress?.emailAddress;
    const firstEmail = user.emailAddresses?.[0]?.emailAddress;

    if (primaryEmail) {
      return primaryEmail;
    }

    if (firstEmail) {
      return firstEmail;
    }

    return `${user.id}@placeholder.popcam`;
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

      if (!email) {
        throw new Error('No email available for the current user.');
      }
      
      // Ensure user exists in database
      await supabaseService.createOrUpdateUser(user.id, email);

      const userCredits: number = await supabaseService.getUserCredits(user.id, email);
      setCredits(userCredits);
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

  const deductCredits = useCallback(async (amount: number = 1): Promise<number> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const email = resolveUserEmail();
      if (!email) {
        throw new Error('No email available for the current user.');
      }

      const newCredits: number = await supabaseService.deductCredits(user.id, amount, email);
      setCredits(newCredits);
      return newCredits;
    } catch (err) {
      console.error('Error deducting credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to deduct credits');
      throw err;
    }
  }, [user?.id, resolveUserEmail]);

  const hasEnoughCredits = useCallback((amount: number = 1): boolean => {
    return credits >= amount;
  }, [credits]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return {
    credits,
    isLoading,
    error,
    refetchCredits,
    deductCredits,
    hasEnoughCredits,
  };
}; 
