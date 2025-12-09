import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.');
}

class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getUserCredits(userId: string, email?: string): Promise<number> {
    try {
      console.log('[SupabaseService] getUserCredits called for:', userId);
      const defaultCredits = 5;
      const { data, error } = await this.supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[SupabaseService] Error fetching user credits:', error, 'UserID:', userId);
        throw error;
      }

      console.log('[SupabaseService] Raw data from DB:', data);

      if (!data) {
        console.log('[SupabaseService] No user record found. creating one...');
        if (!email) {
          throw new Error('User record not found and no email provided to create it.');
        }

        await this.createOrUpdateUser(userId, email, defaultCredits);
        return defaultCredits;
      }

      const credits = data.credits || 0;
      console.log('[SupabaseService] Returning credits:', credits);
      return credits;
    } catch (error) {
      console.error('[SupabaseService] Error in getUserCredits:', error);
      throw error;
    }
  }

  async deductCredits(userId: string, amount: number = 1, email?: string): Promise<number> {
    try {
      // First get current credits
      const currentCredits: number = await this.getUserCredits(userId, email);

      if (currentCredits < amount) {
        throw new Error('Insufficient credits');
      }

      const newCredits: number = currentCredits - amount;

      const { data, error } = await this.supabase
        .from('users')
        .update({
          credits: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('credits')
        .single();

      if (error) {
        console.error('Error deducting credits:', error, 'UserID:', userId);
        throw error;
      }

      console.log('Credits deducted successfully. New balance:', data.credits);
      return data.credits;
    } catch (error) {
      console.error('Error in deductCredits:', error);
      throw error;
    }
  }

  async createOrUpdateUser(userId: string, email: string, initialCredits: number = 5): Promise<void> {
    try {
      const { data: existingUser, error: fetchError } = await this.supabase
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking existing user:', fetchError);
        throw fetchError;
      }

      if (!existingUser) {
        // Create new user with initial credits
        const { error } = await this.supabase
          .from('users')
          .insert({
            id: userId,
            email: email,
            credits: initialCredits,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error creating user:', error, 'Data:', { userId, email });
          throw error;
        }
        console.log('User created successfully:', userId);
      } else if (email && existingUser.email !== email) {
        const { error } = await this.supabase
          .from('users')
          .update({
            email,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (error) {
          console.error('Error updating user email:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in createOrUpdateUser:', error);
      throw error;
    }
  }

  async addCredits(userId: string, amount: number, email?: string): Promise<number> {
    try {
      const currentCredits: number = await this.getUserCredits(userId, email);
      const newCredits: number = currentCredits + amount;

      const { data, error } = await this.supabase
        .from('users')
        .update({
          credits: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('credits')
        .single();

      if (error) {
        console.error('Error adding credits:', error);
        throw error;
      }

      return data.credits;
    } catch (error) {
      console.error('Error in addCredits:', error);
      throw error;
    }
  }

  async deleteUserAccount(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user account:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteUserAccount:', error);
      throw error;
    }
  }

  async getCustomPrompts(userId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('custom_prompts')
        .select('prompt_text')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching custom prompts:', error);
        return [];
      }

      return data.map((item) => item.prompt_text);
    } catch (error) {
      console.error('Error in getCustomPrompts:', error);
      return [];
    }
  }

  async saveCustomPrompt(userId: string, prompt: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('custom_prompts')
        .insert({
          user_id: userId,
          prompt_text: prompt,
        });

      if (error) {
        console.error('Error saving custom prompt:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in saveCustomPrompt:', error);
      throw error;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      console.log('Checking Supabase connection...');
      const { data, error, count } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Supabase connection check failed:', error);
        return false;
      }

      console.log('Supabase connection successful. Status:', { count, status: 200 });
      return true;
    } catch (error) {
      console.error('Supabase connection check threw error:', error);
      return false;
    }
  }
}

export const supabaseService = new SupabaseService(); 
