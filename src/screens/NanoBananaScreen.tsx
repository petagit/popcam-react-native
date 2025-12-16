import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Pressable,
  Share,
  Switch,
  Linking,
  LayoutRectangle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import tw from 'twrnc';
import { NANO_BANANA_PRESETS, NanoBananaPreset } from '../lib/nanobanana-presets';
import { useCredits } from '../hooks/useCredits';
import { RootStackParamList } from '../types';
import { imageUtils } from '../utils/imageUtils';
import { MaterialIcons } from '@expo/vector-icons';
import { storageService, LocalPreset } from '../services/storageService';
import { useUser } from '@clerk/clerk-expo';
import AppBackground from '../components/AppBackground';
import { useCustomPrompts } from '../features/nano-banana/custom-prompts/useCustomPrompts';
import { CustomPromptSection } from '../features/nano-banana/custom-prompts/CustomPromptSection';
import { PromptHistoryModal } from '../features/nano-banana/custom-prompts/PromptHistoryModal';
import { CustomPromptPickerModal } from '../features/nano-banana/custom-prompts/CustomPromptPickerModal';
import { r2Service } from '../services/r2Service';
import { NanoBananaGrid, GridItem } from '../features/nano-banana/NanoBananaGrid';
import GlassButton from '../components/buttons/GlassButton';
import CreditsButton from '../components/buttons/CreditsButton';
import BackButton from '../components/buttons/BackButton';
import { resolvePromptConfig, PromptSource } from '../features/nano-banana/prompt-logic';
import { createAndUploadThumbnail } from '../features/nano-banana/thumbnail-logic';
import { useOnboarding } from '../features/onboarding/OnboardingContext';

type NanoBananaScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NanoBanana'>;
type NanoBananaScreenRouteProp = RouteProp<RootStackParamList, 'NanoBanana'>;

