import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSignIn, useOAuth } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import tw from 'twrnc';
import { RootStackParamList } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import GlassButton from '../components/buttons/GlassButton';
import { MaterialIcons } from '@expo/vector-icons';
import AppBackground from '../components/AppBackground';

type SignInScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignIn'>;

const { width: screenWidth } = Dimensions.get('window');

export default function SignInScreen(): React.JSX.Element {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });
  const navigation = useNavigation<SignInScreenNavigationProp>();

  const [emailAddress, setEmailAddress] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [isAppleLoading, setIsAppleLoading] = useState<boolean>(false);

  const onSignInPress = async (): Promise<void> => {
    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        navigation.navigate('Camera');
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
        Alert.alert('Error', 'Sign in failed. Please check your credentials.');
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert('Error', err?.errors?.[0]?.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const onAppleSignInPress = async (): Promise<void> => {
    setIsAppleLoading(true);

    try {
      const { createdSessionId, setActive: setActiveOAuth } = await startAppleOAuth();

      if (createdSessionId && setActiveOAuth) {
        await setActiveOAuth({ session: createdSessionId });
        navigation.navigate('Camera');
      }
    } catch (err: any) {
      console.error('Apple OAuth error:', JSON.stringify(err, null, 2));
      Alert.alert('Error', 'Sign in with Apple failed. Please try again.');
    } finally {
      setIsAppleLoading(false);
    }
  };

  const onGoogleSignInPress = async (): Promise<void> => {
    setIsGoogleLoading(true);

    try {
      const { createdSessionId, setActive: setActiveOAuth } = await startGoogleOAuth();

      if (createdSessionId && setActiveOAuth) {
        await setActiveOAuth({ session: createdSessionId });
        navigation.navigate('Camera');
      }
    } catch (err: any) {
      console.error('Google OAuth error:', JSON.stringify(err, null, 2));
      Alert.alert('Error', 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignUpPress = (): void => {
    navigation.navigate('SignUp');
  };

  return (
    <AppBackground>
      <SafeAreaView style={tw`flex-1`}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw`flex-1`}
        >
          <View style={tw`flex-1 px-6 justify-center`}>
            <View style={tw`items-center mb-12`}>
              <Text style={tw`text-3xl font-bold text-gray-800 mb-2`}>Welcome Back</Text>
              <Text style={tw`text-base text-gray-600 text-center`}>Sign in to your PopCam account</Text>
            </View>

            {/* Sign in with Apple Button */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={tw`items-center justify-center bg-black rounded-2xl py-3 mb-3 ${isAppleLoading ? 'opacity-60' : ''}`}
                onPress={onAppleSignInPress}
                disabled={isAppleLoading}
              >
                {isAppleLoading ? (
                  <Text style={tw`text-white text-lg font-medium`}>Signing in...</Text>
                ) : (
                  <View style={tw`flex-row items-center`}>
                    <MaterialIcons name="apple" size={20} color="#FFFFFF" />
                    <Text style={tw`text-white text-lg font-semibold ml-2`}>Continue with Apple</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Google Sign In Button */}
            <TouchableOpacity
              style={tw`items-center justify-center bg-transparent rounded-2xl py-2 mb-4 ${isGoogleLoading ? 'opacity-60' : ''}`}
              onPress={onGoogleSignInPress}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Text style={tw`text-gray-800 text-lg font-medium`}>Signing in with Google...</Text>
              ) : (
                <Image
                  source={require('../../assets/signin-assets/ios_light_sq_SI_2x.png')}
                  style={[{ width: screenWidth * 0.8, height: 50 }]}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>

            {/* Divider */}
            {(Platform.OS === 'ios' || Platform.OS === 'android') && (
              <View style={tw`flex-row items-center my-6`}>
                <View style={tw`flex-1 h-px bg-gray-200`} />
                <Text style={tw`text-gray-500 text-sm mx-4`}>or</Text>
                <View style={tw`flex-1 h-px bg-gray-200`} />
              </View>
            )}

            <View style={tw`mb-6`}>
              <View style={tw`mb-4`}>
                <Text style={tw`text-base font-semibold text-gray-800 mb-2`}>Email</Text>
                <BlurView intensity={25} tint="light" style={tw`rounded-2xl`}>
                  <TextInput
                    style={tw`px-4 py-4 text-base text-gray-800`}
                    value={emailAddress}
                    onChangeText={setEmailAddress}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor="#9ca3af"
                  />
                </BlurView>
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-base font-semibold text-gray-800 mb-2`}>Password</Text>
                <BlurView intensity={25} tint="light" style={tw`rounded-2xl`}>
                  <TextInput
                    style={tw`px-4 py-4 text-base text-gray-800`}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry
                    placeholderTextColor="#9ca3af"
                  />
                </BlurView>
              </View>

              <View style={tw`items-center mt-4`}>
                <GlassButton size={64} onPress={onSignInPress}>
                  {isLoading ? (
                    <Text style={tw`text-gray-900 font-semibold`}>...</Text>
                  ) : (
                    <MaterialIcons name="login" size={26} color="#111827" />
                  )}
                </GlassButton>
              </View>
            </View>

            <View style={tw`flex-row justify-center items-center`}>
              <Text style={tw`text-base text-gray-600`}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleSignUpPress}>
                <Text style={tw`text-base text-blue-500 font-semibold`}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppBackground>
  );
}