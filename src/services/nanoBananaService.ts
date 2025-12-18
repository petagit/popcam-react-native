import { ENV, NANO_BANANA_API_CONFIG } from '../constants/config';

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message?: string };
}

class NanoBananaService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = ENV.NANO_BANANA_API_KEY;
    this.model = (ENV.NANO_BANANA_MODEL || '').trim() || NANO_BANANA_API_CONFIG.DEFAULT_MODEL;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setModel(model: string): void {
    this.model = model.trim() || NANO_BANANA_API_CONFIG.DEFAULT_MODEL;
  }

  async generateImage(prompt: string, referenceImageBase64?: string): Promise<string> {
    if (!this.apiKey) {
      const fallbackKey: string = (ENV.NANO_BANANA_API_KEY || '').trim();
      if (fallbackKey) {
        this.apiKey = fallbackKey;
      } else {
        throw new Error('Nano Banana API key not configured');
      }
    }

    console.log('[NanoBananaService] Config Verify:', JSON.stringify(NANO_BANANA_API_CONFIG, null, 2));

    // Test specific API reachability (lightweight)
    try {
      const testUrl = `${NANO_BANANA_API_CONFIG.BASE_URLS[0]}/models?key=${encodeURIComponent(this.apiKey)}`;
      console.log('[NanoBananaService] Testing API Reachability (GET models)...');
      const testRes = await fetch(testUrl);
      console.log(`[NanoBananaService] API Reachability Result: ${testRes.status} ${testRes.statusText}`);
    } catch (e) {
      console.error('[NanoBananaService] API Reachability FAILED:', e);
    }

    const modelsToTry: string[] = Array.from(
      new Set(
        [this.model, ...NANO_BANANA_API_CONFIG.FALLBACK_MODELS]
          .filter(Boolean)
          .map((candidate: string) => candidate.trim())
          .filter((candidate: string) => candidate.length > 0)
      )
    );

    const errors: string[] = [];

    for (const baseUrl of NANO_BANANA_API_CONFIG.BASE_URLS) {
      for (const modelCandidate of modelsToTry) {
        const url = `${baseUrl}/models/${modelCandidate}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

        const parts: GeminiPart[] = [{ text: prompt }];
        if (referenceImageBase64) {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: referenceImageBase64,
            },
          });
        }

        const requestBody = {
          contents: [
            {
              parts,
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE"],
          },
        };

        console.log(`[NanoBananaService] Preparing fetch to: ${baseUrl}/models/${modelCandidate}:generateContent`);
        console.log(`[NanoBananaService] Reference Image Present: ${!!referenceImageBase64}, Length: ${referenceImageBase64?.length ?? 0}`);
        const payloadString = JSON.stringify(requestBody);
        console.log(`[NanoBananaService] Payload size: ${payloadString.length} chars`);

        try {
          const start = Date.now();
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': this.apiKey,
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();

            if (response.status === 404 || response.status === 429) {
              errors.push(
                `${response.status} via ${baseUrl}/models/${modelCandidate}:generateContent - ${errorText || response.statusText}`
              );
              continue;
            }

            if (response.status === 403 || response.status === 401) {
              throw new Error('Nano Banana API key rejected by Gemini API');
            }

            throw new Error(`Nano Banana API error: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const data: GeminiResponse = await response.json();
          // Log full response for debugging
          console.log('[NanoBananaService] Full API Response:', JSON.stringify(data, null, 2));

          const imagePayload = this.extractImagePayload(data);

          if (!imagePayload) {
            console.error('[NanoBananaService] Image payload extraction failed. Candidates:', JSON.stringify(data.candidates, null, 2));

            // Try to extract text content to see if it's a refusal or message
            const firstCandidate = data.candidates?.[0];
            const textPart = firstCandidate?.content?.parts?.find(p => p.text);
            const textMessage = textPart?.text;

            const baseMessage = data.error?.message || 'No image data returned from Nano Banana';
            const detailedMessage = textMessage ? `${baseMessage}. Model says: ${textMessage}` : baseMessage;

            throw new Error(detailedMessage);
          }

          // Cache working model so subsequent calls avoid fallback dance
          this.model = modelCandidate;

          const mimeType = imagePayload.mimeType || 'image/png';
          return `data:${mimeType};base64,${imagePayload.base64}`;
        } catch (error) {
          const duration = Date.now() - (Date.now()); // Placeholder, difficult to scope 'start' correctly without larger refactor, using simplified logging
          console.error('[NanoBananaService] RAW FETCH ERROR:', error);
          if (error instanceof TypeError && error.message === 'Network request failed') {
            console.error('[NanoBananaService] Network request failed. This often means:');
            console.error('1. Device is offline or has shaky connection.');
            console.error('2. URL is blocked or invalid (check ATS on iOS).');
            console.error('3. Payload is too large (check base64 length).');
          }

          if (error instanceof Error && /(404|429|No image data)/.test(error.message)) {
            console.warn(`[NanoBananaService] Model ${modelCandidate} failed: ${error.message}. Trying next...`);
            errors.push(error.message);
            continue;
          }

          console.error('Error generating Nano Banana image:', error);
          throw new Error(
            `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    const fallbackMessage =
      errors.length > 0
        ? `All Nano Banana endpoints returned 404. Last response: ${errors[errors.length - 1]}`
        : 'Nano Banana endpoints unavailable.';

    throw new Error(`Failed to generate image: ${fallbackMessage}`);
  }

  private extractImagePayload(response: GeminiResponse): { base64: string; mimeType?: string } | null {
    const firstCandidate: GeminiCandidate | undefined = response.candidates?.[0];
    const parts: GeminiPart[] | undefined = firstCandidate?.content?.parts;
    const imagePart: GeminiPart | undefined = parts?.find((part: GeminiPart) => !!part.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      return null;
    }

    return {
      base64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    };
  }
}

export const nanoBananaService = new NanoBananaService();
