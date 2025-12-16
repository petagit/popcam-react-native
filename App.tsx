import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert, View, Text, ActivityIndicator } from 'react-native';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { RootStackParamList } from './src/types';
import { openaiService } from './src/services/openaiService';
import { nanoBananaService } from './src/services/nanoBananaService';
import { storageService } from './src/services/storageService';
import { supabaseService } from './src/services/supabaseService';
import { storeKitService } from './src/services/storeKitService';
import { ENV } from './src/constants/config';

// Onboarding
import { OnboardingProvider } from './src/features/onboarding/OnboardingContext';
import { OnboardingOverlay } from './src/features/onboarding/OnboardingOverlay';

// Screens
import UserScreen from './src/screens/UserScreen';
import CameraScreen from './src/screens/CameraScreen';
import GalleryImageScreen from './src/screens/GalleryImageScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import LandingScreen from './src/screens/LandingScreen';
import SplashSwatchScreen from './src/screens/SplashSwatchScreen';
import IntroAnimationScreen from './src/screens/IntroAnimationScreen';
import NanoBananaScreen from './src/screens/NanoBananaScreen';
import NanoBananaResultScreen from './src/screens/NanoBananaResultScreen';

import PurchaseCreditsScreen from './src/screens/PurchaseCreditsScreen';

const Stack = createStackNavigator<RootStackParamList>();

// Clerk publishable key configuration
const publishableKey: string = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

// Fallback component when Clerk is not configured
function ClerkNotConfigured(): React.JSX.Element {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Clerk Authentication Not Configured
      </Text>
      <Text style={{ textAlign: 'center', color: '#666' }}>
        Please set up your EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your environment configuration.
        See CLERK_SETUP.md for detailed instructions.
      </Text>
    </View>
  );
}

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuth } from '@clerk/clerk-expo';
import * as Crypto from 'expo-crypto';

// Polyfill for R2/AWS SDK
if (!global.crypto) {
  // @ts-ignore
  global.crypto = {
    getRandomValues: (array: any) => Crypto.getRandomValues(array),
  };
}

function AuthenticatedApp(): React.JSX.Element {
  const { getToken, isLoaded, userId } = useAuth();
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!isLoaded) return;

        if (userId) {
          console.log('[App] Authenticated as:', userId);

          // Define dynamic token provider
          const tokenProvider = async () => {
            try {
              const token = await getToken({ template: 'supabase' });
              return token || '';
            } catch (e) {
              console.error('[App] Failed to refresh token:', e);
              return '';
            }
          };

          // Initialize Supabase with the provider
          await supabaseService.setTokenProvider(tokenProvider);

          // Debug check
          if (__DEV__) {
            const initialToken = await tokenProvider();
            if (initialToken) supabaseService.logTokenDebug(initialToken);
          }

          // Init other services
          const storedApiKey: string | null = await storageService.getApiKey();
          const envApiKey: string = (ENV.OPENAI_API_KEY || '').trim();

          if (storedApiKey) {
            openaiService.setApiKey(storedApiKey);
          } else if (envApiKey) {
            openaiService.setApiKey(envApiKey);
          }

          const envNanoBananaKey: string = (ENV.NANO_BANANA_API_KEY || '').trim();
          if (envNanoBananaKey) nanoBananaService.setApiKey(envNanoBananaKey);

          const envNanoBananaModel: string = (ENV.NANO_BANANA_MODEL || '').trim();
          if (envNanoBananaModel) nanoBananaService.setModel(envNanoBananaModel);

          // Initialize StoreKit early (fire and forget, it handles its own errors)
          storeKitService.initialize().catch(err => console.log('StoreKit init deferred:', err.message));

          // Check Supabase connection
          supabaseService.checkConnection().then((connected: boolean) => {
            if (!connected) console.warn('Supabase connection check failed on startup');
          });

        } else {
          console.log('[App] No user, clearing Supabase auth');
          supabaseService.setAuthToken(null);
        }
      } catch (err) {
        console.error('[App] Error during auth init:', err);
      } finally {
        setIsReady(true);
      }
    };

    initAuth();
  }, [isLoaded, userId, getToken]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <OnboardingProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Camera"
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              };
            },
          }}
        >
          <Stack.Screen
            name="Home"
            component={UserScreen}
            options={{
              title: 'PopCam',
            }}
          />
          <Stack.Screen
            name="Camera"
            component={CameraScreen}
            options={{
              title: 'Camera',
              gestureEnabled: false, // Disable swipe back for camera
            }}
          />
          <Stack.Screen
            name="GalleryImage"
            component={GalleryImageScreen}
            options={{
              title: 'AI Analysis',
            }}
          />
          <Stack.Screen
            name="Gallery"
            component={GalleryScreen}
            options={{
              title: 'Gallery',
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
            }}
          />
          <Stack.Screen
            name="NanoBanana"
            component={NanoBananaScreen}
            options={{
              title: 'Nano Banana',
            }}
          />

          <Stack.Screen
            name="NanoBananaResult"
            component={NanoBananaResultScreen}
            options={{
              title: 'Nano Banana Result',
            }}
          />
          <Stack.Screen
            name="PurchaseCredits"
            component={PurchaseCreditsScreen}
            options={{
              title: 'Buy Credits',
            }}
          />
        </Stack.Navigator>

        {/* Global Onboarding Overlay */}
        <OnboardingOverlay />
      </NavigationContainer>
    </OnboardingProvider>
  );
}

function UnauthenticatedApp(): React.JSX.Element {
  console.log('[App] Rendering UnauthenticatedApp');
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashSwatchScreen}
          options={{
            title: 'Splash',
          }}
        />
        <Stack.Screen
          name="IntroAnimation"
          component={IntroAnimationScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Landing"
          component={LandingScreen}
          options={{
            title: 'Welcome',
          }}
        />
        <Stack.Screen
          name="SignIn"
          component={SignInScreen}
          options={{
            title: 'Sign In',
          }}
        />
        <Stack.Screen
          name="SignUp"
          component={SignUpScreen}
          options={{
            title: 'Sign Up',
          }}
        />
        {/* Allow guest access to camera for demo purposes */}
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{
            title: 'Camera (Demo)',
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Fallback component when Supabase is not configured
function SupabaseNotConfigured(): React.JSX.Element {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Supabase Not Configured
      </Text>
      <Text style={{ textAlign: 'center', color: '#666' }}>
        Please set up your EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment configuration.
      </Text>
    </View>
  );
}

export default function App(): React.JSX.Element {
  // Check if Clerk is properly configured
  if (!publishableKey || publishableKey === 'pk_test_your_key_here') {
    return <ClerkNotConfigured />;
  }

  // Check if Supabase is properly configured
  if (!supabaseService.isConfigured()) {
    return <SupabaseNotConfigured />;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        {/* Debug Logging */}
        <View style={{ position: 'absolute', top: 50, left: 10, zIndex: 999 }}>
          <Text style={{ color: 'red', fontSize: 12 }}>Check Logs</Text>
        </View>
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <UnauthenticatedApp />
        </SignedOut>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
