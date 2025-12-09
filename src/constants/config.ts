export const API_CONFIG = {
  OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
  MODEL: 'gpt-4o',
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.7,
} as const;

export const NANO_BANANA_API_CONFIG = {
  BASE_URLS: [
    'https://generativelanguage.googleapis.com/v1beta',
    'https://generativeai.googleapis.com/v1beta',
  ],
  DEFAULT_MODEL: 'gemini-3-pro-image-preview',
  FALLBACK_MODELS: [
    'gemini-2.5-flash-image',
  ],
} as const;

export const APP_CONFIG = {
  MAX_IMAGE_SIZE: 1024 * 1024 * 5, // 5MB
  SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'gif'],
  IMAGE_QUALITY: 0.8,
  MAX_ANALYSES_STORED: 100,
} as const;

export const CAMERA_CONFIG = {
  ASPECT_RATIO: [4, 3] as [number, number],
  QUALITY: 0.8,
  ALLOW_EDITING: true,
  MEDIA_TYPES: 'Photos' as const,
} as const;

export const STORAGE_KEYS = {
  OPENAI_API_KEY: '@popcam_openai_key',
  ANALYSES: '@popcam_analyses',
  USER_PREFERENCES: '@popcam_preferences',
  CUSTOM_PROMPT_HISTORY: '@popcam_custom_prompt_history',
} as const;

// Environment variables (you'll need to set these)
export const ENV = {
  OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  NANO_BANANA_API_KEY: process.env.EXPO_PUBLIC_NANO_BANANA_API_KEY || '',
  NANO_BANANA_MODEL: process.env.EXPO_PUBLIC_NANO_BANANA_MODEL || '',
} as const;
