import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
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
import { VolumeManager } from 'react-native-volume-manager';
import { DeviceMotion } from 'expo-sensors';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

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
  const [zoom, setZoom] = useState<number>(0);

  const { width } = useWindowDimensions();
  const camHeight = width * (4 / 3);

  useEffect(() => {
    requestPermissions();
    loadLastGalleryImage();
    updateCurrentPreset();
  }, []);

  // Monitor Device Orientation
  const [deviceOrientation, setDeviceOrientation] = useState<number>(0);

  useEffect(() => {
    if (DeviceMotion) {
      DeviceMotion.setUpdateInterval(500);
      const subscription = DeviceMotion.addListener((data) => {
        // Logic to determine orientation from accelerationIncludingGravity
        // iOS: x approaches -1 or 1 in landscape, y approaches -1 or 1 in portrait
        // Note: Values depend on platform (Android vs iOS). Expo attempts to normalize but verify.
        // Standard logic:
        // Portrait: y < -0.5
        // Upside Down: y > 0.5
        // Landscape Right (Home Button Left): x > 0.5
        // Landscape Left (Home Button Right): x < -0.5

        const { x, y } = data.accelerationIncludingGravity;

        let orientation = 0;
        if (Math.abs(x) > Math.abs(y)) {
          // Landscape
          // iOS: x > 0 (Home Left/Landscape Right) -> 90 deg?
          // Let's assume standard behavior:
          // If x > 0.5 => Landscape Left (rotate -90 or 270)
          // If x < -0.5 => Landscape Right (rotate 90)
          // We'll test this or provide a reasonable guess.
          if (x > 0) {
            orientation = 90;
          } else {
            orientation = 270;
          }
        } else {
          // Portrait
          if (y < 0) {
            orientation = 0;
          } else {
            orientation = 180;
          }
        }
        setDeviceOrientation(orientation);
      });

      return () => subscription.remove();
    }
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
        } else {
          // ID exists but not in standard list -> Custom History Item
          const customText: string | undefined = prefs.nanoBananaCustomPromptText;
          if (customText && customText.trim().length > 0) {
            setCurrentPresetId(preferredId);
            setCurrentCustomPromptText(customText.trim());
            // Truncate title
            const trimmed = customText.trim();
            if (trimmed.length > 42) {
              setCurrentPresetTitle(trimmed.substring(0, 40) + '...');
            } else {
              setCurrentPresetTitle(trimmed);
            }
            return;
          }
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
      customPrompt: (options?.presetId === 'custom' || currentPresetId === 'custom' || !NANO_BANANA_PRESETS.some(p => p.id === (options?.presetId || currentPresetId)))
        ? (currentCustomPromptText) // Always prefer the stored text for custom items
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
        let finalUri = photo.uri;

        // Auto-rotate if needed
        if (deviceOrientation !== 0) {
          try {
            // Calculate rotation needed
            // User reported images are upside down (180 deg off).
            // Previous logic: 90 -> -90, 270 -> 90.
            // New logic: 90 -> 90, 270 -> -90.

            let rotation = 0;
            if (deviceOrientation === 90) rotation = 90;
            if (deviceOrientation === 270) rotation = -90; // or 270
            if (deviceOrientation === 180) rotation = 180;

            if (rotation !== 0) {
              const manipResult = await manipulateAsync(
                photo.uri,
                [{ rotate: rotation }],
                { compress: 0.85, format: SaveFormat.JPEG }
              );
              finalUri = manipResult.uri;
            }
          } catch (rotError) {
            console.warn('Failed to auto-rotate image:', rotError);
          }
        }

        await handleImageReady(finalUri, options);
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

  // Hardware Button (Volume) Listener for Capture
  useEffect(() => {
    let volumeListener: any = null;

    const setupVolumeListener = async () => {
      try {
        if (!VolumeManager) {
          console.warn("VolumeManager is not available");
          return;
        }
        // Initial setup
        await VolumeManager.showNativeVolumeUI({ enabled: false });

        // Listen for changes
        // Using a direct call to takePicture inside the listener
        volumeListener = VolumeManager.addVolumeListener(async (result) => {
          if (!isCapturing && hasPermission) {
            console.log("Hardware button pressed (volume change), taking picture...");
            // We need to call the latest takePicture.
            // Since this effect might not re-bind often, relying on closure might be stale if deps aren't perfect.
            // However, takePicture relies on state.
            // Let's assume takePicture is stable enough or re-binds.
            // But wait, takePicture is defined above, but it closes over `currentPresetId` etc.
            // We should use a ref for the latest takePicture function to avoid re-binding the listener constantly.
            takePictureRef.current();
          }
        });
      } catch (err) {
        console.warn("Failed to setup hardware button listener", err);
      }
    };

    setupVolumeListener().catch(err => console.warn("Error in setupVolumeListener", err));

    return () => {
      if (volumeListener) {
        volumeListener.remove();
      }
      try {
        if (VolumeManager && VolumeManager.showNativeVolumeUI) {
          VolumeManager.showNativeVolumeUI({ enabled: true });
        }
      } catch (e) {
        // Ignore warnings on cleanup
      }
    };
  }, [hasPermission, isCapturing]); // removed takePicture from deps to avoid cycle, used ref below

  // Keep a ref to the latest takePicture
  const takePictureRef = useRef(takePicture);
  useEffect(() => {
    takePictureRef.current = takePicture;
  }, [takePicture]);


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

      <View style={{ height: camHeight, width: width, overflow: 'hidden' }}>
        <CameraView
          ref={cameraRef}
          style={tw`flex-1`}
          facing={cameraType}
          zoom={zoom}
        />

        {/* Zoom Controls */}
        <View style={tw`absolute bottom-4 left-0 right-0 flex-row justify-center items-center gap-4`}>
          {[0, 0.1, 0.2].map((z, index) => {
            const label = index === 0 ? '1x' : index === 1 ? '2x' : '3x';
            const isSelected = zoom === z;
            return (
              <TouchableOpacity
                key={label}
                onPress={() => setZoom(z)}
                style={[
                  tw`w-8 h-8 rounded-full items-center justify-center bg-black/50`,
                  isSelected && tw`bg-yellow-500`
                ]}
              >
                <Text style={[tw`text-xs font-bold`, isSelected ? tw`text-black` : tw`text-white`]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={tw`absolute top-12 left-0 right-0 px-4 flex-row justify-between items-center z-10`}>
        <GlassButton size={44} onPress={() => navigation.navigate('Home')}>
          <MaterialIcons name="person" size={20} color="#111827" />
        </GlassButton>
        <GlassButton size={44} onPress={selectFromGallery}>
          <MaterialIcons name="file-upload" size={20} color="#111827" />
        </GlassButton>
        <TouchableOpacity onPress={() => navigation.navigate('PurchaseCredits')} activeOpacity={0.8}>
          <BlurView
            intensity={25}
            tint="light"
            style={[tw`px-4 py-2 rounded-full flex-row items-center`, { backgroundColor: 'transparent', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' }]}
          >
            <MaterialIcons name="bolt" size={18} color="#111827" style={tw`mr-1`} />
            {creditsLoading ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : (
              <Text style={tw`text-sm text-gray-900 font-bold`}>{credits}</Text>
            )}
          </BlurView>
        </TouchableOpacity>
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
