import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  SafeAreaView,
  Dimensions,
  Modal,
  Pressable,

  Platform,
  Linking,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '@clerk/clerk-expo';
import GlassButton from '../components/GlassButton';
import BackButton from '../components/buttons/BackButton';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import tw from 'twrnc';
import { RootStackParamList, ImageAnalysis } from '../types';
import { storageService } from '../services/storageService';
import { MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import CameraButton from '../components/CameraButton';
import AppBackground from '../components/AppBackground';

type GalleryImageScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GalleryImage'>;
type GalleryImageScreenRouteProp = RouteProp<RootStackParamList, 'GalleryImage'>;

const { width } = Dimensions.get('window');

export default function GalleryImageScreen(): React.JSX.Element {
  const navigation = useNavigation<GalleryImageScreenNavigationProp>();
  const route = useRoute<GalleryImageScreenRouteProp>();
  const { user } = useUser();
  const { imageUri, infographicUri, showInfographicFirst = false, analysisId } = route.params;

  const [analyses, setAnalyses] = useState<ImageAnalysis[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  // Derived current analysis
  const analysis = analyses[currentIndex] ?? null;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showingInfographic, setShowingInfographic] = useState<boolean>(showInfographicFirst);
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [shareVisible, setShareVisible] = useState<boolean>(false);
  const flatListRef = React.useRef<any>(null);

  useEffect(() => {
    loadAnalyses();
  }, [user]); // We load all analyses once

  // Reset showing infographic preference when sliding to a new image? 
  // User might prefer sticky setting, but initial requirement was showInfographicFirst param.
  // We'll reset it to "true" (Show AI) by default when changing, or keep it sticky?
  // Let's keep it simple: defaulting to true (AI version) for consistency with gallery view usually showing result.
  useEffect(() => {
    if (analysis?.hasInfographic) {
      setShowingInfographic(true);
    } else {
      setShowingInfographic(false);
    }
  }, [currentIndex, analysis?.id]);


  const loadAnalyses = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const savedAnalyses: ImageAnalysis[] = await storageService.getAnalyses(user?.id);

      // Filter logic same as Gallery (or lenient? Gallery filters for infographicAnalyses for list, but maybe we want all?)
      // The GalleryScreen filters: `const infographicAnalyses ... = savedAnalyses.filter(...)`
      // We should probably match that so we only swipe through what was in the gallery.
      const validAnalyses: ImageAnalysis[] = savedAnalyses.filter(
        (item: ImageAnalysis) => item.hasInfographic && item.infographicUri
      ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setAnalyses(validAnalyses);

      // Find initial index
      let initialIndex = -1;
      if (analysisId) {
        initialIndex = validAnalyses.findIndex(a => a.id === analysisId);
      }

      if (initialIndex === -1 && imageUri) {
        // Fallback
        initialIndex = validAnalyses.findIndex(a => a.imageUri === imageUri);
      }

      if (initialIndex !== -1) {
        setCurrentIndex(initialIndex);
      } else {
        // If not found in the filtered list (unlikely if came from gallery), maybe just show first or alert
        if (validAnalyses.length === 0) {
          Alert.alert('Error', 'Photo not found');
          navigation.goBack();
          return;
        }
        setCurrentIndex(0);
      }

    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const onViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const openShareSheet = (): void => {
    setShareVisible(true);
  };

  const closeShareSheet = (): void => {
    setShareVisible(false);
  };

  type ShareTarget =
    | 'system'
    | 'instagram'
    | 'facebook'
    | 'twitter'
    | 'whatsapp'
    | 'telegram'
    | 'messenger'
    | 'snapchat'
    | 'tiktok'
    | 'email'
    | 'messages';

  const shareTo = async (target: ShareTarget): Promise<void> => {
    try {
      const uri: string = getCurrentImageUri();
      if (!uri) {
        Alert.alert('Share', 'No image available to share.');
        return;
      }

      const text: string = 'Check out this AI generation I made with PopCam!';

      const openOrFallback = async (url: string | undefined): Promise<void> => {
        if (!url) {
          const shareContent: any = Platform.select({
            ios: { url: uri },
            android: { url: uri, message: text },
            default: { url: uri },
          });

          await Share.share(
            shareContent,
            {
              dialogTitle: 'Share',
              subject: 'PopCam',
            }
          );
          return;
        }
        try {
          const canOpen: boolean = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
          } else {
            const shareContent: any = Platform.select({
              ios: { url: uri },
              android: { url: uri, message: text },
              default: { url: uri },
            });
            await Share.share(
              shareContent
            );
          }
        } catch {
          const shareContent: any = Platform.select({
            ios: { url: uri },
            android: { url: uri, message: text },
            default: { url: uri },
          });
          await Share.share(
            shareContent
          );
        }
      };

      switch (target) {
        case 'instagram':
          await openOrFallback('instagram://app');
          break;
        case 'facebook':
          await openOrFallback(undefined);
          break;
        case 'twitter':
          await openOrFallback(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`);
          break;
        case 'whatsapp':
          await openOrFallback(`whatsapp://send?text=${encodeURIComponent(text)}`);
          break;
        case 'telegram':
          await openOrFallback(`tg://msg?text=${encodeURIComponent(text)}`);
          break;
        case 'messenger':
          await openOrFallback(undefined);
          break;
        case 'snapchat':
          await openOrFallback('snapchat://');
          break;
        case 'tiktok':
          await openOrFallback('tiktok://');
          break;
        case 'email':
          await openOrFallback(`mailto:?subject=${encodeURIComponent('PopCam')}&body=${encodeURIComponent(text)}`);
          break;
        case 'messages':
          await openOrFallback(
            Platform.select({
              ios: `sms:&body=${encodeURIComponent(text)}`,
              android: `sms:?body=${encodeURIComponent(text)}`,
            }) as string
          );
          break;
        case 'system':
        default:
          const shareContent: any = Platform.select({
            ios: { url: uri },
            default: { url: uri, message: text },
          });

          await Share.share(
            shareContent,
            {
              dialogTitle: 'Share',
              subject: 'PopCam',
            }
          );
          break;
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Share failed', 'Unable to share this image.');
    } finally {
      closeShareSheet();
    }
  };

  const handleDelete = (): void => {
    if (!analysis) return;

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageService.deleteAnalysis(analysis.id, user?.id);

              // Remove from local list
              const newAnalyses = analyses.filter(a => a.id !== analysis.id);
              if (newAnalyses.length === 0) {
                navigation.goBack();
              } else {
                setAnalyses(newAnalyses);
                // Adjust index if needed
                if (currentIndex >= newAnalyses.length) {
                  setCurrentIndex(newAnalyses.length - 1);
                }
              }
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  const handleSaveToPhotos = async (): Promise<void> => {
    try {
      // Request permission to access media library
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Permission to access photo library is required to save photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      const currentImageUri: string = getCurrentImageUri();

      if (!currentImageUri) {
        throw new Error('No image URI available');
      }

      let workingUri = currentImageUri;
      let cleanupUri: string | null = null;

      if (currentImageUri.startsWith('data:image/')) {
        const base64Data = currentImageUri.split(',')[1];
        if (!base64Data) {
          throw new Error('Invalid data URL format');
        }

        const tempPath = `${FileSystem.documentDirectory}temp_image_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(tempPath, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        workingUri = tempPath;
        cleanupUri = tempPath;
      } else if (currentImageUri.startsWith('http://') || currentImageUri.startsWith('https://')) {
        const tempPath = `${FileSystem.documentDirectory}temp_image_${Date.now()}.jpg`;
        const downloadResult = await FileSystem.downloadAsync(currentImageUri, tempPath);

        if (!downloadResult || downloadResult.status !== 200) {
          throw new Error(
            downloadResult ? `Download failed with status: ${downloadResult.status}` : 'Download failed - no result returned'
          );
        }

        workingUri = tempPath;
        cleanupUri = tempPath;
      } else if (!currentImageUri.startsWith('file://')) {
        throw new Error('Unsupported image URI scheme');
      }

      const fileInfo = await FileSystem.getInfoAsync(workingUri);
      if (!fileInfo.exists) {
        throw new Error('Failed to prepare image for saving');
      }

      const asset = await MediaLibrary.createAssetAsync(workingUri);
      await MediaLibrary.createAlbumAsync('PopCam', asset, false);

      // Clean up temporary file
      if (cleanupUri) {
        try {
          await FileSystem.deleteAsync(cleanupUri);
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary file:', cleanupError);
        }
      }

      Alert.alert(
        'Success!',
        'Photo saved to your photo library.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving photo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Error',
        `Failed to save photo: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleRetakePhoto = (): void => {
    navigation.navigate('Camera');
  };

  const handleImagePress = (): void => {
    if (analysis?.hasInfographic && analysis.infographicUri) {
      setShowingInfographic(!showingInfographic);
    }
  };

  const getCurrentImageUri = (): string => {
    if (showingInfographic && analysis?.infographicUri) {
      return analysis.infographicUri;
    }
    return analysis?.imageUri || imageUri || '';
  };

  const getImageTypeLabel = (): string => {
    if (!analysis?.hasInfographic) return '';
    return showingInfographic ? 'AI Generation' : 'Original Image';
  };

  const openDrawer = (): void => {
    setDrawerVisible(true);
  };

  const closeDrawer = (): void => {
    setDrawerVisible(false);
  };

  const handleActionAndCloseDrawer = (action: () => void | Promise<void>) => {
    return async () => {
      closeDrawer();
      if (typeof action === 'function') {
        await action();
      }
    };
  };

  const getItemLayout = (data: any, index: number) => ({
    length: width,
    offset: width * index,
    index,
  });

  const renderItem = ({ item }: { item: ImageAnalysis }) => {
    // Determine URI for this item based on state. 
    // Wait, `showingInfographic` is global state for the screen.
    // That's fine, toggle applies to currently visible image. 
    // BUT, `renderItem` needs to decide which URI to show for *this* item.
    // If `showingInfographic` is true, show AI version of item (if available).
    const uriToShow = (showingInfographic && item.hasInfographic && item.infographicUri)
      ? item.infographicUri
      : item.imageUri;

    return (
      <View style={{ width, height: '100%' }}>
        <TouchableOpacity
          onPress={handleImagePress}
          style={tw`w-full h-full`}
          disabled={!item.hasInfographic}
          activeOpacity={1}
        >
          <Image
            source={{ uri: uriToShow }}
            style={tw`w-full h-full`}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <Text style={tw`text-base text-gray-600`}>Loading photos...</Text>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white px-5`}>
        <Text style={tw`text-lg text-red-500 mb-5 text-center`}>No photos found.</Text>
        <TouchableOpacity style={tw`bg-blue-500 px-6 py-3 rounded-lg`} onPress={() => navigation.goBack()}>
          <Text style={tw`text-white text-base font-semibold`}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <AppBackground>
      <StatusBar style="dark" />

      {/* Full Screen Image List */}
      <View style={tw`flex-1 relative`}>

        <FlatList
          ref={flatListRef}
          data={analyses}
          renderItem={renderItem}
          keyExtractor={(item: ImageAnalysis) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={currentIndex}
          getItemLayout={getItemLayout}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        />

        {/* Overlay Header Buttons */}
        <SafeAreaView style={tw`absolute top-0 left-0 right-0`} pointerEvents="box-none">
          <View style={tw`flex-row justify-between items-center px-5 py-4`}>
            <BackButton />

            <CameraButton
              onPress={() => navigation.navigate('Camera')}
              size="medium"
              style={tw`shadow-lg`}
            />
          </View>
        </SafeAreaView>

        {/* Image Type Indicator */}
        {analysis?.hasInfographic && (
          <View
            style={tw`absolute bottom-20 left-4 bg-black bg-opacity-70 px-3 py-2 rounded-lg`}
            pointerEvents="none"
          >
            <Text style={tw`text-white text-sm font-medium`}>{getImageTypeLabel()}</Text>
            <Text style={tw`text-gray-300 text-xs mt-1`}>Tap to toggle</Text>
          </View>
        )}

        {/* Floating Action Button */}
        <View style={tw`absolute bottom-8 right-6`}>
          <TouchableOpacity
            style={tw`bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg`}
            onPress={openDrawer}
          >
            <MaterialIcons name="more-horiz" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Drawer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={drawerVisible}
        onRequestClose={closeDrawer}
      >
        <Pressable
          style={tw`flex-1 bg-black bg-opacity-50 justify-end`}
          onPress={closeDrawer}
        >
          <Pressable
            style={tw`bg-white rounded-t-3xl p-6 pb-8`}
            onPress={(e: any) => e.stopPropagation()}
          >
            {/* Drawer Handle */}
            <View style={tw`w-12 h-1 bg-gray-300 rounded-full self-center mb-6`} />


            {/* Action Buttons */}
            <View style={tw`gap-4`}>
              <TouchableOpacity
                style={tw`bg-green-500 rounded-xl py-4 items-center flex-row justify-center`}
                onPress={handleActionAndCloseDrawer(handleSaveToPhotos)}
              >
                <MaterialIcons name="save-alt" size={18} color="#ffffff" />
                <Text style={tw`text-white text-base font-semibold ml-2`}>Save to Photos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`bg-blue-500 rounded-xl py-4 items-center flex-row justify-center`}
                onPress={handleActionAndCloseDrawer(openShareSheet)}
              >
                <MaterialIcons name="share" size={18} color="#ffffff" />
                <Text style={tw`text-white text-base font-semibold ml-2`}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`bg-white rounded-xl py-4 items-center border-2 border-red-500 flex-row justify-center`}
                onPress={handleActionAndCloseDrawer(handleDelete)}
              >
                <MaterialIcons name="delete" size={18} color="#ef4444" />
                <Text style={tw`text-red-500 text-base font-semibold ml-2`}>Delete Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`bg-gray-200 rounded-xl py-4 items-center mt-2`}
                onPress={closeDrawer}
              >
                <Text style={tw`text-gray-600 text-base font-semibold`}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Share Sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={shareVisible}
        onRequestClose={closeShareSheet}
      >
        <Pressable
          style={tw`flex-1 bg-black/40 justify-end`}
          onPress={closeShareSheet}
        >
          <View style={tw`bg-white rounded-t-3xl px-6 pt-4 pb-8`}>
            <View style={tw`items-center mb-4`}>
              <View style={tw`w-10 h-1.5 bg-gray-300 rounded-full mb-3`} />
              <Text style={tw`text-base font-semibold text-gray-800`}>Share</Text>
            </View>
            <View style={tw`flex-row flex-wrap justify-between`}>
              <TouchableOpacity style={tw`items-center w-[22%] mb-5`} onPress={() => shareTo('system')}>
                <MaterialCommunityIcons name="share-variant" size={26} color="#111827" />
                <Text style={tw`text-xs text-gray-700 mt-1`}>More</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw`items-center w-[22%] mb-5`} onPress={() => shareTo('instagram')}>
                <FontAwesome name="instagram" size={26} color="#E1306C" />
                <Text style={tw`text-xs text-gray-700 mt-1`}>Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw`items-center w-[22%] mb-5`} onPress={() => shareTo('facebook')}>
                <FontAwesome name="facebook" size={26} color="#1877F2" />
                <Text style={tw`text-xs text-gray-700 mt-1`}>Facebook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw`items-center w-[22%] mb-5`} onPress={() => shareTo('twitter')}>
                <FontAwesome name="twitter" size={26} color="#1DA1F2" />
                <Text style={tw`text-xs text-gray-700 mt-1`}>Twitter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw`items-center w-[22%] mb-5`} onPress={() => shareTo('whatsapp')}>
                <FontAwesome name="whatsapp" size={26} color="#25D366" />
                <Text style={tw`text-xs text-gray-700 mt-1`}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw`items-center w-[22%] mb-5`} onPress={() => shareTo('telegram')}>
                <FontAwesome name="telegram" size={26} color="#27A7E7" />
                <Text style={tw`text-xs text-gray-700 mt-1`}>Telegram</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw`items-center w-[22%] mb-5`} onPress={() => shareTo('messenger')}>
                <MaterialCommunityIcons name="facebook-messenger" size={26} color="#0099FF" />
                <Text style={tw`text-xs text-gray-700 mt-1`}>Messenger</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw`items-center w-[22%] mb-5`} onPress={() => shareTo('snapchat')}>
                <MaterialCommunityIcons name="snapchat" size={26} color="#FFFC00" />
                <Text style={tw`text-xs text-gray-700 mt-1`}>Snapchat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw`items-center w-[22%] mb-5`} onPress={() => shareTo('tiktok')}>
                <MaterialCommunityIcons name="music-box" size={26} color="#000000" />
                <Text style={tw`text-xs text-gray-700 mt-1`}>TikTok</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw`items-center w-[22%] mb-5`} onPress={() => shareTo('email')}>
                <MaterialIcons name="email" size={26} color="#111827" />
                <Text style={tw`text-xs text-gray-700 mt-1`}>Email</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw`items-center w-[22%] mb-5`} onPress={() => shareTo('messages')}>
                <MaterialIcons name="sms" size={26} color="#111827" />
                <Text style={tw`text-xs text-gray-700 mt-1`}>Messages</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </AppBackground>
  );
}
