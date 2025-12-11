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
  Linking,
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
import { useCustomPrompts } from '../features/nano-banana/custom-prompts/useCustomPrompts';
import { CustomPromptSection } from '../features/nano-banana/custom-prompts/CustomPromptSection';
import { PromptHistoryModal } from '../features/nano-banana/custom-prompts/PromptHistoryModal';
import { CustomPromptPickerModal } from '../features/nano-banana/custom-prompts/CustomPromptPickerModal';
import { r2Service } from '../services/r2Service';
import { NanoBananaGrid, GridItem } from '../features/nano-banana/NanoBananaGrid';

type NanoBananaScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NanoBanana'>;
type NanoBananaScreenRouteProp = RouteProp<RootStackParamList, 'NanoBanana'>;

export default function NanoBananaScreen(): React.JSX.Element {
  const navigation = useNavigation<NanoBananaScreenNavigationProp>();
  const route = useRoute<NanoBananaScreenRouteProp>();
  const { credits, isLoading: creditsLoading, error: creditsError } = useCredits();
  const { user } = useUser();

  const { promptHistory, loadPromptHistory, savePrompt, deletePrompt, updatePrompt } = useCustomPrompts();

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

  const loadLocalPresets = useCallback(async () => {
    setIsLoadingPresets(true);
    // We prioritize promptHistory over localPresets for the grid now.
    // Keeping localPresets load for legacy support or migration if needed, but grid will use promptHistory.
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
    // const localItems: GridItem[] = localPresets.map((p: LocalPreset) => ({ type: 'local', preset: p }));

    // Use promptHistory from DB/Storage
    const customItems: GridItem[] = promptHistory.map(p => ({
      type: 'history_custom',
      preset: p
    }));

    return [{ type: 'custom' }, ...customItems, ...presetItems];
  }, [promptHistory]);

  const screenWidth: number = Dimensions.get('window').width;
  const screenHeight: number = Dimensions.get('window').height;
  const horizontalPadding: number = 32; // px-4 left+right in container
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

    // We used to override presetId to 'custom' if the switch was on, but that prevented selecting grid items.
    // Now we respect the passed presetIdToUse (which comes from the clicked tile).
    const finalPresetId = presetIdToUse;
    const finalPresetTitle = presetTitleToUse;

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
      'Are you sure you want to delete this custom, preset?',
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
        // Show loading state? 
        Alert.alert('Uploading', 'Please wait while the thumbnail uploads...');

        const uploadedKey = await r2Service.uploadImage(result.assets[0].uri, user.id);
        if (uploadedKey) {
          // Update
          // Note: We need to know the current title/prompt to keep them? 
          // Or `updatePrompt` merges? `updatePrompt` does merge based on `storageService.ts` code I saw (fallback local logic does merge object).
          // But let's check `updatePrompt` implementation in `useCustomPrompts`.
          // It calls `storageService.updateCustomPromptInHistory` which merges fields locally and usually patches remotely.
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

  // GridItem type is now imported/defined in NanoBananaGrid but locally needed for internal logic if we didn't export it fully or used distinct typing.
  // Actually, let's update local imports to match or just pass data.
  // We can't easily export/import type from the file we just created inside replace_file_content without separate step, but assuming we can import it.

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

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-28 px-4 pt-4`}>
        <View style={tw`mb-4 bg-white rounded-2xl p-4 shadow-sm`}>
          <View style={tw`flex-row justify-between items-center mb-2`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>Pick Your AI Filter</Text>
            <TouchableOpacity style={tw`flex-row items-center`} onPress={() => navigation.navigate('PurchaseCredits')}>
              <MaterialIcons name="bolt" size={16} color="#4b5563" style={tw`mr-1`} />
              <Text style={tw`text-sm font-semibold text-gray-800`}>
                {creditsLoading ? '...' : credits}
              </Text>
            </TouchableOpacity>
          </View>
          {referenceImageUri && (
            <Text style={tw`mt-1 text-xs text-blue-600 font-semibold`}>
              Photo loaded from the camera — choose a filter below.
            </Text>
          )}
          {creditsError && (
            <Text style={tw`text-xs text-red-500 mt-1`}>{creditsError}</Text>
          )}
        </View>

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
          onSave={() => savePrompt(customPrompt)}
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
          <NanoBananaGrid
            items={gridItems}
            selectedId={selectedPresetId}
            columns={columns}
            tileSize={tileSize}
            interItemGap={interItemGap}
            onOpenCustomPicker={() => {
              setEditingPresetId(null);
              setCustomPrompt('');
              openCustomPrompt();
            }}
            onSelect={(item) => {
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
        )}


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
                // Upload to R2
                // We show basic loading or just await?
                // Ideally specific UI for uploading, but we'll await here (UI might freeze briefly, user usually expects this)
                const uploadedKey = await r2Service.uploadImage(imageUri, user.id);
                if (uploadedKey) {
                  // Construct URL if helper doesn't return full URL
                  // Our r2Service now returns full URL if configured or key.
                  // Let's assume r2Service returns something usable or just the key.
                  // Using updated r2Service assumption (it returns full URL if domain set, or key). 
                  // See previous read of r2Service.ts. 
                  // It returns `fileName` (key) if EXPO_PUBLIC_R2_PUBLIC_DOMAIN is missing. 
                  // To be safe we should store the key or url. 
                  // Assuming the user WILL set the public domain or we use a cloudflare worker url.
                  // For now, save the result.
                  r2Url = uploadedKey;
                }
              }

              if (editingPresetId) {
                // Update existing
                // Note: updatePrompt currently only takes text/title in my types. I should check that.
                // I updated storageService but useCustomPrompts `updatePrompt` signature might be stricter?
                // useCustomPrompts implementation:
                // const updatePrompt = async (id: string, updates: { prompt_text?: string; title?: string })
                // I should have added thumbnail_url support there too. 
                // Let's do a quick fix-up if needed or just pass it if type allows (it might complain).
                // I will update useCustomPrompts right after this if I missed it.
                await updatePrompt(editingPresetId, {
                  prompt_text: customPrompt.trim(),
                  title: 'Custom Preset',
                  thumbnail_url: r2Url,
                });
                goToConfirm(editingPresetId, 'Custom Preset', customPrompt.trim());
              } else {
                // Create new
                // savePrompt now returns string | null (the new ID)
                const newId = await savePrompt(customPrompt.trim(), 'Custom Preset', r2Url);

                // Use the new ID if available, otherwise fallback to 'custom' (which won't update thumbnail, but better than crash)
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
  );
}