export default function NanoBananaScreen(): React.JSX.Element {
  const navigation = useNavigation<NanoBananaScreenNavigationProp>();
  const route = useRoute<NanoBananaScreenRouteProp>();
  const { credits, isLoading: creditsLoading, error: creditsError } = useCredits();
  const { user } = useUser();
  const { isActive, currentStep, registerTarget, nextStep, deregisterTarget } = useOnboarding();

  const { promptHistory, loadPromptHistory, savePrompt, deletePrompt, updatePrompt } = useCustomPrompts();

  // Ensure we are on the correct step if coming from Camera
  useEffect(() => {
    if (isActive && currentStep === 'NANO_BANANA_BUTTON') {
      nextStep();
    }
  }, [isActive, currentStep, nextStep]);

  useFocusEffect(
    useCallback(() => {
      loadPromptHistory();
    }, [loadPromptHistory])
  );

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(route.params?.presetId ?? null);
  const [referenceImageUri, setReferenceImageUri] = useState<string | null>(route.params?.referenceImageUri ?? null);
  const [shouldAutoGenerate, setShouldAutoGenerate] = useState<boolean>(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(false);
  const [previewPreset, setPreviewPreset] = useState<NanoBananaPreset | null>(null);
  const [isPromptModalVisible, setIsPromptModalVisible] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isCustomPromptEnabled, setIsCustomPromptEnabled] = useState<boolean>(false);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState<boolean>(false);
  const [localPresets, setLocalPresets] = useState<LocalPreset[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState<boolean>(true);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Refs for onboarding targets
  const filterGridRef = useRef<View>(null);
  const uploadButtonRef = useRef<View>(null);

  // Onboarding effect for registering targets
  // Onboarding effect for registering targets
  const measureAndRegister = useCallback((ref: React.RefObject<any>, step: 'PICK_FILTER' | 'TAKE_PICTURE') => {
    if (!isActive) return;

    // Register whenever the element is available, regardless of current step.
    // This handles cases where layout happens before step transition.
    if (ref.current) {
      ref.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        if (width > 0 && height > 0) {
          registerTarget(step, { x, y, width, height });
        }
      });
    }
  }, [isActive, registerTarget]);

  useEffect(() => {
    if (!isActive) return;

    // Need a slight delay or retry because grid might be rendering or layout shifting
    const t = setTimeout(() => {
      measureAndRegister(filterGridRef, 'PICK_FILTER');
      measureAndRegister(uploadButtonRef, 'TAKE_PICTURE');
    }, 500);

    return () => clearTimeout(t);
  }, [isActive, currentStep, isLoadingPresets, measureAndRegister]);

  const loadLocalPresets = useCallback(async () => {
    setIsLoadingPresets(true);
    if (user?.id) {
      try {
        const presets = await storageService.getLocalPresets(user.id);
        setLocalPresets(presets);
      } catch (error) {
        console.error('Failed to load local presets', error);
      } finally {
        setIsLoadingPresets(false);
      }
    } else {
      setIsLoadingPresets(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadLocalPresets();
  }, [loadLocalPresets]);

  const gridItems: GridItem[] = useMemo(() => {
    const presetItems: GridItem[] = NANO_BANANA_PRESETS.map((p: NanoBananaPreset) => ({ type: 'preset', preset: p }));
    // Using promptHistory instead of localPresets
    const customItems: GridItem[] = promptHistory.map(p => ({
      type: 'history_custom',
      preset: p
    }));

    return [{ type: 'custom' }, ...customItems, ...presetItems];
  }, [promptHistory]);

  const screenWidth: number = Dimensions.get('window').width;
  const screenHeight: number = Dimensions.get('window').height;
  const horizontalPadding: number = 32;
  const interItemGap: number = 6;
  const columns: number = 3;
  const tileSize: number = Math.floor((screenWidth - horizontalPadding - interItemGap * (columns - 1)) / columns);
  const previewWidth: number = Math.min(Math.floor(tileSize * 1.2), Math.floor(screenWidth * 0.5));

  const selectedPreset: NanoBananaPreset | undefined = useMemo(
    () => NANO_BANANA_PRESETS.find((preset: NanoBananaPreset) => preset.id === selectedPresetId),
    [selectedPresetId]
  );

  useEffect(() => {
    if (route.params?.referenceImageUri) {
      setReferenceImageUri(route.params.referenceImageUri);
    }
  }, [route.params?.referenceImageUri]);

  useEffect(() => {
    if (route.params?.presetId) {
      setSelectedPresetId(route.params.presetId);
    }
  }, [route.params?.presetId]);

  useEffect(() => {
    const loadPreferredPreset = async (): Promise<void> => {
      try {
        if (!route.params?.presetId) {
          const prefs: Record<string, any> = await storageService.getUserPreferences(user?.id);
          const preferredId: string | undefined = prefs.nanoBananaLastPresetId;
          const customText: string | undefined = prefs.nanoBananaCustomPromptText;

          if (preferredId) {
            setSelectedPresetId(preferredId);
            if (preferredId === 'custom') {
              setIsCustomPromptEnabled(true);
              if (customText) {
                setCustomPrompt(customText);
              }
            }
          } else {
            setSelectedPresetId(NANO_BANANA_PRESETS[0]?.id ?? null);
          }
        }
      } catch (e) {
        setSelectedPresetId(NANO_BANANA_PRESETS[0]?.id ?? null);
      }
    };
    loadPreferredPreset();
  }, [route.params?.presetId, user?.id]);


  const goToConfirm = useCallback(async (presetIdToUse: string, presetTitleToUse: string, customPromptToUse?: string): Promise<void> => {
    let source: PromptSource;

    if (customPromptToUse !== undefined) {
      if (presetIdToUse === 'custom') {
        source = { type: 'MANUAL_INPUT', text: customPromptToUse };
      } else {
        source = {
          type: 'USER_PRESET',
          preset: { id: presetIdToUse, prompt_text: customPromptToUse, title: presetTitleToUse }
        };
      }
    } else {
      source = {
        type: 'APP_PRESET',
        preset: { id: presetIdToUse, title: presetTitleToUse } as any
      };
    }

    const config = resolvePromptConfig(source);

    if (user?.id) {
      try {
        const prefsToSave: any = { nanoBananaLastPresetId: config.presetId };
        if (config.customPromptParam) {
          prefsToSave.nanoBananaCustomPromptText = config.customPromptParam;
        }
        await storageService.saveUserPreferences(prefsToSave, user.id);
      } catch (error) {
        console.warn('Failed to save preset preference', error);
      }
    }

    if (route.params?.mode === 'picker') {
      navigation.goBack();
      return;
    }

    if (!referenceImageUri) {
      // If in onboarding and we need to take picture, let's not block completely but alert user.
      // Actually, onboarding step "TAKE_PICTURE" is strictly for the button highlight.
      // The user must click the button to get the URI. 
      // If they click a preset without URI, we alert them.
      // If they have URI, proceed.
      Alert.alert('Photo Required', 'Please upload or capture a photo before continuing.');
      return;
    }

    if (isActive && currentStep === 'TAKE_PICTURE') {
      nextStep(); // Move to CONFETTI step conceptually, or wait until Result screen loads
    }

    navigation.replace('NanoBananaResult', {
      resultUri: '',
      referenceImageUri,
      presetId: config.presetId,
      presetTitle: config.presetTitle,
      customPrompt: config.customPromptParam,
      autoGenerate: true,
    });
  }, [navigation, referenceImageUri, route.params?.mode, user?.id, isActive, currentStep, nextStep]);

  const handlePickReferenceImage = async (): Promise<void> => {
    // If onboarding, clicking this fulfills the action effectively, or starts the process.
    // If we want to move step only after they actually select, we do it in success block.
    // However, the prompt is "take a picture...". 
    try {
      if (isActive && currentStep === 'TAKE_PICTURE') {
        // We can advance step here? Or wait for image?
        // Let's wait for image.
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const localUri = await imageUtils.copyImageToAppStorage(result.assets[0].uri);
        setReferenceImageUri(localUri);

        // If in onboarding TAKE_PICTURE step, now we have the picture.
        // But users usually need to click "Generate" or similar? 
        // Wait, standard flow: Select Preset -> (Auto triggers if Ref Image exists? No, need to click something?)
        // Ah, logic: 
        // "if (shouldAutoGenerate && selectedPreset && referenceImageUri) { goToConfirm... }"
        // Wait, currently if you select preset, it sets selected ID.
        // If you have ref image, does clicking preset immediately go?
        // `onSelect` calls `goToConfirm`. `goToConfirm` checks `referenceImageUri`.
        // If `referenceImageUri` is missing, it alerts.
        // So flow is: 1. Upload Ref. 2. Select Preset. OR 1. Select Preset (fails) -> Upload Ref -> Click Preset again?
        // My Onboarding flow is: 1. Nano Button. 2. Filter (Preset). 3. Camera (Ref).
        // If user clicks Filter first (Step 2), it alerts "Photo Required".
        // That might be confusing for onboarding.
        // If step 2 is "Pick Filter", user picks filter. It alerts "Photo Required".
        // Then Step 3 highlights Upload.
        // Then user needs to click Filter AGAIN to generate?
        // OR `goToConfirm` should effectively select it but wait for image?
        // `handleSelectPreset` sets ID.
        // `onSelect` in Grid calls `goToConfirm`.
        // Let's modify `onSelect` slightly or `goToConfirm` to handle the flow better?
        // If we just want to highlight, it's fine.
        // Ideally: User picks filter (highlighted). We define `selectedPresetId`. "Photo Required" alert might be suppressed or changed to "Now upload photo".
        // Then Step 3 highlights Upload.
        // If user uploads, then we need to Trigger generation?
        // I'll add logic to auto-trigger if onboarding active and both present?
        // Or relying on standard behavior: user uploads, then likely clicks filter again?
        // Let's try to Auto-Generate if we just uploaded and have a selected preset.

        // This effect exists:
        // useEffect(() => { if (shouldAutoGenerate...) ... }, ...)
        // We can set `shouldAutoGenerate` to true when upload finishes if we have a preset?
        if (selectedPresetId) {
          setShouldAutoGenerate(true); // This matches existing logical pattern
        }

        if (isActive && currentStep === 'TAKE_PICTURE') {
          // We don't call nextStep() here because next step is "CONFETTI" (Result screen).
          // Transitioning to Result screen will mount that screen which should handle the confetti.
          // But we need to make sure we don't get stuck in TAKE_PICTURE on this screen if for some reason we stay here.
          // Actually, `goToConfirm` calls `replace('NanoBananaResult')`.
          // So if auto-generate triggers, we leave this screen.
        }
      }
    } catch (error) {
      console.error('Error selecting reference image:', error);
      Alert.alert('Image Error', 'Failed to select reference image. Please try again.');
    }
  };

  const sharePreview = useCallback(async (): Promise<void> => {
    try {
      if (!previewPreset) {
        Alert.alert('Share', 'No preview available to share.');
        return;
      }
      const resolved = Image.resolveAssetSource(previewPreset.preview as any);
      const uri: string | undefined = resolved?.uri;
      if (!uri) {
        Alert.alert('Share', 'No preview available to share.');
        return;
      }
      await Share.share({
        url: uri,
        message: 'Check out this Nano Banana preset on PopCam!',
        title: 'PopCam preset',
      });
    } catch (error) {
      Alert.alert('Share failed', 'Unable to share this preview.');
    }
  }, [previewPreset]);

  useEffect(() => {
    if (route.params?.autoGenerate) {
      setShouldAutoGenerate(true);
      navigation.setParams({ autoGenerate: false });
    }
  }, [route.params?.autoGenerate, navigation]);

  useEffect(() => {
    if (shouldAutoGenerate && selectedPresetId && referenceImageUri) {
      setShouldAutoGenerate(false);
      // Need to find title if it's a preset
      const preset = NANO_BANANA_PRESETS.find(p => p.id === selectedPresetId);
      const custom = promptHistory.find(p => p.id === selectedPresetId);

      if (preset) {
        goToConfirm(preset.id, preset.title);
      } else if (custom) {
        goToConfirm(custom.id, custom.title || 'Custom', custom.prompt_text);
      } else if (selectedPresetId === 'custom') {
        goToConfirm('custom', 'Custom', customPrompt);
      }
    }
  }, [shouldAutoGenerate, selectedPresetId, referenceImageUri, goToConfirm, promptHistory, customPrompt]);


  const handleCustomPresetLongPress = (preset: { id: string; prompt_text: string; title?: string; thumbnail_url?: string }) => {
    Alert.alert(
      'Manage Custom Preset',
      preset.title || 'Custom Preset',
      [
        {
          text: 'Edit',
          onPress: () => {
            setEditingPresetId(preset.id);
            setCustomPrompt(preset.prompt_text);
            setIsPromptModalVisible(true);
          }
        },
        {
          text: 'Delete',
          onPress: () => handleCustomPresetDelete(preset),
          style: 'destructive'
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleCustomPresetDelete = (preset: { id: string; prompt_text: string }) => {
    Alert.alert(
      'Delete Preset',
      'Are you sure you want to delete this custom preset?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePrompt(preset.id);
          }
        }
      ]
    );
  };

  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  const changeThumbnail = async (presetId: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1], // Square aspect for thumbnail
      });

      if (!result.canceled && result.assets[0]?.uri && user?.id) {
        Alert.alert('Uploading', 'Please wait while the thumbnail uploads...');

        const uploadedKey = await createAndUploadThumbnail(result.assets[0].uri, user.id);

        if (uploadedKey) {
          await updatePrompt(presetId, { thumbnail_url: uploadedKey });
          Alert.alert('Success', 'Thumbnail updated!');
        } else {
          Alert.alert('Error', 'Failed to upload thumbnail.');
        }
      }
    } catch (error) {
      console.error('Error changing thumbnail:', error);
      Alert.alert('Error', 'Failed to select or upload image.');
    }
  };

  const handleEditCustomPreset = (preset: { id: string; prompt_text: string; title?: string; thumbnail_url?: string }) => {
    Alert.alert(
      'Manage Preset',
      'What would you like to do?',
      [
        {
          text: 'Edit Prompt',
          onPress: () => {
            setEditingPresetId(preset.id);
            setCustomPrompt(preset.prompt_text);
            setIsPromptModalVisible(true);
          }
        },
        {
          text: 'Change Thumbnail',
          onPress: () => changeThumbnail(preset.id)
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const isPickerMode = route.params?.mode === 'picker';

  const openPreview = (preset: NanoBananaPreset) => {
    setPreviewPreset(preset);
    setIsPreviewVisible(true);
  };

  const closePreview = () => {
    setIsPreviewVisible(false);
    setPreviewPreset(null);
  };

  return (
    <AppBackground>
      <SafeAreaView style={tw`flex-1`}>
        <StatusBar style="dark" />

        <View style={tw`flex-row items-center justify-between px-5 py-4 border-b border-gray-200`}>
          <BackButton />
          <Text style={tw`text-lg font-semibold text-gray-800`}>Pick Your AI Filter</Text>
          <View style={tw`flex-row items-center`}>
            <CreditsButton variant="minimal" />
            <TouchableOpacity onPress={() => setIsEditMode(!isEditMode)} style={tw`py-2 px-3 ml-2`}>
              <Text style={tw`text-base text-gray-900 font-semibold`}>{isEditMode ? 'Done' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-28 px-4 pt-4`}>
          {(referenceImageUri || creditsError) && (
            <View style={tw`mb-4 bg-white rounded-2xl p-4 shadow-sm`}>
              {referenceImageUri && (
                <Text style={tw`text-xs text-blue-600 font-semibold`}>
                  Photo loaded from the camera — choose a filter below.
                </Text>
              )}
              {creditsError && (
                <Text style={tw`text-xs text-red-500 mt-1`}>{creditsError}</Text>
              )}
            </View>
          )}

          {/* Showcase Button */}
          <TouchableOpacity
            onPress={() => Linking.openURL('https://www.pop-cam.com/nanobanana/showcase')}
            style={tw`mb-4 bg-purple-100 py-3 rounded-xl items-center border border-purple-200`}
          >
            <Text style={tw`text-purple-700 font-semibold text-base`}>✨ Visit Nano Banana Showcase</Text>
          </TouchableOpacity>

          <CustomPromptSection
            isEnabled={isCustomPromptEnabled}
            onToggle={setIsCustomPromptEnabled}
            customPrompt={customPrompt}
            onPromptChange={setCustomPrompt}
            onSave={async () => {
              const result = await savePrompt(customPrompt);
              return !!result;
            }}
            onViewHistory={() => setIsHistoryModalVisible(true)}
            onUsePrompt={() => {
              if (!customPrompt.trim()) return;
              goToConfirm('custom', 'Custom Prompt', customPrompt.trim());
            }}
          />

          {isLoadingPresets ? (
            <View style={tw`flex-row flex-wrap`}>
              {Array.from({ length: 9 }).map((_, idx) => (
                <View
                  key={`skeleton-${idx}`}
                  style={[
                    tw`mb-2 rounded-xl bg-gray-200 animate-pulse`,
                    { width: tileSize, height: tileSize },
                    { marginRight: (idx % columns) !== (columns - 1) ? interItemGap : 0 },
                  ]}
                />
              ))}
            </View>
          ) : (
            // We need to capture Ref of the FIRST item if possible for onboarding.
            // NanoBananaGrid renders items. We can pass a ref for the first item?
            // Or verify if we can wrap the grid or first item.
            // NanoBananaGrid maps standard params.
            // A cheat: Wrap NanoBananaGrid in a View, but we need specific item coordinates.
            // Standard way: Modify NanoBananaGrid to accept `onLayoutFirstItem`.
            // Alternative: We can put a transparent view over the first item position if we know the layout?
            // Since layout is calculated (tileSize), we can guess?
            // Better: Let's modify NanoBananaGrid to accept a Ref for the first item or 'onLayout' for it.
            // But I can't modify NanoBananaGrid easily in this single file edit unless I inline it or replace it.
            // Wait, I can wrap the first item in the grid items logic?
            // gridItems is an array of data.
            // I'll make a specialized View that wraps the Grid and puts a "target" registration View on top of the first item's estimated position?
            // `tileSize` is known. `interItemGap` is known. First item is at 0,0 relative to Grid container.
            // So I can just measure Grid container and add offset?
            // Yes!
            <View
              collapsable={false}
              ref={filterGridRef}
              style={tw`w-full`}
              onLayout={() => measureAndRegister(filterGridRef, 'PICK_FILTER')}
            >
              <NanoBananaGrid
                items={gridItems}
                selectedId={selectedPresetId}
                columns={columns}
                tileSize={tileSize}
                interItemGap={interItemGap}
                isManageMode={isEditMode}
                onOpenCustomPicker={() => {
                  setEditingPresetId(null);
                  setCustomPrompt('');
                  setIsPromptModalVisible(true);
                }}
                onSelect={(item) => {
                  // Logic for Onboarding Step 2
                  if (isActive && currentStep === 'PICK_FILTER') {
                    nextStep();
                  }
                  if (item.type === 'preset') {
                    goToConfirm(item.preset.id, item.preset.title);
                  } else if (item.type === 'history_custom') {
                    goToConfirm(item.preset.id, item.preset.title || 'Custom Preset', item.preset.prompt_text);
                  }
                }}
                onLongPress={(item) => {
                  if (item.type === 'preset') {
                    openPreview(item.preset);
                  } else if (item.type === 'history_custom') {
                    handleCustomPresetLongPress(item.preset);
                  }
                }}
                onEditCustom={(preset) => handleEditCustomPreset(preset)}
                onDeleteCustom={(preset) => handleCustomPresetDelete(preset)}
              />
            </View>
          )}


          {/* Only show reference image section if NOT in picker mode */}
          {!isPickerMode && (
            <View style={tw`mt-6 bg-white rounded-2xl p-4 shadow-sm`}>
              <Text style={tw`text-base font-semibold text-gray-900 mb-2`}>Reference Image (Optional)</Text>
              <Text style={tw`text-sm text-gray-600 mb-3`}>
                Add a photo of yourself to guide the Nano Banana model. If you skip this step, the preset will rely solely on the prompt.
              </Text>

              {/* Highlight Target for Upload Button */}
              <View
                collapsable={false}
                ref={uploadButtonRef}
                style={tw`w-full`}
                onLayout={() => measureAndRegister(uploadButtonRef, 'TAKE_PICTURE')}
              >
                <TouchableOpacity
                  onPress={handlePickReferenceImage}
                  style={tw`bg-blue-500 py-3 rounded-xl items-center`}
                >
                  <Text style={tw`text-white text-base font-semibold`}>Upload Reference</Text>
                </TouchableOpacity>
              </View>

              {referenceImageUri && (
                <View style={tw`mt-4`}>
                  <Text style={tw`text-sm text-gray-500 mb-2`}>Reference Preview</Text>
                  <Image
                    source={{ uri: referenceImageUri }}
                    style={[tw`rounded-xl`, { width: '100%', aspectRatio: 3 / 4 }]}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={tw`mt-3 py-3 rounded-xl border border-blue-200 items-center`}
                    onPress={() => navigation.navigate('Camera')}
                  >
                    <Text style={tw`text-blue-500 font-semibold`}>Retake Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Preview modal */}
          <Modal visible={isPreviewVisible} transparent animationType="fade" onRequestClose={closePreview}>
            <Pressable onPress={closePreview} style={[tw`flex-1 items-center justify-center`, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
              <Pressable onPress={() => { }} style={[tw`rounded-2xl bg-white p-4`, { width: previewWidth, maxWidth: screenWidth - 48, maxHeight: Math.floor(screenHeight * 0.8), overflow: 'hidden' }]}>
                {previewPreset && (
                  <>
                    <Image
                      source={previewPreset.preview}
                      style={[tw`rounded-xl mb-3`, { width: '100%', aspectRatio: 1 }]}
                      resizeMode="cover"
                    />
                    <Text style={tw`text-base font-semibold text-gray-900 mb-1`}>{previewPreset.title}</Text>
                    <Text numberOfLines={3} style={tw`text-sm text-gray-700`}>{previewPreset.description}</Text>
                  </>
                )}
                <View style={tw`flex-row justify-end mt-4`}>
                  <TouchableOpacity onPress={sharePreview} style={tw`py-2 px-3 rounded-xl bg-blue-600 mr-2`}>
                    <Text style={tw`text-white font-semibold`}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={closePreview} style={tw`py-2 px-3 rounded-xl bg-blue-500`}>
                    <Text style={tw`text-white font-semibold`}>Close</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>

          {/* Custom prompt modal */}
          <CustomPromptPickerModal
            visible={isPromptModalVisible}
            onClose={() => {
              setIsPromptModalVisible(false);
              setEditingPresetId(null);
            }}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt}
            history={promptHistory}
            onSaveAndUse={async (imageUri) => {
              setIsPromptModalVisible(false);
              try {
                let r2Url: string | undefined = undefined;

                if (imageUri && user?.id) {
                  // Upload to R2 (resized thumbnail)
                  const uploadedKey = await createAndUploadThumbnail(imageUri, user.id);
                  if (uploadedKey) {
                    r2Url = uploadedKey;
                  }
                }

                if (editingPresetId) {
                  await updatePrompt(editingPresetId, {
                    prompt_text: customPrompt.trim(),
                    title: 'Custom Preset',
                    thumbnail_url: r2Url,
                  });
                  goToConfirm(editingPresetId, 'Custom Preset', customPrompt.trim());
                } else {
                  const newId = await savePrompt(customPrompt.trim(), 'Custom Preset', r2Url);
                  const idToUse = (typeof newId === 'string' && newId) ? newId : 'custom';
                  goToConfirm(idToUse, 'Custom Preset', customPrompt.trim());
                }

                setEditingPresetId(null);
              } catch (err) {
                console.error(err);
                goToConfirm('custom', 'Custom Prompt', customPrompt.trim());
              }
            }}
          />

          {/* History Modal */}
          <PromptHistoryModal
            visible={isHistoryModalVisible}
            onClose={() => setIsHistoryModalVisible(false)}
            history={promptHistory}
            onSelect={(item) => {
              setCustomPrompt(item);
              setIsHistoryModalVisible(false);
            }}
            onDelete={deletePrompt}
          />
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}
