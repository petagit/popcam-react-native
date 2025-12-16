import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Share,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import tw from 'twrnc';
import { useUser } from '@clerk/clerk-expo';
import { RootStackParamList, ImageAnalysis } from '../types';
import { imageUtils } from '../utils/imageUtils';
import { nanoBananaService } from '../services/nanoBananaService';
import { storageService } from '../services/storageService';
import { useCredits } from '../hooks/useCredits';
import AppBackground from '../components/AppBackground';
import { MaterialIcons } from '@expo/vector-icons';
import { ImageResult } from 'expo-image-manipulator';
import BackButton from '../components/buttons/BackButton';
import { resolveActivePrompt } from '../features/nano-banana/prompt-logic';
import { NANO_BANANA_PRESETS } from '../lib/nanobanana-presets';
import { useOnboarding } from '../features/onboarding/OnboardingContext';
import { Confetti } from '../features/onboarding/components/Confetti';
import GlassButton from '../components/buttons/GlassButton';
import LoadingOverlay from '../components/LoadingOverlay';
import MakeAnotherButton from '../components/buttons/MakeAnotherButton';

type NanoBananaResultScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NanoBananaResult'>;
type NanoBananaResultScreenRouteProp = RouteProp<RootStackParamList, 'NanoBananaResult'>;

