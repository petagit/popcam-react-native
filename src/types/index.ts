export interface InfographicGenerationResult {
  imageUrl: string;
  prompt: string;
}

export interface ImageAnalysis {
  id: string;
  imageUri: string;
  description: string;
  tags: string[];
  timestamp: Date;
  confidence?: number;
  infographicUri?: string;
  infographicPrompt?: string;
  hasInfographic: boolean;
  userId?: string;
  cloudUrl?: string;
}

export interface CameraPermission {
  granted: boolean;
  canAskAgain: boolean;
}

export interface AppState {
  isLoading: boolean;
  error: string | null;
}

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Camera: undefined;
  Analysis: {
    imageUri: string;
    infographicUri?: string;
    showInfographicFirst?: boolean;
  };
  Gallery: undefined;
  Settings: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Auth: undefined;
  Landing: undefined;
  NanoBanana: {
    referenceImageUri?: string;
    presetId?: string;
    autoGenerate?: boolean;
    showConfirmation?: boolean;
    mode?: 'picker';
  } | undefined;
  NanoBananaConfirm: {
    referenceImageUri: string;
    presetId: string;
    presetTitle: string;
    customPrompt?: string;
  };
  NanoBananaResult: {
    resultUri?: string;
    referenceImageUri?: string | null;
    presetId?: string;
    presetTitle: string;
    autoGenerate?: boolean;
    customPrompt?: string;
  };
  PurchaseCredits: undefined;
};

export interface AppConfig {
  openaiApiKey: string;
  maxImageSize: number;
  supportedFormats: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  createdAt: Date;
  credits?: number;
}

export interface UserCredits {
  userId: string;
  credits: number;
  lastUpdated: Date;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'deduction' | 'addition';
  amount: number;
  reason: string;
  timestamp: Date;
  balanceAfter: number;
} 
