import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert, View, Text } from 'react-native';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { RootStackParamList } from './src/types';
import { openaiService } from './src/services/openaiService';
import { nanoBananaService } from './src/services/nanoBananaService';
import { storageService } from './src/services/storageService';
import { supabaseService } from './src/services/supabaseService';
import { ENV } from './src/constants/config';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import LandingScreen from './src/screens/LandingScreen';
import SplashSwatchScreen from './src/screens/SplashSwatchScreen';
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

function AuthenticatedApp(): React.JSX.Element {
  useEffect(() => {
    console.log('[App] AuthenticatedApp mounted');
    initializeApp();
  }, []);

  const initializeApp = async (): Promise<void> => {
    try {
      // Prefer a user-saved API key, otherwise fall back to the environment config
      const storedApiKey: string | null = await storageService.getApiKey();
      const envApiKey: string = (ENV.OPENAI_API_KEY || '').trim();

      if (storedApiKey) {
        openaiService.setApiKey(storedApiKey);
      } else if (envApiKey) {
        openaiService.setApiKey(envApiKey);
      } else {
        // Surface a friendly reminder only when no key is available at all
        setTimeout(() => {
          Alert.alert(
            'OpenAI API Key Required',
            'To use AI analysis features, add an OpenAI API key in your environment configuration or through the in-app prompt.',
            [{ text: 'OK' }]
          );
        }, 2000);
      }

      const envNanoBananaKey: string = (ENV.NANO_BANANA_API_KEY || '').trim();
      if (envNanoBananaKey) {
        nanoBananaService.setApiKey(envNanoBananaKey);
      }

      const envNanoBananaModel: string = (ENV.NANO_BANANA_MODEL || '').trim();
      if (envNanoBananaModel) {
        nanoBananaService.setModel(envNanoBananaModel);
      }

      // Check Supabase connection
      await supabaseService.checkConnection().then((connected: boolean) => {
        if (!connected) {
          console.warn('Supabase connection check failed on startup');
        }
      });
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  return (
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
          component={HomeScreen}
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
          name="Analysis"
          component={AnalysisScreen}
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
    </NavigationContainer>
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

export default function App(): React.JSX.Element {
  // Check if Clerk is properly configured
  if (!publishableKey || publishableKey === 'pk_test_your_key_here') {
    return <ClerkNotConfigured />;
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
