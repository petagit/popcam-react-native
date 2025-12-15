import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// We no longer throw here to avoid crashing the app on startup.
// Instead, we handle the missing configuration within the service methods or by checking isConfigured().
// if (!supabaseUrl || !supabaseKey) {
//   throw new Error('Missing Supabase configuration...');
// }

class SupabaseService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      console.warn('[SupabaseService] Missing configuration. Service will not function correctly.');
    }
  }

  isConfigured(): boolean {
    return !!this.supabase;
  }

  private tokenProvider: (() => Promise<string | null>) | null = null;

  async setTokenProvider(provider: () => Promise<string | null>) {
    this.tokenProvider = provider;

    // Re-initialize client with dynamic accessToken
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      accessToken: async () => {
        const token = await this.tokenProvider?.();
        return token || '';
      },
    });

    console.log('[SupabaseService] Token provider configured.');
  }

  // Deprecated: Wraps static token in a provider
  setAuthToken(token: string | null) {
    if (token) {
      this.setTokenProvider(async () => token);
    } else {
      // Clear
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.tokenProvider = null;
    }
  }

  logTokenDebug(token: string) {
    // DEBUG: Decode token to verify algorithm
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        // Manual base64url decode
        let base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
        switch (base64.length % 4) {
          case 0: break;
          case 2: base64 += '=='; break;
          case 3: base64 += '='; break;
          default: break;
        }

        const headerJson = atob(base64);
        const header = JSON.parse(headerJson);
        console.log('[SupabaseService] 🔍 DECODED HEADER:', JSON.stringify(header));

        if (header.alg === 'HS256') {
          console.log('[SupabaseService] ✅ Algorithm correct (HS256).');
        } else if (header.alg === 'RS256') {
          console.log('[SupabaseService] ❌ Algorithm INCORRECT (RS256).');
        }
      }
    } catch (e: any) {
      console.warn('[SupabaseService] Could not inspect token:', e.message);
    }
  }

  async getUserCredits(userId: string, email?: string): Promise<number> {
    try {
      if (!this.supabase) {
        console.warn('[SupabaseService] Service not configured');
        return 0; // Return 0 credits if not configured
      }

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

      if (!this.supabase) throw new Error('Supabase not configured');

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
      if (!this.supabase) throw new Error('Supabase not configured');

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

      if (!this.supabase) throw new Error('Supabase not configured');

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
      if (!this.supabase) throw new Error('Supabase not configured');

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

  async getCustomPrompts(userId: string): Promise<{ id: string; prompt_text: string; title?: string; thumbnail_url?: string; secondary_image_url?: string }[]> {
    try {
      if (!this.supabase) return [];

      console.log('[SupabaseService] getCustomPrompts called for:', userId);
      const { data, error } = await this.supabase
        .from('custom_prompts')
        .select('id, prompt_text, title, thumbnail_url, secondary_image_url')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[SupabaseService] Error fetching custom prompts:', error);
        return [];
      }

      console.log('[SupabaseService] fetch success. Count:', data?.length);
      return data.map((item) => ({
        id: item.id,
        prompt_text: item.prompt_text,
        title: item.title,
        thumbnail_url: item.thumbnail_url,
        secondary_image_url: item.secondary_image_url
      }));
    } catch (error) {
      console.error('[SupabaseService] Error in getCustomPrompts:', error);
      return [];
    }
  }

  async deleteCustomPrompt(id: string, userId: string): Promise<boolean> {
    try {
      if (!this.supabase) return false;

      const { error } = await this.supabase
        .from('custom_prompts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId); // Extra safety to ensure user owns the prompt

      if (error) {
        console.error('[SupabaseService] Error deleting custom prompt:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('[SupabaseService] Error in deleteCustomPrompt:', error);
      return false;
    }
  }

  async saveCustomPrompt(userId: string, prompt: string, title?: string, thumbnailUrl?: string, secondaryImageUrl?: string): Promise<string | null> {
    try {
      if (!this.supabase) throw new Error('Supabase not configured');

      const { data, error } = await this.supabase
        .from('custom_prompts')
        .insert({
          user_id: userId,
          prompt_text: prompt,
          title: title,
          thumbnail_url: thumbnailUrl,
          secondary_image_url: secondaryImageUrl
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving custom prompt:', error);
        throw error;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error in saveCustomPrompt:', error);
      throw error;
    }
  }

  async updateCustomPrompt(id: string, userId: string, updates: { prompt_text?: string; title?: string; thumbnail_url?: string; secondary_image_url?: string }): Promise<boolean> {
    try {
      if (!this.supabase) return false;

      const { error } = await this.supabase
        .from('custom_prompts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating custom prompt:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in updateCustomPrompt:', error);
      return false;
    }
  }

  async saveGeneratedImage(userId: string, imageUrl: string, prompt?: string): Promise<void> {
    try {
      if (!this.supabase) throw new Error('Supabase not configured');

      const { error } = await this.supabase
        .from('generated_images')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          created_at: new Date().toISOString(),
          prompt: prompt, // Try to save prompt if column exists (it should be added to schema if not)
        });

      if (error) {
        // If error is about missing column 'prompt', try without it
        if (error.message?.includes('column "prompt" of relation "generated_images" does not exist')) {
          console.warn('[SupabaseService] Prompt column missing, saving without prompt');
          const { error: retryError } = await this.supabase
            .from('generated_images')
            .insert({
              user_id: userId,
              image_url: imageUrl,
              created_at: new Date().toISOString(),
            });
          if (retryError) throw retryError;
        } else {
          console.error('Error saving generated image metadata:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in saveGeneratedImage:', error);
      throw error;
    }
  }

  async getGeneratedImages(userId: string, limit: number = 50): Promise<{ id: string; image_url: string; created_at: string; prompt?: string }[]> {
    try {
      if (!this.supabase) return [];

      console.log('[SupabaseService] getGeneratedImages called for:', userId, 'limit:', limit);
      const { data, error } = await this.supabase
        .from('generated_images')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[SupabaseService] Error fetching generated images:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[SupabaseService] Error in getGeneratedImages:', error);
      return [];
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (!this.supabase) {
        console.warn('Supabase not configured, connection check failed');
        return false;
      }

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

  async debugConnection(): Promise<string> {
    if (!this.supabase) return 'Supabase client not initialized.';
    try {
      const { error } = await this.supabase.from('users').select('*', { count: 'exact', head: true });
      if (error) return `Connection Failed: ${error.message} (Code: ${error.code})`;
      return 'Success! Connected to Supabase.';
    } catch (e: any) {
      return `Exception: ${e.message}`;
    }
  }
}

export const supabaseService = new SupabaseService(); 
