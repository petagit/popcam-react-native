import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useOAuth } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import tw from 'twrnc';
import { RootStackParamList } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';

type LandingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Landing'>;

const { width: screenWidth } = Dimensions.get('window');

export default function LandingScreen(): React.JSX.Element {
  const navigation = useNavigation<LandingScreenNavigationProp>();
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [isAppleLoading, setIsAppleLoading] = useState<boolean>(false);
  const [isOAuthAvailable, setIsOAuthAvailable] = useState<boolean>(true);

  // Carousel
  const cardWidth = Math.round(screenWidth * 0.72);
  const cardGap = 16;
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const scrollRef = useRef<ScrollView | null>(null);

  // Initialize OAuth hooks with error handling
  let startGoogleOAuthFlow: (() => Promise<any>) | null = null;
  let startAppleOAuthFlow: (() => Promise<any>) | null = null;

  try {
    const googleOAuth = useOAuth({ strategy: 'oauth_google' });
    startGoogleOAuthFlow = googleOAuth.startOAuthFlow;

    const appleOAuth = useOAuth({ strategy: 'oauth_apple' });
    startAppleOAuthFlow = appleOAuth.startOAuthFlow;
  } catch (error) {
    console.warn('OAuth setup error:', error);
    // We don't disable all OAuth here, just try best effort
  }

  const onAppleSignInPress = async (): Promise<void> => {
    if (!startAppleOAuthFlow) {
      Alert.alert('Error', 'Apple Sign in is not initialized');
      return;
    }

    setIsAppleLoading(true);

    try {
      const { createdSessionId, setActive } = await startAppleOAuthFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        navigation.navigate('Camera');
      }
    } catch (err: any) {
      console.error('Apple OAuth error:', JSON.stringify(err, null, 2));
      // Don't show alert if user cancelled
      if (err?.code !== 'session_exists') {
        Alert.alert('Error', 'Sign in with Apple failed. Please try again.');
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  const onGoogleSignInPress = async (): Promise<void> => {
    if (!startGoogleOAuthFlow || !isOAuthAvailable) {
      Alert.alert(
        'Google Sign-In Not Available',
        'Google OAuth is not configured. Please use email sign-up or contact support.',
        [
          { text: 'Use Email Instead', onPress: handleEmailSignInPress },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    setIsGoogleLoading(true);

    try {
      const { createdSessionId, setActive } = await startGoogleOAuthFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        navigation.navigate('Camera');
      }
    } catch (err: any) {
      console.error('Google OAuth error:', JSON.stringify(err, null, 2));
      Alert.alert(
        'Sign-In Error',
        'Google sign-in failed. Please try email sign-up instead or check your internet connection.',
        [
          { text: 'Use Email Instead', onPress: handleEmailSignInPress },
          { text: 'Try Again', onPress: onGoogleSignInPress },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSignInPress = (): void => {
    navigation.navigate('SignIn');
  };

  return (
    <SafeAreaView style={tw`flex-1`}>
      <LinearGradient
        colors={['#FFFFFF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={tw`flex-1`}
      >
        <StatusBar style="dark" backgroundColor="#fff" />

        <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-10`} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={tw`pt-8 items-center px-6`}>
            <Text style={tw`text-5xl font-extrabold text-gray-900`}>POPCAM</Text>
            <View style={tw`mt-3`}>
              <Text style={tw`text-base text-gray-700 text-center`}>make a fun photo with AI</Text>
              <Text style={tw`text-base text-gray-700 text-center`}>share seamlessly</Text>
              <Text style={tw`text-base text-gray-700 text-center`}>loaded with the latest nanobanana</Text>
            </View>
          </View>

          {/* Carousel */}
          <View style={tw`mt-8`}>
            <ScrollView
              ref={scrollRef}
              horizontal
              decelerationRate="fast"
              snapToInterval={cardWidth + cardGap}
              snapToAlignment="center"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: (screenWidth - cardWidth) / 2 }}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const index = Math.round(x / (cardWidth + cardGap));
                if (index !== activeIndex) setActiveIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {[
                require('../../assets/preset-image/preset-model.png'),
                require('../../assets/preset-image/preset-model3.png'),
                require('../../assets/preset-image/preset-model5.png'),
                require('../../assets/preset-image/preset-model7.png'),
              ].map((src, idx) => (
                <View key={idx} style={[tw`rounded-2xl overflow-hidden mr-4 bg-gray-200`, { width: cardWidth, height: cardWidth * 1.25 }]}>
                  <Image source={src} style={tw`w-full h-full`} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
            {/* Dots */}
            <View style={tw`flex-row items-center justify-center mt-4`}>
              {[0, 1, 2, 3].map(i => (
                <View key={i} style={[tw`h-2 w-2 rounded-full mx-1`, { backgroundColor: i === activeIndex ? '#111827' : '#D1D5DB' }]} />
              ))}
            </View>
          </View>

          {/* Buttons */}
          <View style={tw`px-6 mt-10`}>
            {/* Apple Sign In - iOS only */}
            {Platform.OS === 'ios' && isOAuthAvailable && (
              <TouchableOpacity onPress={onAppleSignInPress} disabled={isAppleLoading} style={tw`mb-3`}>
                <View style={tw`rounded-xl h-12 items-center justify-center flex-row bg-black`}>
                  {isAppleLoading ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={tw`ml-2 text-white text-lg font-medium`}>Signing in...</Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="apple" size={24} color="#FFFFFF" />
                      <Text style={tw`ml-2 text-white text-lg font-semibold`}>continue with apple</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {isOAuthAvailable && (
              <TouchableOpacity onPress={onGoogleSignInPress} disabled={isGoogleLoading}>
                <View style={tw`rounded-xl h-12 items-center justify-center flex-row border border-gray-900 bg-white`}>
                  {isGoogleLoading ? (
                    <>
                      <ActivityIndicator size="small" color="#111827" />
                      <Text style={tw`ml-2 text-gray-900 text-lg font-medium`}>Signing in...</Text>
                    </>
                  ) : (
                    <>
                      <AntDesign name="google" size={20} color="#111827" />
                      <Text style={tw`ml-2 text-gray-900 text-lg font-semibold`}>sign in with google</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            )}

            <View style={tw`mt-3`}>
              <TouchableOpacity onPress={handleEmailSignInPress}>
                <View style={tw`rounded-xl h-12 items-center justify-center border border-gray-900 bg-white`}>
                  <Text style={tw`text-gray-900 text-lg font-semibold`}>sign in</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
