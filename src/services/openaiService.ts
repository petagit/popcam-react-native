import { apiFetch } from './apiClient';
import { InfographicGenerationResult } from '../types';

class OpenAIService {
  // Kept for legacy compatibility — API key is no longer used client-side
  setApiKey(_apiKey: string): void {}

  async generateInfographic(imageBase64: string): Promise<string> {
    const image = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const response = await apiFetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ image }),
    });

    if (!response.ok) {
      let errorMessage = `Backend error: ${response.status}`;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.message || errorBody.error || errorMessage;
      } catch {
        // keep default message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const result: string = data.imageUrl || data.storedImageUrl;
    if (!result) {
      throw new Error('No image data returned from backend');
    }

    return result;
  }

  async createInfographicFromImage(imageBase64: string): Promise<InfographicGenerationResult> {
    const imageUrl = await this.generateInfographic(imageBase64);
    return { imageUrl, prompt: 'Infographic generation via web backend' };
  }
}

export const openaiService = new OpenAIService();
