import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import tw from 'twrnc';
import { NANO_BANANA_PRESETS, NanoBananaPreset } from '../lib/nanobanana-presets';
import { useCredits } from '../hooks/useCredits';
import { RootStackParamList } from '../types';
import { imageUtils } from '../utils/imageUtils';
import { MaterialIcons } from '@expo/vector-icons';
import { storageService } from '../services/storageService';
import { useUser } from '@clerk/clerk-expo';

type NanoBananaScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NanoBanana'>;
type NanoBananaScreenRouteProp = RouteProp<RootStackParamList, 'NanoBanana'>;

export default function NanoBananaScreen(): React.JSX.Element {
  const navigation = useNavigation<NanoBananaScreenNavigationProp>();
  const route = useRoute<NanoBananaScreenRouteProp>();
  const { credits, isLoading: creditsLoading, error: creditsError } = useCredits();
  const { user } = useUser();

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(route.params?.presetId ?? null);
  const [referenceImageUri, setReferenceImageUri] = useState<string | null>(route.params?.referenceImageUri ?? null);
  const [shouldAutoGenerate, setShouldAutoGenerate] = useState<boolean>(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(false);
  const [previewPreset, setPreviewPreset] = useState<NanoBananaPreset | null>(null);
  const [isPromptModalVisible, setIsPromptModalVisible] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isCustomPromptEnabled, setIsCustomPromptEnabled] = useState<boolean>(false);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState<boolean>(false);


  type GridItem = { type: 'preset'; preset: NanoBananaPreset } | { type: 'custom' };
  const gridItems: GridItem[] = useMemo(() => {
    const presetItems: GridItem[] = NANO_BANANA_PRESETS.map((p: NanoBananaPreset) => ({ type: 'preset', preset: p }));
    return [{ type: 'custom' }, ...presetItems];
  }, []);

  const screenWidth: number = Dimensions.get('window').width;
  const screenHeight: number = Dimensions.get('window').height;
  const horizontalPadding: number = 40; // px-5 left+right in container
  const interItemGap: number = 8;
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

  // Load last used preset and custom prompt settings if none provided via route
  useEffect(() => {
    const loadPreferredPreset = async (): Promise<void> => {
      try {
        if (!route.params?.presetId) {
          const prefs: Record<string, any> = await storageService.getUserPreferences(user?.id);
          const preferredId: string | undefined = prefs.nanoBananaLastPresetId;
          const customText: string | undefined = prefs.nanoBananaCustomPromptText;

          if (preferredId) {
            setSelectedPresetId(preferredId);

            // If custom was selected, enable the switch and restore text
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

  const handleSelectPreset = (presetId: string): void => {
    setSelectedPresetId(presetId);
  };

  const openPreview = (preset: NanoBananaPreset): void => {
    setPreviewPreset(preset);
    setIsPreviewVisible(true);
  };

  const closePreview = (): void => {
    setIsPreviewVisible(false);
    setPreviewPreset(null);
  };

  useEffect(() => {
    loadPromptHistory();
  }, [user?.id]);

  const loadPromptHistory = async (): Promise<void> => {
    const history = await storageService.getCustomPromptHistory(user?.id);
    setPromptHistory(history);
  };

  const openCustomPrompt = (): void => {
    setSelectedPresetId('custom');
    setIsPromptModalVisible(true);
  };


  const isPickerMode = route.params?.mode === 'picker';

  const goToConfirm = useCallback(async (presetIdToUse: string, presetTitleToUse: string, customPromptToUse?: string): Promise<void> => {
    // If custom prompt is enabled in the switch, use it.
    // The simplified requirement says "when on, it will show a the custom field for user to enter in their prompt"
    // We should pass this prompt effectively.
    // However, the original logic had `customPromptToUse` passed in.
    // We'll prioritize the state `customPrompt` if `isCustomPromptEnabled` is true.
    const finalCustomPrompt = isCustomPromptEnabled ? customPrompt : customPromptToUse;

    // If custom prompt is enabled, we override the preset ID and Title to be "custom"
    // This ensures the Camera screen displays "Custom Prompt" and the system knows we are using custom.
    const finalPresetId = isCustomPromptEnabled ? 'custom' : presetIdToUse;
    const finalPresetTitle = isCustomPromptEnabled ? 'Custom Prompt' : presetTitleToUse;

    if (isPickerMode) {
      if (user?.id) {
        try {
          // Save the preference
          await storageService.saveUserPreferences({
            nanoBananaLastPresetId: finalPresetId,
            nanoBananaCustomPromptText: finalCustomPrompt, // Save the prompt text too
          }, user.id);
        } catch (error) {
          console.warn('Failed to save preset preference', error);
        }
      }
      navigation.goBack();
      return;
    }

    if (!referenceImageUri) {
      Alert.alert('Photo Required', 'Please upload or capture a photo before continuing.');
      return;
    }

    navigation.replace('NanoBananaResult', {
      resultUri: '', // Will be generated
      referenceImageUri,
      presetId: finalPresetId,
      presetTitle: finalPresetTitle,
      customPrompt: finalCustomPrompt,
      autoGenerate: true,
    });
  }, [navigation, referenceImageUri, isPickerMode, isCustomPromptEnabled, customPrompt, user?.id]);

  const handlePickReferenceImage = async (): Promise<void> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const localUri = await imageUtils.copyImageToAppStorage(result.assets[0].uri);
        setReferenceImageUri(localUri);
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
    if (shouldAutoGenerate && selectedPreset && referenceImageUri) {
      setShouldAutoGenerate(false);
      goToConfirm(selectedPreset.id, selectedPreset.title);
    }
  }, [shouldAutoGenerate, selectedPreset, referenceImageUri, goToConfirm]);

  const renderGridTile = (item: GridItem, index: number): React.JSX.Element => {
    if (item.type === 'custom') {
      const isSelectedCustom: boolean = selectedPresetId === 'custom';
      return (
        <TouchableOpacity
          key={`custom-tile`}
          style={[
            tw`mb-3 rounded-2xl border items-center justify-center`,
            isSelectedCustom ? tw`border-blue-500 bg-blue-50` : tw`border-gray-200 bg-white`,
            { width: tileSize, height: tileSize },
            { marginRight: (index % columns) !== (columns - 1) ? interItemGap : 0 },
          ]}
          onPress={openCustomPrompt}
          accessibilityLabel="Custom prompt filter"
        >
          <MaterialIcons name="edit" size={28} color={isSelectedCustom ? '#1d4ed8' : '#111827'} />
          <Text style={tw`text-xs font-semibold text-gray-800 mt-1`}>Custom</Text>
        </TouchableOpacity>
      );
    }

    const preset: NanoBananaPreset = item.preset;
    const isSelected: boolean = preset.id === selectedPresetId;
    return (
      <TouchableOpacity
        key={preset.id}
        style={[
          tw`mb-3 rounded-2xl border overflow-hidden`,
          isSelected ? tw`border-blue-500` : tw`border-gray-200`,
          { width: tileSize, height: tileSize },
          { marginRight: (index % columns) !== (columns - 1) ? interItemGap : 0 },
        ]}
        onPress={() => goToConfirm(preset.id, preset.title)}
        onLongPress={() => openPreview(preset)}
        delayLongPress={150}
        accessibilityLabel={preset.title}
      >
        <Image
          source={preset.preview}
          style={[{ width: '100%', height: '100%' }]}
          resizeMode="cover"
        />
        {isSelected && (
          <View style={[tw`absolute inset-0 items-center justify-center`, { backgroundColor: 'rgba(29,78,216,0.25)' }]}>
            <Text style={tw`text-white text-xs font-semibold`}>Selected</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <StatusBar style="dark" />

      <View style={tw`flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-200`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`py-2 px-3 flex-row items-center`}>
          <MaterialIcons name="arrow-back" size={18} color="#3b82f6" />
          <Text style={tw`text-base text-blue-500 font-semibold ml-1`}>Back</Text>
        </TouchableOpacity>
        <Text style={tw`text-lg font-semibold text-gray-800`}>Nano Banana Lab</Text>
        <View style={tw`w-12`} />
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-28 px-5 pt-5`}>
        <View style={tw`mb-4 bg-white rounded-2xl p-4 shadow-sm`}>
          <Text style={tw`text-xl font-bold text-gray-900 mb-2`}>Choose Your Transformation</Text>
          <Text style={tw`text-sm text-gray-600 leading-5`}>
            Nano Banana uses Google Gemini image generation to remix your look with cinematic presets. Select a preset, optionally add a reference photo, and spend 1 credit to generate.
          </Text>
          {referenceImageUri && (
            <Text style={tw`mt-3 text-xs text-blue-600 font-semibold`}>
              Photo loaded from the camera — choose a filter below.
            </Text>
          )}
          <View style={tw`flex-row mt-3`}>
            <Text style={tw`text-sm text-gray-500`}>Credits: </Text>
            <Text style={tw`text-sm font-semibold text-gray-800`}>
              {creditsLoading ? 'Loading…' : credits}
            </Text>
          </View>
          {creditsError && (
            <Text style={tw`text-xs text-red-500 mt-1`}>{creditsError}</Text>
          )}
        </View>

        <View style={tw`mb-4 bg-white rounded-2xl p-4 shadow-sm`}>
          <View style={tw`flex-row items-center justify-between`}>
            <Text style={tw`text-base font-semibold text-gray-900`}>Enable Custom Prompt</Text>
            <Switch
              value={isCustomPromptEnabled}
              onValueChange={setIsCustomPromptEnabled}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              thumbColor={isCustomPromptEnabled ? '#ffffff' : '#f3f4f6'}
            />
          </View>
          {isCustomPromptEnabled && (
            <View style={tw`mt-3`}>
              <Text style={tw`text-sm text-gray-600 mb-2`}>
                Enter your custom prompt below. This will be used instead of the preset's default prompt behavior where applicable.
              </Text>
              <TextInput
                value={customPrompt}
                onChangeText={setCustomPrompt}
                placeholder="E.g., Cyberpunk city with neon lights..."
                multiline
                style={[tw`border border-gray-300 rounded-xl p-3 text-gray-900`, { minHeight: 80 }]}
              />
              <View style={tw`flex-row justify-end mt-2`}>
                <TouchableOpacity
                  onPress={async () => {
                    if (!customPrompt.trim()) return;
                    await storageService.saveCustomPromptToHistory(customPrompt.trim(), user?.id);
                    await loadPromptHistory();
                    Alert.alert('Saved', 'Custom prompt saved to history.');
                  }}
                  style={tw`py-2 px-4 rounded-lg bg-gray-200 mr-2`}
                >
                  <Text style={tw`text-gray-700 font-semibold text-xs`}>Save to History</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsHistoryModalVisible(true)}
                  style={tw`py-2 px-4 rounded-lg bg-gray-200 mr-2`}
                >
                  <Text style={tw`text-gray-700 font-semibold text-xs`}>View Past Prompts</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (!customPrompt.trim()) return;
                    // goToConfirm handles the logic of using the custom prompt state
                    goToConfirm('custom', 'Custom Prompt', customPrompt.trim());
                  }}
                  style={tw`py-2 px-4 rounded-lg bg-blue-500`}
                >
                  <Text style={tw`text-white font-semibold text-xs`}>Use This Prompt</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={tw`flex-row flex-wrap`}>
          {gridItems.map((it: GridItem, idx: number) => renderGridTile(it, idx))}
        </View>


        {/* Only show reference image section if NOT in picker mode */}
        {!isPickerMode && (
          <View style={tw`mt-6 bg-white rounded-2xl p-4 shadow-sm`}>
            <Text style={tw`text-base font-semibold text-gray-900 mb-2`}>Reference Image (Optional)</Text>
            <Text style={tw`text-sm text-gray-600 mb-3`}>
              Add a photo of yourself to guide the Nano Banana model. If you skip this step, the preset will rely solely on the prompt.
            </Text>
            <TouchableOpacity
              onPress={handlePickReferenceImage}
              style={tw`bg-blue-500 py-3 rounded-xl items-center`}
            >
              <Text style={tw`text-white text-base font-semibold`}>Upload Reference</Text>
            </TouchableOpacity>

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
        <Modal visible={isPromptModalVisible} transparent animationType="slide" onRequestClose={() => setIsPromptModalVisible(false)}>
          <View style={[tw`flex-1 items-center justify-center`, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[tw`rounded-2xl bg-white p-4`, { width: Math.min(screenWidth * 0.9, 380) }]}>
              <Text style={tw`text-base font-semibold text-gray-900 mb-2`}>Custom Prompt</Text>
              <TextInput
                value={customPrompt}
                onChangeText={(text: string) => setCustomPrompt(text)}
                placeholder="Describe the transformation you want..."
                multiline
                style={[tw`border border-gray-300 rounded-xl p-3 text-gray-900`, { minHeight: 100 }]}
              />
              <View style={tw`flex-row justify-end mt-3`}>
                <TouchableOpacity onPress={() => setIsPromptModalVisible(false)} style={tw`py-2 px-3 rounded-xl border border-gray-300 mr-2`}>
                  <Text style={tw`text-gray-700 font-semibold`}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => {
                  setIsPromptModalVisible(false);
                  await storageService.saveCustomPromptToHistory(customPrompt.trim(), user?.id);
                  loadPromptHistory(); // Refresh
                  goToConfirm('custom', 'Custom Prompt', customPrompt.trim());
                }} style={tw`py-2 px-3 rounded-xl bg-blue-500`}>
                  <Text style={tw`text-white font-semibold`}>Use This Prompt</Text>
                </TouchableOpacity>
              </View>

              {promptHistory.length > 0 && (
                <View style={tw`mt-4 w-full`}>
                  <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>Recent Prompts</Text>
                  <ScrollView style={{ maxHeight: 120 }}>
                    {promptHistory.map((historyItem, index) => (
                      <TouchableOpacity
                        key={index}
                        style={tw`py-2 px-3 mb-2 bg-gray-50 rounded-lg border border-gray-200`}
                        onPress={() => setCustomPrompt(historyItem)}
                      >
                        <Text numberOfLines={2} style={tw`text-sm text-gray-600`}>{historyItem}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* History Modal */}
        <Modal visible={isHistoryModalVisible} transparent animationType="slide" onRequestClose={() => setIsHistoryModalVisible(false)}>
          <View style={[tw`flex-1 items-center justify-center`, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[tw`rounded-2xl bg-white p-5 shadow-lg`, { width: Math.min(screenWidth * 0.9, 380), maxHeight: screenHeight * 0.7 }]}>
              <Text style={tw`text-xl font-bold text-gray-900 mb-4`}>Prompt History</Text>

              {promptHistory.length === 0 ? (
                <View style={tw`py-8 items-center`}>
                  <Text style={tw`text-gray-500 text-center`}>No saved prompts yet.</Text>
                </View>
              ) : (
                <ScrollView style={tw`flex-1`} indicatorStyle="black">
                  {promptHistory.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={tw`py-3 px-4 mb-2 bg-gray-50 rounded-xl border border-gray-100 active:bg-blue-50 active:border-blue-200`}
                      onPress={() => {
                        setCustomPrompt(item);
                        setIsHistoryModalVisible(false);
                      }}
                    >
                      <Text style={tw`text-gray-700 leading-5`}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={tw`mt-4 pt-3 border-t border-gray-100`}>
                <TouchableOpacity
                  onPress={() => setIsHistoryModalVisible(false)}
                  style={tw`py-3 bg-gray-100 rounded-xl items-center`}
                >
                  <Text style={tw`text-gray-800 font-semibold`}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}