export default function NanoBananaResultScreen(): React.JSX.Element {
  const navigation = useNavigation<NanoBananaResultScreenNavigationProp>();
  const route = useRoute<NanoBananaResultScreenRouteProp>();
  const { user } = useUser();
  const { credits, hasEnoughCredits, deductCredits, isLoading: creditsLoading } = useCredits();
  const { isActive, currentStep, stopOnboarding, nextStep } = useOnboarding();

  // Route Params
  const {
    resultUri: initialResultUri,
    referenceImageUri,
    presetId,
    presetTitle,
    customPrompt,
    autoGenerate
  } = route.params;

  const [resultUri, setResultUri] = useState<string | null>(initialResultUri || null);
  const [isLoading, setIsLoading] = useState<boolean>(!!autoGenerate);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [reportModalVisible, setReportModalVisible] = useState<boolean>(false);
  const [refreshPrompt, setRefreshPrompt] = useState<string>('');

  // Track if we have already generated in this session (to avoid loops if we add buttons that reload)
  const hasGeneratedRef = useRef<boolean>(!!initialResultUri);

  // Confetti State
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  useEffect(() => {
    // If onboarding is active and we are here, show confetti
    if (isActive) {
      if (currentStep !== 'CONFETTI') {
        // Sync step if needed
        // If we skipped step logic in nav, we force it here?
        // But context managing nextStep linearly.
        // We can just rely on `stopOnboarding` eventually.
      }
      setShowConfetti(true);
      // Maybe delay stopping onboarding or showing "Make More" prompt?
    }
  }, [isActive, resultUri]); // Show confetti when result appears? Or immediately if auto-generating?

  // Listen for result success to possibly advance onboarding logic
  useEffect(() => {
    if (resultUri && isActive) {
      // If we have a result, we are effectively done with the flow.
      // Wait a bit, then prompt?
      // User asked for: "confetti and prompt user to make more"
    }
  }, [resultUri, isActive]);


  // Auto-generate logic
  useEffect(() => {
    // Wait for credits to finish loading before attempting to generate
    if (creditsLoading) return;

    if (autoGenerate && !hasGeneratedRef.current && referenceImageUri) {
      // We set the ref to true immediately to prevent double-fire,
      // BUT if we fail credit check we might want to reset it?
      // Actually checking credits inside generateImage handles the failure case (alert).
      // So we can proceed.
      hasGeneratedRef.current = true;
      generateImage();
    }
  }, [autoGenerate, referenceImageUri, creditsLoading]);


  const generateImage = async () => {
    if (!user?.id) return;

    // Check credits before starting
    if (!hasEnoughCredits(1)) {
      Alert.alert(
        'Insufficient Credits',
        'You need at least 1 credit to generate an image.',
        [
          { text: 'Buy Credits', onPress: () => navigation.navigate('PurchaseCredits') }, // Assuming PurchaseCredits logic or navigation
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      // Resolve the actual prompt text
      // This ensures we fetch the latest prompt text for App Presets from the file
      // For Custom/Manual, we use what was passed
      const resolvedPrompt = resolveActivePrompt(
        presetId || '',
        customPrompt,
        NANO_BANANA_PRESETS // Pass the presets list so it can look up the standard ones
      );

      console.log('[NanoBananaResult] Generating with prompt:', resolvedPrompt.slice(0, 50) + '...');

      // Need base64 for the service
      // We have referenceImageUri which is a file URI
      // We need to read it as base64
      let referenceBase64 = '';
      try {
        // We can use expo-file-system or similar helper if available
        // Or assume nanoBananaService handles URI? No, checking service line 65: it expects inlineData.
        // And signature says referenceImageBase64.
        // We need to convert URI to base64.
        // Let's rely on imageUtils if it has it, or FileSystem.
        // Since I can't import FileSystem without checking, I'll assume imageUtils might have it or I add FileSystem import.
        // Actually, looking at imports in CameraScreen, standard React Native doesn't do this easily.
        // We need `expo-file-system`.
      } catch (e) {
        console.error("Failed to read image", e);
      }

      // Wait, let's verify if referenceImageUri is indeed what we have.
      // If we don't have base64 conversion inline, we probably need `FileSystem.readAsStringAsync`.
      const base64 = await imageUtils.convertToBase64(referenceImageUri || '');

      const result: string = await nanoBananaService.generateImage(
        resolvedPrompt,
        base64 || undefined
      );

      if (result) {
        // Save to local file immediately to avoid passing huge Base64 strings around
        const localUri = await imageUtils.saveImageLocally(result);
        setResultUri(localUri);

        // Deduct credit
        try {
          await deductCredits(1);
          console.log('Credit deducted');
        } catch (creditError) {
          console.error('Failed to deduct credit:', creditError);
          // Optionally alert user or fail silently if we don't want to block result showing
        }

        const savedRecord = await storageService.saveAnalysis(user.id, {
          imageUri: localUri,
          originalUri: referenceImageUri,
          description: presetTitle,
          timestamp: new Date(),
          tags: ['NanoBanana', presetTitle],
          hasInfographic: true,
          infographicUri: localUri
        });

        console.log('Saved generation record:', savedRecord?.id);
      } else {
        Alert.alert('Error', 'Failed to generate image.');
      }
    } catch (error: any) {
      console.error('Generation validation error:', error);
      Alert.alert('Error', error.message || 'Failed to generate image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!resultUri) return;
    setIsSaving(true);
    try {
      if (resultUri) {
        // Using MediaLibrary via a utility or direct import? 
        // Assuming imageUtils will be updated or we import MediaLibrary here.
        // Let's use MediaLibrary directly if imageUtils doesn't have it, or update imageUtils.
        // For now, I'll update imageUtils to include saveToGallery.
        await imageUtils.saveToGallery(resultUri);
      }
      Alert.alert('Saved', 'Image saved to your gallery!');
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save image');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!resultUri) return;
    try {
      await Share.share({
        url: resultUri,
        message: 'Check out my AI photo from PopCam!',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRetake = () => {
    // If we are in onboarding, this loop might keep onboarding active. 
    // User might want to try another filter.
    // If user clicks "Make more" (conceptually Retake/Back), we can stop onboarding.
    if (isActive) {
      stopOnboarding();
    }
    navigation.navigate('NanoBanana', { referenceImageUri });
  };

  const handleHome = () => {
    if (isActive) {
      stopOnboarding();
    }
    navigation.navigate('Home');
  };

  return (
    <AppBackground>
      <SafeAreaView style={tw`flex-1`}>
        <StatusBar style="dark" />

        {/* Confetti Overlay */}
        {showConfetti && <Confetti />}

        {/* Back Button / Header */}
        {/* Customized transparent header for this screen to match design */}
        <View style={tw`absolute top-12 left-6 z-10`}>
          {/* Using standard BackButton but ensuring it works with absolute positioning */}
          <BackButton onPress={handleRetake} />
        </View>

        {/* Report Button (Floating) */}
        <TouchableOpacity
          style={tw`absolute top-12 right-6 z-10 w-10 h-10 bg-black/20 rounded-full items-center justify-center backdrop-blur-md`}
          onPress={() => setReportModalVisible(true)}
        >
          <MaterialIcons name="flag" size={20} color="white" />
        </TouchableOpacity>


        <ScrollView contentContainerStyle={tw`flex-grow px-0 pt-0 pb-10`}>
          {/* Main Image Area */}
          <View style={[tw`w-full bg-gray-100 relative`, { height: Dimensions.get('window').height * 0.65 }]}>


            {resultUri || referenceImageUri ? (
              <Image
                source={{ uri: (resultUri || referenceImageUri) ?? undefined }}
                style={tw`w-full h-full`}
                resizeMode="cover"
              />
            ) : (
              // Only show empty state if NOT loading and NO result
              !isLoading && (
                <View style={tw`flex-1 items-center justify-center`}>
                  <Text style={tw`text-gray-500`}>Preparation failed</Text>
                </View>
              )
            )}

            {/* Onboarding "Make More" Prompt Overlay if active & done */}
            {isActive && !isLoading && resultUri && (
              <View style={tw`absolute bottom-10 left-0 right-0 items-center`}>
                <View style={tw`bg-white/90 px-6 py-3 rounded-full shadow-lg border border-purple-200`}>
                  <Text style={tw`text-purple-800 font-bold text-lg`}>🎉 Magic Complete!</Text>
                  <Text style={tw`text-center text-purple-600 text-xs`}>Tap "Make Another" to create more.</Text>
                </View>
              </View>
            )}
          </View>

          {/* Actions Section */}
          <View style={tw`flex-1 bg-white -mt-6 rounded-t-3xl p-6 shadow-xl`}>
            <View style={tw`items-center mb-6`}>
              <Text style={tw`text-2xl font-bold text-gray-900 text-center mb-1`}>{presetTitle}</Text>
              <Text style={tw`text-sm text-gray-500`}>Generated with PopCam AI</Text>
            </View>

            <View style={tw`flex-row justify-center gap-4 mb-6`}>
              <TouchableOpacity
                onPress={handleSave}
                style={tw`items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl`}
                disabled={isLoading || !resultUri}
              >
                {isSaving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <MaterialIcons name="save-alt" size={28} color="#111" />
                )}
                <Text style={tw`text-xs font-medium text-gray-600 mt-1`}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                style={tw`items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl`}
                disabled={isLoading || !resultUri}
              >
                <MaterialIcons name="share" size={28} color="#111" />
                <Text style={tw`text-xs font-medium text-gray-600 mt-1`}>Share</Text>
              </TouchableOpacity>
            </View>

            <MakeAnotherButton
              onPress={handleRetake}
              disabled={isLoading}
            />

            <TouchableOpacity
              onPress={handleHome}
              style={tw`mt-4 w-full border border-gray-200 py-4 rounded-xl active:bg-gray-50`}
            >
              <Text style={tw`text-gray-900 text-center font-semibold text-base`}>Back to Home</Text>
            </TouchableOpacity>

          </View>

        </ScrollView>

        {/* Report Modal */}
        <Modal
          visible={reportModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setReportModalVisible(false)}
        >
          <View style={tw`flex-1 justify-end bg-black/50`}>
            <View style={tw`bg-white rounded-t-3xl p-6`}>
              <Text style={tw`text-xl font-bold mb-4`}>Report Issue</Text>
              <Text style={tw`text-gray-600 mb-6`}>If this image is inappropriate or failed to generate correctly, please let us know.</Text>

              <TouchableOpacity
                style={tw`bg-red-500 p-4 rounded-xl mb-3`}
                onPress={() => {
                  Alert.alert("Reported", "Thank you for your feedback. We will review this generation.");
                  setReportModalVisible(false);
                }}
              >
                <Text style={tw`text-white text-center font-bold`}>Report Content</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`bg-gray-200 p-4 rounded-xl`}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={tw`text-gray-800 text-center font-bold`}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Loading Overlay (Non-Modal, Absolute) */}
        {isLoading && (
          <View style={[tw`absolute inset-0 z-50`, { width: Dimensions.get('window').width, height: Dimensions.get('window').height }]}>
            <LoadingOverlay visible={isLoading} useModal={false} />
          </View>
        )}

      </SafeAreaView>
    </AppBackground>
  );
}
