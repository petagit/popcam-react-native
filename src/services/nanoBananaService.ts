import { apiFetch } from './apiClient';

class NanoBananaService {
  async generateImage(prompt: string, referenceImageBase64?: string): Promise<string> {
    if (!referenceImageBase64) {
      throw new Error('A reference image is required for generation');
    }

    // Construct data URL from raw base64 string
    const imageDataUrl = referenceImageBase64.startsWith('data:')
      ? referenceImageBase64
      : `data:image/jpeg;base64,${referenceImageBase64}`;

    const response = await apiFetch('/api/nanobanana', {
      method: 'POST',
      body: JSON.stringify({ imageDataUrl, prompt }),
    });

    if (!response.ok) {
      let errorMessage = `Backend error: ${response.status}`;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.error || errorBody.message || errorMessage;
      } catch {
        // keep default message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Prefer the immediate base64 data URL for display; fall back to stored URL
    const result: string = data.dataUrl || data.imageUrl;
    if (!result) {
      throw new Error('No image data returned from backend');
    }

    return result;
  }
}

export const nanoBananaService = new NanoBananaService();
