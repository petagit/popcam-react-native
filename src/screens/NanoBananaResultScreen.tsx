import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Alert,
  Share,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as MediaLibrary from 'expo-media-library';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import { RootStackParamList, ImageAnalysis } from '../types';
import { useUser } from '@clerk/clerk-expo';
import { NANO_BANANA_PRESETS, NanoBananaPreset } from '../lib/nanobanana-presets';
import { useCredits } from '../hooks/useCredits';
import { imageUtils } from '../utils/imageUtils';
import { nanoBananaService } from '../services/nanoBananaService';
import { storageService } from '../services/storageService';

type NanoBananaResultNavigationProp = StackNavigationProp<RootStackParamList, 'NanoBananaResult'>;
type NanoBananaResultRouteProp = RouteProp<RootStackParamList, 'NanoBananaResult'>;

export default function NanoBananaResultScreen(): React.JSX.Element {
  const navigation = useNavigation<NanoBananaResultNavigationProp>();
  const route = useRoute<NanoBananaResultRouteProp>();

  const { resultUri: initialResultUri, referenceImageUri, presetTitle, presetId, autoGenerate, customPrompt } = route.params;

  const [resultUri, setResultUri] = useState<string | undefined>(initialResultUri);
  const [showAfter, setShowAfter] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(!!autoGenerate);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev; // Stall at 90% until done
          // Slow down as we get closer to 90
          const increment = prev < 50 ? 5 : prev < 70 ? 2 : 1;
          return prev + increment;
        });
      }, 200);
    } else {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const { user } = useUser();
  const { credits, hasEnoughCredits, deductCredits, isLoading: creditsLoading, refetchCredits } = useCredits();

  useEffect(() => {
    if (user) {
      console.log('[NanoBanana] Current User:', { id: user.id, email: user.primaryEmailAddress?.emailAddress });
    }
  }, [user]);

  const selectedPreset: NanoBananaPreset | undefined = useMemo(
    () => NANO_BANANA_PRESETS.find((preset) => preset.id === presetId),
    [presetId]
  );

  const generateImage = useCallback(async () => {
    try {
      console.log('[NanoBanana] start generateImage', { credits, required: 1 });

      // Check credits
      if (!hasEnoughCredits(1)) {
        console.warn('[NanoBanana] Insufficient credits', { credits });
        Alert.alert(
          'Insufficient Credits',
          `Generating with Nano Banana costs 1 credit.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
            { text: 'Buy Credits', onPress: () => navigation.navigate('PurchaseCredits') },
          ]
        );
        setIsGenerating(false);
        return;
      }

      setIsGenerating(true);

      let referenceImageBase64: string | undefined;
      if (referenceImageUri) {
        console.log('[NanoBanana] Converting reference image to base64');
        referenceImageBase64 = await imageUtils.convertToBase64(referenceImageUri);
      }

      const isCustomSelected = presetId === 'custom';
      const promptToUse: string = isCustomSelected ? (customPrompt?.trim() ?? '') : selectedPreset!.prompt;

      console.log('[NanoBanana] Calling service with prompt:', promptToUse);

      const generatedDataUrl: string = await nanoBananaService.generateImage(
        promptToUse || 'Lego style', // Safety fallback
        referenceImageBase64
      );

      console.log('[NanoBanana] Service returned data URL length:', generatedDataUrl?.length);

      const localResultUri: string = await imageUtils.saveImageLocally(generatedDataUrl);
      console.log('[NanoBanana] Saved locally to:', localResultUri);

      // Deduct credits
      try {
        console.log('[NanoBanana] Deducting credits...');
        await deductCredits(1);
        console.log('[NanoBanana] Credits deducted successfully');
      } catch (e) {
        console.warn('[NanoBanana] Failed to deduct credits:', e);
      }

      // Save Analysis
      const analysis: ImageAnalysis = {
        id: imageUtils.generateAnalysisId(),
        imageUri: referenceImageUri ?? localResultUri,
        description: `Nano Banana - ${presetTitle}`,
        tags: ['nano-banana', presetId || 'custom'],
        timestamp: new Date(),
        infographicUri: localResultUri,
        infographicPrompt: promptToUse,
        hasInfographic: true,
        userId: user?.id,
      };

      await storageService.saveAnalysis(analysis, user?.id);

      // Save preference
      try {
        const existingPreferences: Record<string, any> = await storageService.getUserPreferences(user?.id);
        if (presetId) {
          await storageService.saveUserPreferences(
            { ...existingPreferences, nanoBananaLastPresetId: presetId },
            user?.id
          );
        }
      } catch (_) { }

      setResultUri(localResultUri);
    } catch (error) {
      console.error('[NanoBanana] Generation failed with error:', error);
      Alert.alert('Generation Failed', 'Could not generate image. You can try again or go back.', [
        { text: 'Try Again', onPress: () => generateImage() },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setIsGenerating(false);
    }
  }, [
    credits,
    hasEnoughCredits,
    deductCredits,
    navigation,
    referenceImageUri,
    presetId,
    customPrompt,
    selectedPreset,
    presetTitle,
    user?.id
  ]);

  useEffect(() => {
    // Wait for credits to load before attempting auto-generation
    // using resultUri check to ensure we don't regenerate if already done
    if (autoGenerate && !resultUri && !creditsLoading) {
      generateImage();
    }
  }, [autoGenerate, resultUri, creditsLoading, generateImage]);

  const imageToDisplay = useMemo(() => {
    if (!referenceImageUri) {
      return resultUri; // Fallback if no ref image
    }
    // If generating, show reference image (original)
    if (isGenerating) return referenceImageUri;

    // If we have result, follow toggle
    if (resultUri) {
      return showAfter ? resultUri : referenceImageUri;
    }

    return referenceImageUri;
  }, [referenceImageUri, resultUri, showAfter, isGenerating]);

  const handleToggleImage = useCallback(() => {
    if (!referenceImageUri || !resultUri || isGenerating) {
      return;
    }
    setShowAfter((prev) => !prev);
  }, [referenceImageUri, resultUri, isGenerating]);

  const handleShare = useCallback(async () => {
    if (!resultUri) return;
    try {
      await Share.share({
        url: resultUri,
        message: 'Check out this Nano Banana creation!'
      });
    } catch (error) {
      console.error('Error sharing Nano Banana image:', error);
      Alert.alert('Share Error', 'Unable to share the image at the moment.');
    }
  }, [resultUri]);

  const handleSaveToCameraRoll = useCallback(async () => {
    if (!resultUri) return;
    try {
      setIsSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Media library permission is required to save images.');
        return;
      }

      const asset = await MediaLibrary.createAssetAsync(resultUri);
      await MediaLibrary.createAlbumAsync('PopCam Nano Banana', asset, false);

      Alert.alert('Saved', 'Image saved to your photo library.');
    } catch (error) {
      console.error('Error saving Nano Banana image:', error);
      Alert.alert('Save Error', 'Unable to save the image to your photo library.');
    } finally {
      setIsSaving(false);
    }
  }, [resultUri]);

  const handleMakeAnother = useCallback(() => {
    if (presetId || referenceImageUri) {
      navigation.navigate('NanoBanana', {
        presetId: presetId ?? undefined,
        referenceImageUri: referenceImageUri ?? undefined,
      });
    } else {
      navigation.goBack();
    }
  }, [navigation, presetId, referenceImageUri]);

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <StatusBar style="dark" />

      <View style={tw`flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-200`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`py-2 px-3 flex-row items-center`}>
          <MaterialIcons name="arrow-back" size={18} color="#3b82f6" />
          <Text style={tw`text-base text-blue-500 font-semibold ml-1`}>Back</Text>
        </TouchableOpacity>
        <Text style={tw`text-lg font-semibold text-gray-800`} numberOfLines={1}>
          {presetTitle}
        </Text>
        <View style={tw`w-12`} />
      </View>

      <View style={tw`flex-1 px-5 py-6`}>
        <View style={tw`mb-6`}>
          <Pressable onPress={handleToggleImage} style={tw`rounded-3xl overflow-hidden bg-gray-200 relative`}>
            {/* Loading Overlay */}
            {isGenerating && (
              <View style={[tw`absolute z-20 top-0 left-0 right-0 bottom-0 justify-center items-center`, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                <View style={tw`w-4/5 items-center`}>
                  <Text style={tw`text-white text-lg font-bold mb-4`}>Creating Masterpiece...</Text>

                  {/* Progress Bar Container */}
                  <View style={tw`w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-2`}>
                    {/* Simulated Progress Fill */}
                    <View
                      style={[
                        tw`h-full bg-blue-500 rounded-full`,
                        { width: `${progress}%` }
                      ]}
                    />
                  </View>

                  <Text style={tw`text-blue-300 text-sm font-semibold`}>{progress}%</Text>
                </View>
              </View>
            )}

            <Image
              source={{ uri: imageToDisplay }}
              style={[tw`w-full`, { aspectRatio: 3 / 4 }]}
              resizeMode="cover"
            />

            {!isGenerating && (
              <>
                <View
                  style={[
                    tw`absolute top-4 left-4 px-3 py-1 rounded-full`,
                    { backgroundColor: 'rgba(0,0,0,0.6)' },
                  ]}
                >
                  <Text style={tw`text-white text-xs font-semibold uppercase`}>
                    {showAfter || !referenceImageUri ? 'After' : 'Before'}
                  </Text>
                </View>
                {referenceImageUri && (
                  <View style={tw`absolute bottom-4 left-4 right-4`}>
                    <Text
                      style={[
                        tw`text-white text-center text-xs py-2 rounded-full`,
                        { backgroundColor: 'rgba(0,0,0,0.5)' },
                      ]}
                    >
                      Tap to toggle before / after
                    </Text>
                  </View>
                )}
              </>
            )}
          </Pressable>
        </View>

        {/* Custom Prompt Display */}
        {(presetId === 'custom' || customPrompt) && (
          <View style={tw`bg-white rounded-2xl p-4 shadow-sm mb-6`}>
            <Text style={tw`text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide`}>Prompt Used</Text>
            <Text numberOfLines={3} style={tw`text-sm text-gray-800 italic leading-5`}>
              "{customPrompt || selectedPreset?.prompt}"
            </Text>
          </View>
        )}

        <View style={tw`bg-white rounded-2xl p-4 shadow-sm`}>
          <Text style={tw`text-base font-semibold text-gray-900 mb-3`}>Share your creation</Text>
          <View style={tw`flex-row justify-between`}>
            <TouchableOpacity
              style={[tw`flex-1 py-3 rounded-xl mr-2 items-center`, isGenerating ? tw`bg-gray-300` : tw`bg-blue-500`]}
              onPress={handleShare}
              disabled={isGenerating || !resultUri}
            >
              <Text style={tw`text-white font-semibold`}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`flex-1 bg-green-500 py-3 rounded-xl ml-2 items-center`}
              onPress={handleSaveToCameraRoll}
              disabled={isSaving}
            >
              {isSaving ? (
                <View style={tw`flex-row items-center`}>
                  <ActivityIndicator color="#fff" size="small" style={tw`mr-2`} />
                  <Text style={tw`text-white font-semibold`}>Saving…</Text>
                </View>
              ) : (
                <Text style={tw`text-white font-semibold`}>Save to Photos</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={tw`mt-6 py-4 rounded-2xl border border-blue-200 bg-white items-center`}
          onPress={handleMakeAnother}
        >
          <Text style={tw`text-blue-500 font-semibold`}>Make Another</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
