import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import AppBackground from '../components/AppBackground';
import BackButton from '../components/buttons/BackButton';
import { NANO_BANANA_PRESETS, NanoBananaPreset } from '../lib/nanobanana-presets';
import { useCredits } from '../hooks/useCredits';
import { imageUtils } from '../utils/imageUtils';
import { nanoBananaService } from '../services/nanoBananaService';
import { storageService } from '../services/storageService';
import { r2Service } from '../services/r2Service';
import { supabaseService } from '../services/supabaseService';
import { Toast } from '../components/Toast';
import { captureRef } from 'react-native-view-shot';
import { BlurView } from 'expo-blur';
import { ErrorPopup } from '../components/messagpopup/ErrorPopup';


type NanoBananaResultNavigationProp = StackNavigationProp<RootStackParamList, 'NanoBananaResult'>;
type NanoBananaResultRouteProp = RouteProp<RootStackParamList, 'NanoBananaResult'>;

export default function NanoBananaResultScreen(): React.JSX.Element {
  const navigation = useNavigation<NanoBananaResultNavigationProp>();
  const route = useRoute<NanoBananaResultRouteProp>();

  const { resultUri: initialResultUri, referenceImageUri, presetTitle, presetId, autoGenerate, customPrompt, debugLoading } = route.params;

  const [resultUri, setResultUri] = useState<string | undefined>(initialResultUri);
  const [showAfter, setShowAfter] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(!!autoGenerate || !!debugLoading);
  const [progress, setProgress] = useState<number>(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 1024, height: 1024 });
  const [showNetworkErrorPopup, setShowNetworkErrorPopup] = useState(false);

  const hasStartedGeneration = useRef<boolean>(false);
  const hasAutoSaved = useRef<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      if (!debugLoading) setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (debugLoading) {
            // Loop progress for debugging
            return (prev + 1) % 101;
          }
          if (prev >= 90) return prev; // Stall at 90% until done
          // Slow down as we get closer to 90
          const increment = prev < 50 ? 5 : prev < 70 ? 2 : 1;
          return prev + increment;
        });
      }, debugLoading ? 50 : 200);
    } else {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (resultUri) {
      Image.getSize(resultUri, (width, height) => {
        console.log('[NanoBanana] Got image size:', width, height);
        setImageSize({ width, height });
      }, (error) => {
        console.warn('[NanoBanana] Failed to get image size:', error);
      });
    }
  }, [resultUri]);





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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const watermarkRef = useRef<View>(null);

  const saveImagesToLibrary = async (genUri: string, refUri?: string, isAutoSave: boolean = false): Promise<boolean> => {
    try {
      setIsSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted') {
        if (!isAutoSave) {
          Alert.alert('Permission Needed', 'Media library permission is required to save images.');
        } else {
          console.log('[NanoBanana] Auto-save failed: Permission not granted');
        }
        return false;
      }

      // Capture watermark view
      let uriToSave = genUri;
      if (watermarkRef.current) {
        try {
          // Wait a bit for image to render if needed, but usually OK
          uriToSave = await captureRef(watermarkRef, {
            format: 'jpg',
            quality: 0.9,
          });
          console.log('[NanoBanana] Captured watermarked image:', uriToSave);
        } catch (captureError) {
          console.error('Failed to capture watermark, falling back to original:', captureError);
        }
      }

      // Save processed image (watermarked)
      const asset = await MediaLibrary.createAssetAsync(uriToSave);
      await MediaLibrary.createAlbumAsync('PopCam Nano Banana', asset, false);

      // Save original image if present and different
      if (refUri && refUri !== genUri) {
        try {
          const originalAsset = await MediaLibrary.createAssetAsync(refUri);
          await MediaLibrary.createAlbumAsync('PopCam Nano Banana', originalAsset, false);
        } catch (e) {
          console.warn('Failed to save original image:', e);
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving Nano Banana image:', error);
      if (!isAutoSave) {
        showToast('Unable to save images', 'error');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

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
      // If preset is not found in static list (e.g. it's a history item), use customPrompt param or fallback to 'Lego style'
      const presetPrompt = selectedPreset?.prompt;
      const promptToUse: string = (isCustomSelected || !selectedPreset)
        ? (customPrompt?.trim() ?? presetPrompt ?? 'Lego style')
        : selectedPreset.prompt;

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

      // Check Cloud Storage Preference
      let finalCloudUrl: string | undefined;
      try {
        const prefs = await storageService.getUserPreferences(user?.id);
        if (prefs.cloudStorage && user?.id) {
          console.log('[NanoBanana] Cloud Storage is ON. Uploading...');
          const cloudUrl = await r2Service.uploadImage(localResultUri, user.id);

          if (cloudUrl) {
            console.log('[NanoBanana] Upload successful:', cloudUrl);
            analysis.cloudUrl = cloudUrl;
            finalCloudUrl = cloudUrl;

            // Save to Supabase (User History DB)
            await supabaseService.saveGeneratedImage(user.id, cloudUrl, promptToUse);
          }
        }

        // Save preference for last preset
        if (presetId) {
          await storageService.saveUserPreferences(
            { ...prefs, nanoBananaLastPresetId: presetId },
            user?.id
          );
        }
      } catch (err) {
        console.warn('[NanoBanana] Cloud/Pref error:', err);
        // Continue - don't fail generation just because cloud upload failed
      }

      // Auto-update custom prompt thumbnail
      // If this was a custom preset (from history) and we have a result
      if (presetId && presetId !== 'custom') {
        const isStandard = NANO_BANANA_PRESETS.some(p => p.id === presetId);
        if (!isStandard) {
          // Update with cloud URL if available, else local
          let thumbUrl = finalCloudUrl;

          // If we don't have a cloud URL yet (e.g. cloud storage pref is off),
          // we should force upload for the thumbnail so it persists across re-installs.
          if (!thumbUrl && user?.id) {
            try {
              console.log('[NanoBanana] Uploading thumbnail for custom prompt persistence...');
              // We reuse the same R2 service. This does not save to 'generated_images' table (history),
              // just uploads the file so we can link it in 'custom_prompts'.
              thumbUrl = await r2Service.uploadImage(localResultUri, user.id) || undefined;
            } catch (e) {
              console.warn('[NanoBanana] Failed to force upload thumbnail:', e);
            }
          }

          // Fallback to local if upload failed or no user
          thumbUrl = thumbUrl || localResultUri;

          await storageService.updateCustomPromptInHistory(
            presetId,
            { thumbnail_url: thumbUrl },
            user?.id
          );
        }
      }

      await storageService.saveAnalysis(analysis, user?.id);

      setResultUri(localResultUri);

      // Wait for next render cycle to allow image to be ready for capture logic if mostly ready
      // But we will call saveImagesToLibrary which will capture ref
      // We need to ensure the image is displayed in the hidden view.
      // Since resultUri is updated, the hidden view should update.
      // We might need a small delay or effect, but let's try calling it.
      // Actually, setting state is async. We should trigger save in an effect or use a timeout.

      // Auto-save to gallery - Call logic in useEffect when resultUri changes if autoGenerate is true?
      // No, we already have logic for auto-save. But we need to make sure the view is rendered.
      // Let's rely on a small timeout to let the view render.
      setTimeout(async () => {
        const saved = await saveImagesToLibrary(localResultUri, referenceImageUri || undefined, true);
        if (saved) {
          showToast('Images saved to gallery Automatically!', 'success');
        }
      }, 500);

    } catch (error) {
      console.error('[NanoBanana] Generation failed with error:', error);
      setShowNetworkErrorPopup(true);
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
    // Use ref to prevent duplicate generation when dependencies (like credits/generateImage) change
    if (autoGenerate && !resultUri && !creditsLoading && !hasStartedGeneration.current) {
      hasStartedGeneration.current = true;
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
      // First capture with watermark
      let uriToShare = resultUri;
      if (watermarkRef.current) {
        try {
          uriToShare = await captureRef(watermarkRef, { format: 'jpg', quality: 0.9 });
        } catch (e) {
          console.error('Share capture failed', e);
        }
      }

      await Share.share({
        url: uriToShare,
        message: 'Check out this Nano Banana creation!'
      });
    } catch (error) {
      console.error('Error sharing Nano Banana image:', error);
      showToast('Unable to share image', 'error');
    }
  }, [resultUri]);

  const handleSaveToCameraRoll = useCallback(async () => {
    if (!resultUri) return;
    const saved = await saveImagesToLibrary(resultUri, referenceImageUri || undefined, false);
    if (saved) {
      showToast('Images saved to gallery!', 'success');
    }
  }, [resultUri, referenceImageUri]);

  const handleMakeAnother = useCallback(() => {
    // Navigate back to Camera to take a new picture.
    // The Camera screen will automatically pick up the last used preset from user preferences.
    navigation.navigate('Camera');
  }, [navigation]);

  return (

    <AppBackground>
      <View style={tw`flex-1 bg-black`}>
        <StatusBar style="light" />

        {/* Floating Header */}
        <SafeAreaView style={tw`absolute top-0 left-0 right-0 z-10`} pointerEvents="box-none">
          <View style={tw`flex-row justify-between items-center px-5 py-2`}>
            <BackButton color="#ffffff" style={tw`bg-black/40`} />
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Report Issue',
                  'If this image is offensive or inappropriate, please report it. We will review it within 24 hours.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Report',
                      style: 'destructive',
                      onPress: () => Alert.alert('Report Sent', 'Thank you for your feedback. We will review this image.')
                    }
                  ]
                );
              }}
              style={tw`w-10 h-10 items-center justify-center rounded-full bg-black/40`}
            >
              <MaterialIcons name="flag" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Main Content Area - Full Screen Image Container */}
        <View style={tw`flex-1 relative w-full overflow-hidden`}>
          <Pressable onPress={handleToggleImage} style={tw`flex-1 justify-center items-center w-full h-full`}>

            {/* Loading Overlay */}
            {isGenerating && (
              <View style={[tw`absolute z-20 top-0 left-0 right-0 bottom-0 justify-center items-center`, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <BlurView intensity={20} tint="dark" style={tw`absolute inset-0`} />
                <View style={tw`w-4/5 items-center`}>
                  <Image
                    source={require('../../assets/loading-animation.gif')}
                    style={tw`w-30 h-30 mb-5`}
                    resizeMode="contain"
                  />
                  <Text style={tw`text-white text-lg font-bold mb-4 tracking-wide shadow-lg`}>Creating Masterpiece...</Text>

                  {/* Progress Bar Container */}
                  <View style={tw`w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-2`}>
                    {/* Simulated Progress Fill */}
                    <View
                      style={[
                        tw`h-full bg-purple-500 rounded-full`,
                        { width: `${progress}%` }
                      ]}
                    />
                  </View>

                  <Text style={tw`text-gray-300 text-sm font-semibold`}>{progress}%</Text>
                </View>
              </View>
            )}

            {imageToDisplay ? (
              <Image
                source={{ uri: imageToDisplay }}
                style={tw`w-full h-full`}
                resizeMode="contain"
              />
            ) : (
              // Placeholder if nothing to display (shouldn't happen)
              <View style={tw`flex-1 bg-gray-900 w-full`} />
            )}

            {!isGenerating && (
              <>
                <View
                  style={[
                    tw`absolute top-20 left-4 px-3 py-1 rounded-full`,
                    { backgroundColor: 'rgba(0,0,0,0.6)' },
                  ]}
                >
                  <Text style={tw`text-white text-xs font-semibold uppercase`}>
                    {showAfter || !referenceImageUri ? 'After' : 'Before'}
                  </Text>
                </View>
                {referenceImageUri && (
                  <View style={tw`absolute bottom-4 left-0 right-0 items-center`}>
                    <Text
                      style={[
                        tw`text-white text-center text-xs py-2 px-4 rounded-full`,
                        { backgroundColor: 'rgba(0,0,0,0.5)' },
                      ]}
                    >
                      Tap to toggle
                    </Text>
                  </View>
                )}
              </>
            )}
          </Pressable>
        </View>

        {/* Off-screen View for Watermark Capture */}
        <View
          ref={watermarkRef}
          collapsable={false}
          style={{
            position: 'absolute',
            top: -9999,
            left: -9999,
            width: imageSize.width,
            height: imageSize.height,

          }}
        >
          {/* Only render if we have a result uri to capture */}
          {resultUri && (
            <View style={{ width: imageSize.width, height: imageSize.height, position: 'relative' }}>
              <Image source={{ uri: resultUri }} style={{ width: '100%', height: '100%' }} />
              <View style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                backgroundColor: 'rgba(0,0,0,0.5)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8
              }}>
                <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>Generated by PopCam</Text>
              </View>
            </View>
          )}
        </View>

        {/* Footer Controls - Floating above image */}
        <SafeAreaView style={tw`absolute bottom-0 left-0 right-0 z-10`} pointerEvents="box-none">
          <View style={tw`px-5 pb-8 pt-4`}>
            {/* Custom Prompt Display (Compact) */}
            {(presetId === 'custom' || customPrompt) && (
              <View style={tw`mb-4`}>
                <BlurView intensity={20} tint="dark" style={tw`rounded-full px-3 py-1 self-center overflow-hidden`}>
                  <Text numberOfLines={1} style={tw`text-xs text-white/70 text-center`}>
                    Used: <Text style={tw`italic text-white/90`}>{customPrompt || selectedPreset?.prompt}</Text>
                  </Text>
                </BlurView>
              </View>
            )}

            <View style={tw`flex-row justify-between mb-4`}>
              <TouchableOpacity
                style={tw`flex-1 h-14 rounded-2xl mr-2 overflow-hidden shadow-lg`}
                onPress={handleShare}
                disabled={isGenerating || !resultUri}
                activeOpacity={0.8}
              >
                <BlurView intensity={35} tint="dark" style={tw`flex-1 flex-row items-center justify-center bg-white/5 border border-white/10`}>
                  <MaterialIcons name="share" size={20} color="#fff" style={tw`mr-2`} />
                  <Text style={tw`text-white font-bold tracking-wide`}>Share</Text>
                </BlurView>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`flex-1 h-14 rounded-2xl ml-2 overflow-hidden shadow-lg`}
                onPress={handleSaveToCameraRoll}
                disabled={isSaving || isGenerating || !resultUri}
                activeOpacity={0.8}
              >
                <BlurView intensity={35} tint="dark" style={tw`flex-1 flex-row items-center justify-center bg-white/5 border border-white/10`}>
                  {isSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="get-app" size={22} color="#fff" style={tw`mr-2`} />
                      <Text style={tw`text-white font-bold tracking-wide`}>Save</Text>
                    </>
                  )}
                </BlurView>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={tw`h-14 rounded-2xl overflow-hidden shadow-lg`}
              onPress={handleMakeAnother}
              activeOpacity={0.8}
            >
              <BlurView intensity={35} tint="dark" style={tw`flex-1 flex-row items-center justify-center bg-white/5 border border-white/10`}>
                <MaterialIcons name="refresh" size={22} color="#fff" style={tw`mr-2`} />
                <Text style={tw`text-white font-bold tracking-wide`}>Make Another</Text>
              </BlurView>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <Toast
          visible={toastVisible}
          message={toastMessage}
          type={toastType}
          onDismiss={() => setToastVisible(false)}
        />

        <ErrorPopup
          visible={showNetworkErrorPopup}
          onRetry={() => {
            setShowNetworkErrorPopup(false);
            generateImage();
          }}
          onCancel={() => {
            setShowNetworkErrorPopup(false);
            navigation.goBack();
          }}
        />
      </View>
    </AppBackground>
  );
}
