import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Camera, CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '@clerk/clerk-expo';
import tw from 'twrnc';
import { RootStackParamList, ImageAnalysis } from '../types';
import { imageUtils } from '../utils/imageUtils';
import { storageService } from '../services/storageService';
import { useCredits } from '../hooks/useCredits';
import GlassButton from '../components/GlassButton';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { NANO_BANANA_PRESETS } from '../lib/nanobanana-presets';

type CameraScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Camera'>;
type CameraFacing = 'front' | 'back';

export default function CameraScreen(): React.JSX.Element {
  const navigation = useNavigation<CameraScreenNavigationProp>();
  const { user } = useUser();
  const cameraRef = useRef<CameraView>(null);
  const { credits, isLoading: creditsLoading } = useCredits();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState<CameraFacing>('back');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [lastGalleryImage, setLastGalleryImage] = useState<string | null>(null);
  const [currentPresetTitle, setCurrentPresetTitle] = useState<string>('Nano Banana');
  const [currentPresetId, setCurrentPresetId] = useState<string>('nano-banana-v1');
  const [currentCustomPromptText, setCurrentCustomPromptText] = useState<string | undefined>(undefined);

  useEffect(() => {
    requestPermissions();
    loadLastGalleryImage();
    updateCurrentPreset();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLastGalleryImage();
      updateCurrentPreset();
    }, [user])
  );

  const updateCurrentPreset = async (): Promise<void> => {
    try {
      const prefs: Record<string, any> = await storageService.getUserPreferences(user?.id);
      const preferredId: string | undefined = prefs.nanoBananaLastPresetId;

      if (preferredId === 'custom') {
        setCurrentPresetId('custom');
        const customText: string | undefined = prefs.nanoBananaCustomPromptText; // Read saved text

        if (customText && customText.trim().length > 0) {
          const trimmed = customText.trim();
          setCurrentCustomPromptText(trimmed);

          // Truncate logic: Increased to 42 chars to show more context
          if (trimmed.length > 42) {
            setCurrentPresetTitle(trimmed.substring(0, 40) + '...');
          } else {
            setCurrentPresetTitle(trimmed);
          }
        } else {
          setCurrentPresetTitle('Custom Prompt');
          setCurrentCustomPromptText(undefined);
        }
        return;
      }

      if (preferredId) {
        const preset = NANO_BANANA_PRESETS.find((p) => p.id === preferredId);
        if (preset) {
          setCurrentPresetId(preset.id);
          setCurrentPresetTitle(preset.title);
          return;
        }
      }

      // Default
      const defaultPreset = NANO_BANANA_PRESETS[0];
      if (defaultPreset) {
        setCurrentPresetId(defaultPreset.id);
        setCurrentPresetTitle(defaultPreset.title);
      }
    } catch (error) {
      console.warn('Failed to load preset preference:', error);
    }
  };

  const requestPermissions = async (): Promise<void> => {
    try {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      setHasPermission(cameraPermission.status === 'granted');

      if (cameraPermission.status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permissions to take photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => { } },
          ]
        );
      }

      if (mediaLibraryPermission.status !== 'granted') {
        Alert.alert(
          'Photo Library Permission',
          'PopCam needs access to your photo library to import images for Nano Banana.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setHasPermission(false);
    }
  };

  interface CaptureOptions {
    autoGenerate?: boolean;
    presetId?: string;
    presetTitle?: string;
    showConfirmation?: boolean;
  }

  const navigateAfterCapture = (imageUri: string, options?: CaptureOptions): void => {
    navigation.navigate('NanoBananaResult', {
      resultUri: '', // Will be generated
      referenceImageUri: imageUri,
      presetId: options?.presetId || currentPresetId,
      presetTitle: options?.presetTitle || currentPresetTitle,
      autoGenerate: true,
      // If we are using custom preset, use the saved custom prompt text if not overridden by options
      customPrompt: (options?.presetId === 'custom' || currentPresetId === 'custom')
        ? (options?.presetTitle === 'Custom Prompt' ? currentCustomPromptText : options?.presetTitle) // Logic bit tricky here because presetTitle is repurposed. 
        // Simpler: if options has a prompt (passed as presetTitle in some calls? No.)
        // Let's use currentCustomPromptText as default if ID is custom.
        : undefined,
    });
  };

  const handleImageReady = async (uri: string, options?: CaptureOptions): Promise<void> => {
    let localUri: string = uri;

    try {
      localUri = await imageUtils.copyImageToAppStorage(uri);
    } catch (storageError) {
      console.warn('Falling back to original URI after storage copy error:', storageError);
    }

    navigateAfterCapture(localUri, options);
  };

  const capturePhoto = async (options?: CaptureOptions): Promise<void> => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
      });

      if (photo?.uri) {
        await handleImageReady(photo.uri, options);
      } else {
        Alert.alert('Capture Failed', 'No image was captured. Please try again.');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Capture Error', 'Failed to take picture. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const takePicture = async (): Promise<void> => {
    await capturePhoto({
      presetId: currentPresetId,
      presetTitle: currentPresetTitle,
      showConfirmation: false, // Bypass confirmation
    });
  };



  const selectFromGallery = async (): Promise<void> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await handleImageReady(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Selection Error', 'Failed to select image. Please try again.');
    }
  };

  const toggleCameraType = (): void => {
    setCameraType((current) => (current === 'back' ? 'front' : 'back'));
  };

  const loadLastGalleryImage = async (): Promise<void> => {
    try {
      const analyses: ImageAnalysis[] = await storageService.getAnalyses(user?.id);
      const infographicAnalyses: ImageAnalysis[] = analyses.filter(
        (analysis: ImageAnalysis) => analysis.hasInfographic && analysis.infographicUri
      );

      if (infographicAnalyses.length > 0) {
        setLastGalleryImage(infographicAnalyses[0].infographicUri!);
      } else {
        setLastGalleryImage(null);
      }
    } catch (error) {
      console.error('Error loading last gallery image:', error);
      setLastGalleryImage(null);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-100`}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={tw`mt-4 text-base text-gray-700`}>Loading camera…</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-100`}>
        <Text style={tw`mb-4 text-base text-gray-700`}>Camera permission is required</Text>
        <TouchableOpacity style={tw`bg-blue-500 px-4 py-2 rounded`} onPress={requestPermissions}>
          <Text style={tw`text-base text-white font-bold`}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-black`}>
      <StatusBar style="light" />

      <CameraView
        ref={cameraRef}
        style={tw`flex-1 absolute top-0 left-0 right-0 bottom-0`}
        facing={cameraType}
      />

      <View style={tw`absolute top-12 left-0 right-0 px-4 flex-row justify-between items-center z-10`}>
        <GlassButton size={44} onPress={() => navigation.navigate('Home')}>
          <MaterialIcons name="person" size={20} color="#111827" />
        </GlassButton>
        <GlassButton size={44} onPress={selectFromGallery}>
          <MaterialIcons name="file-upload" size={20} color="#111827" />
        </GlassButton>
        <BlurView
          intensity={25}
          tint="light"
          style={[tw`px-4 py-2 rounded-full flex-row items-center`, { backgroundColor: 'transparent', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' }]}
        >
          <MaterialIcons name="diamond" size={18} color="#111827" style={tw`mr-1`} />
          {creditsLoading ? (
            <ActivityIndicator size="small" color="#111827" />
          ) : (
            <Text style={tw`text-sm text-gray-900 font-bold`}>{credits}</Text>
          )}
        </BlurView>
      </View>

      {/* Preset Name Display */}
      <View style={tw`absolute top-28 left-0 right-0 items-center z-10`}>
        <TouchableOpacity
          onPress={() => navigation.navigate('NanoBanana', { mode: 'picker' })}
          activeOpacity={0.8}
        >
          <BlurView intensity={20} tint="dark" style={[tw`px-4 py-1.5 rounded-full`, { overflow: 'hidden' }]}>
            <Text style={tw`text-white font-semibold text-sm shadow-sm`}>
              {currentPresetTitle}
            </Text>
          </BlurView>
        </TouchableOpacity>
      </View>


      <View style={tw`absolute bottom-12 left-0 right-0 px-6 flex-row justify-between items-center z-10`}>
        <GlassButton size={64} onPress={() => navigation.navigate('Gallery')}>
          {lastGalleryImage ? (
            <Image
              source={{ uri: lastGalleryImage }}
              style={[tw`rounded-full`, { width: 52, height: 52 }]}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons name="auto-awesome" size={28} color="#111827" />
          )}
        </GlassButton>

        <TouchableOpacity onPress={takePicture} disabled={isCapturing} activeOpacity={0.9}>
          <BlurView
            intensity={35}
            tint="light"
            style={[tw`items-center justify-center`, { width: 96, height: 96, borderRadius: 48, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'transparent', overflow: 'hidden' }]}
          >
            {isCapturing ? (
              <ActivityIndicator color="#111827" size="large" />
            ) : (
              <View style={[tw`bg-white`, { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#111827' }]} />
            )}
          </BlurView>
        </TouchableOpacity>

        <View style={tw`flex-row items-center`}>
          <GlassButton size={64} onPress={() => navigation.navigate('NanoBanana', { mode: 'picker' })} style={tw`mr-3`}>
            <View style={tw`items-center`}>
              <MaterialIcons name="auto-awesome" size={24} color="#111827" />
              <Text style={tw`text-[10px] text-gray-800 font-semibold mt-1`}>Nano</Text>
            </View>
          </GlassButton>
          <GlassButton size={64} onPress={toggleCameraType}>
            <MaterialIcons name="cameraswitch" size={28} color="#111827" />
          </GlassButton>
        </View>
      </View>

      {
        isCapturing && (
          <View style={tw`absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-40 justify-center items-center`}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={tw`mt-3 text-white font-semibold`}>Capturing…</Text>
          </View>
        )
      }
    </View >
  );
}
