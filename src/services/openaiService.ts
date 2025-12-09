import { API_CONFIG, ENV } from '../constants/config';
import { InfographicGenerationResult } from '../types';
import * as FileSystem from 'expo-file-system/legacy';

class OpenAIService {
  private apiKey: string;

  constructor() {
    this.apiKey = ENV.OPENAI_API_KEY;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  async generateInfographic(imageBase64: string): Promise<string> {
    if (!this.apiKey) {
      const fallbackKey: string = (ENV.OPENAI_API_KEY || '').trim();
      if (fallbackKey) {
        this.apiKey = fallbackKey;
      } else {
        throw new Error('OpenAI API key not configured');
      }
    }

    const staticPrompt = `
      Create an infographic version of this image, keep things cartoonish. 
      Use a clean, modern design with clear sections and visually pleasing layout.
      Include relevant visual elements that help explain the content.
      Organize information hierarchically with proper headings and sections.
      Make sure all the lines are pointed to the right part of the image.
      Use a professional color scheme.
      Make the text funny and engaging, but not too cheesy.
      Keep the output image same aspect ratio as the input image.
    `;

    try {
      // Create a temporary file from base64
      const tempFileUri = `${FileSystem.cacheDirectory}temp_image_${Date.now()}.jpg`;
      
      // Write base64 to file
      await FileSystem.writeAsStringAsync(tempFileUri, imageBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create FormData for React Native
      const formData = new FormData();
      
      // Use the temporary file for FormData (single image, not array like in example)
      formData.append('image', {
        uri: tempFileUri,
        type: 'image/jpeg',
        name: 'input-image.jpg',
      } as any);
      
      formData.append('prompt', staticPrompt);
      formData.append('model', 'gpt-image-1');
      formData.append('size', '1024x1536');
      formData.append('quality', 'high');

      const response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      // Clean up temporary file
      try {
        await FileSystem.deleteAsync(tempFileUri);
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary file:', cleanupError);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Check if we have response data like in the example
      if (!data.data || !data.data[0]) {
        throw new Error('No image data received from OpenAI');
      }

      // Handle response like in the example - check for both url and b64_json
      const responseData = data.data[0];
      
      if (responseData.b64_json) {
        // If we get base64 response like in the example, convert to data URL
        const dataUrl: string = `data:image/png;base64,${responseData.b64_json}`;
        return dataUrl;
      } else if (responseData.url) {
        // If we get URL response, return it directly
        return responseData.url;
      } else {
        throw new Error('No valid image data received from OpenAI');
      }
      
    } catch (error) {
      console.error('Error generating infographic:', error);
      throw new Error(`Failed to generate infographic: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createInfographicFromImage(imageBase64: string): Promise<InfographicGenerationResult> {
    try {
      // Generate infographic with static prompt using image edit
      const imageUrl: string = await this.generateInfographic(imageBase64);
      
      return {
        imageUrl,
        prompt: 'Static infographic generation prompt',
      };
    } catch (error) {
      console.error('Error creating infographic from image:', error);
      throw new Error(`Failed to create infographic: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const openaiService = new OpenAIService(); 
