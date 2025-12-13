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
import { useSignUp, useOAuth } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import tw from 'twrnc';
import { RootStackParamList } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import GlassButton from '../components/GlassButton';
import { MaterialIcons } from '@expo/vector-icons';
import AppBackground from '../components/AppBackground';

type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;

const { width: screenWidth } = Dimensions.get('window');

export default function SignUpScreen(): React.JSX.Element {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });
  const navigation = useNavigation<SignUpScreenNavigationProp>();

  const [emailAddress, setEmailAddress] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [pendingVerification, setPendingVerification] = useState<boolean>(false);
  const [code, setCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [isAppleLoading, setIsAppleLoading] = useState<boolean>(false);

  const onSignUpPress = async (): Promise<void> => {
    if (!isLoaded) return;

    setIsLoading(true);

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert('Error', err?.errors?.[0]?.message || 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  const onAppleSignUpPress = async (): Promise<void> => {
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

  const onGoogleSignUpPress = async (): Promise<void> => {
    setIsGoogleLoading(true);

    try {
      const { createdSessionId, setActive: setActiveOAuth } = await startGoogleOAuth();

      if (createdSessionId && setActiveOAuth) {
        await setActiveOAuth({ session: createdSessionId });
        navigation.navigate('Camera');
      }
    } catch (err: any) {
      console.error('Google OAuth error:', JSON.stringify(err, null, 2));
      Alert.alert('Error', 'Google sign-up failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const onVerifyPress = async (): Promise<void> => {
    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId });
        navigation.navigate('Camera');
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2));
        Alert.alert('Error', 'Verification failed. Please check your code.');
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert('Error', err?.errors?.[0]?.message || 'Failed to verify');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInPress = (): void => {
    navigation.navigate('SignIn');
  };

  if (pendingVerification) {
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
                <Text style={tw`text-3xl font-bold text-gray-800 mb-2`}>Verify your email</Text>
                <Text style={tw`text-base text-gray-600 text-center`}>
                  We sent a verification code to {emailAddress}
                </Text>
              </View>

              <View style={tw`mb-6`}>
                <View style={tw`mb-4`}>
                  <Text style={tw`text-base font-semibold text-gray-800 mb-2`}>Verification Code</Text>
                  <BlurView intensity={25} tint="light" style={tw`rounded-2xl`}>
                    <TextInput
                      style={tw`px-4 py-4 text-base text-gray-800 text-center`}
                      value={code}
                      onChangeText={setCode}
                      placeholder="Enter 6-digit code"
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={6}
                      placeholderTextColor="#9ca3af"
                    />
                  </BlurView>
                </View>

                <View style={tw`items-center mt-4`}>
                  <GlassButton size={64} onPress={onVerifyPress}>
                    {isLoading ? (
                      <Text style={tw`text-gray-900 font-semibold`}>...</Text>
                    ) : (
                      <MaterialIcons name="verified" size={26} color="#111827" />
                    )}
                  </GlassButton>
                </View>
              </View>

              <View style={tw`flex-row justify-center items-center`}>
                <Text style={tw`text-base text-gray-600`}>Didn't receive a code? </Text>
                <TouchableOpacity onPress={() => setPendingVerification(false)}>
                  <Text style={tw`text-base text-blue-500 font-semibold`}>Try again</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </AppBackground>
    );
  }

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
              <Text style={tw`text-3xl font-bold text-gray-800 mb-2`}>Create Account</Text>
              <Text style={tw`text-base text-gray-600 text-center`}>Join PopCam and start analyzing photos with AI</Text>
            </View>

            {/* Sign in with Apple Button */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={tw`items-center justify-center bg-black rounded-2xl py-3 mb-3 ${isAppleLoading ? 'opacity-60' : ''}`}
                onPress={onAppleSignUpPress}
                disabled={isAppleLoading}
              >
                {isAppleLoading ? (
                  <Text style={tw`text-white text-lg font-medium`}>Signing up...</Text>
                ) : (
                  <View style={tw`flex-row items-center`}>
                    <MaterialIcons name="apple" size={20} color="#FFFFFF" />
                    <Text style={tw`text-white text-lg font-semibold ml-2`}>Continue with Apple</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Google Sign Up Button */}
            <TouchableOpacity
              style={tw`items-center justify-center bg-transparent rounded-2xl py-2 mb-4 ${isGoogleLoading ? 'opacity-60' : ''}`}
              onPress={onGoogleSignUpPress}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Text style={tw`text-gray-800 text-lg font-medium`}>Creating account with Google...</Text>
              ) : (
                <Image
                  source={require('../../assets/signin-assets/ios_light_sq_SU_2x.png')}
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
                    placeholder="Create a password (8+ characters)"
                    secureTextEntry
                    placeholderTextColor="#9ca3af"
                  />
                </BlurView>
              </View>

              <View style={tw`items-center mt-4`}>
                <GlassButton size={64} onPress={onSignUpPress}>
                  {isLoading ? (
                    <Text style={tw`text-gray-900 font-semibold`}>...</Text>
                  ) : (
                    <MaterialIcons name="person-add" size={26} color="#111827" />
                  )}
                </GlassButton>
              </View>
            </View>


          </View>

          <View style={tw`flex-row justify-center items-center`}>
            <Text style={tw`text-base text-gray-600`}>Already have an account? </Text>
            <TouchableOpacity onPress={handleSignInPress}>
              <Text style={tw`text-base text-blue-500 font-semibold`}>Sign In</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView >
      </SafeAreaView >
    </AppBackground >
  );
}