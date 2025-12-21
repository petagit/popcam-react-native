import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  SafeAreaView,
  LayoutRectangle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '@clerk/clerk-expo';
import tw from 'twrnc';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList, ImageAnalysis } from '../types';
import { storageService } from '../services/storageService';
import SignOutButton from '../components/buttons/SignOutButton';
import { UserProfileSection } from '../components/UserProfileSection';
import GlassButton from '../components/buttons/GlassButton';
import SettingsButton from '../components/buttons/SettingsButton';
import CreditsButton from '../components/buttons/CreditsButton';
import BackButton from '../components/buttons/BackButton';
import AppBackground from '../components/AppBackground';
import { BlurView } from 'expo-blur';
import { colors, spacing, shadows } from '../styles/sharedStyles';
import { useOnboarding } from '../features/onboarding/OnboardingContext';


type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

interface QuickAction {
  id: string;
  title: string;
  // subtitle removed
  icon: MaterialIconName;
  onPress: () => void;
  accentColor: string;
  backgroundColor: string;
  iconBackground: string;
}

type UserScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function UserScreen(): React.JSX.Element {
  const navigation = useNavigation<UserScreenNavigationProp>();
  const { user } = useUser();
  const { startOnboarding } = useOnboarding(); // Hook
  const [recentGenerations, setRecentGenerations] = useState<ImageAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);


  useEffect(() => {
    loadRecentGenerations();
  }, [user?.id]);



  const loadRecentGenerations = async (): Promise<void> => {
    try {
      if (user?.id) {
        // Automatically try to restore missing items from cloud history
        await storageService.syncCloudHistory(user.id);
      }
      const analyses: ImageAnalysis[] = await storageService.getResolvedAnalyses(user?.id);
      setRecentGenerations(analyses.slice(0, 6));
    } catch (error) {
      console.error('Error loading generations:', error);
      Alert.alert('Error', 'Failed to load recent generations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCameraPress = (): void => {
    navigation.navigate('Camera');
  };

  const handleGalleryPress = (): void => {
    navigation.navigate('Gallery');
  };

  const handleSettingsPress = (): void => {
    navigation.navigate('Settings');
  };

  const handleNanoBananaPress = (): void => {
    navigation.navigate('NanoBanana');
  };

  const handlePurchaseCreditsPress = (): void => {
    navigation.navigate('PurchaseCredits');
  };




  const handleTutorialPress = (): void => {
    startOnboarding();
    navigation.navigate('Camera');
  };

  const quickActions: QuickAction[] = [
    {
      id: 'tutorial',
      title: 'Tutorial',
      icon: 'school',
      onPress: handleTutorialPress,
      accentColor: '#059669', // emerald-600
      backgroundColor: '#d1fae5', // emerald-100
      iconBackground: '#a7f3d0', // emerald-200
    },
    {
      id: 'nano-banana',
      title: 'Filters',
      icon: 'auto-fix-high', // Magic icon representation
      onPress: handleNanoBananaPress,
      accentColor: '#9333ea', // purple-600
      backgroundColor: '#f3e8ff', // purple-100
      iconBackground: '#e9d5ff', // purple-200
    },
    {
      id: 'camera',
      title: 'Camera',
      icon: 'camera-alt',
      onPress: handleCameraPress,
      accentColor: '#ea580c', // orange-600
      backgroundColor: '#ffedd5', // orange-100
      iconBackground: '#fed7aa', // orange-200
    },
    {
      id: 'gallery',
      title: 'Gallery',
      icon: 'collections',
      onPress: handleGalleryPress,
      accentColor: '#2563eb',
      backgroundColor: '#dbeafe',
      iconBackground: '#bfdbfe',
    },
  ];

  const handleAnalysisPress = (analysis: ImageAnalysis): void => {
    navigation.navigate('GalleryImage', {
      imageUri: analysis.imageUri,
      infographicUri: analysis.infographicUri,
      showInfographicFirst: analysis.hasInfographic && !!analysis.infographicUri
    });
  };

  const renderGenerationItem = ({ item }: { item: ImageAnalysis }) => {
    const previewUri: string = item.hasInfographic && item.infographicUri ? item.infographicUri : item.imageUri;
    const title: string = item.description?.trim() || 'PopCam generation';
    const dateLabel: string = item.timestamp.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const tagPreview: string = item.tags?.length ? item.tags.slice(0, 2).join(' • ') : '';

    return (
      <TouchableOpacity
        style={tw`bg-white rounded-2xl mb-4 overflow-hidden border border-gray-100 shadow-sm`}
        onPress={() => handleAnalysisPress(item)}
        activeOpacity={0.9}
      >
        <Image source={{ uri: previewUri }} style={tw`w-full h-44`} resizeMode="cover" />
        <View style={tw`px-4 py-4`}>
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <Text style={tw`text-xs font-semibold uppercase text-blue-500`}>
              {item.hasInfographic ? 'AI Generation' : 'Original'}
            </Text>
            <Text style={tw`text-xs text-gray-500`}>{dateLabel}</Text>
          </View>
          <Text style={tw`text-base font-semibold text-gray-900 mb-1`} numberOfLines={2}>
            {title}
          </Text>
          <Text style={tw`text-xs text-gray-500`} numberOfLines={1}>
            {tagPreview || 'Tap to open full details'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AppBackground>
      <SafeAreaView style={tw`flex-1`}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={tw`px-6 pt-6 pb-3`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <BackButton />
            <View style={tw`flex-row items-center gap-3`}>
              <CreditsButton variant="glass" />
              <SettingsButton />
              {user && <SignOutButton iconOnly size="small" />}
            </View>
          </View>

          <View>
            <Text style={tw`text-3xl font-bold text-gray-900`}>PopCam</Text>
            <Text style={tw`text-base text-gray-800 mt-1`}>Your AI photo companion</Text>
            {user && (
              <Text style={tw`text-sm text-gray-700 mt-3`} numberOfLines={1}>
                Hi {user.firstName || user.emailAddresses[0]?.emailAddress}, welcome back.
              </Text>
            )}
          </View>
        </View>

        {/* User summary */}
        {user && <UserProfileSection style={tw`mx-6 mb-4`} />}

        {/* Quick actions */}
        <View style={tw`px-6 mt-5`}>
          <View style={tw`flex-row gap-3 justify-center`}>
            {quickActions.map((action: QuickAction) => (
              <View
                key={action.id}
                style={tw`flex-1`}
                collapsable={false}
              >
                <TouchableOpacity
                  onPress={action.onPress}
                  activeOpacity={0.85}
                  style={{ height: 140, width: '100%' }}
                >
                  <View
                    style={[
                      tw`flex-1 items-center justify-center p-4 bg-white`,
                      {
                        borderRadius: spacing.md,
                        ...shadows.small
                      }
                    ]}
                  >
                    <View
                      style={[
                        tw`w-10 h-10 rounded-full items-center justify-center mb-3`,
                        { backgroundColor: action.iconBackground },
                      ]}
                    >
                      <MaterialIcons name={action.icon} size={22} color={action.accentColor} />
                    </View>
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: colors.text.primary,
                      textAlign: 'center'
                    }} numberOfLines={1}>{action.title}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Recent generations */}
        <View style={tw`flex-1 px-6 mt-6`}>
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>
              {user ? 'Recent generations' : 'Latest generations'}
            </Text>
            <TouchableOpacity onPress={handleGalleryPress}>
              <Text style={tw`text-sm font-semibold text-white bg-black/20 px-3 py-1 rounded-full overflow-hidden`}>View all</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <Text style={tw`text-gray-700 text-center py-8`}>Loading...</Text>
          ) : recentGenerations.length > 0 ? (
            <FlatList
              data={recentGenerations}
              renderItem={renderGenerationItem}
              keyExtractor={(item: ImageAnalysis) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw`pb-8`}
            />
          ) : (
            <View style={tw`items-center justify-center py-12 px-6`}>
              <Text style={tw`text-gray-800 text-lg text-center mb-2`}>
                No generations yet
              </Text>
              <Text style={tw`text-gray-600 text-base text-center`}>
                Capture your first moment to see PopCam’s AI generation here.
              </Text>
              <TouchableOpacity
                style={tw`mt-6 bg-blue-600 px-6 py-3 rounded-full`}
                onPress={handleCameraPress}
              >
                <Text style={tw`text-white text-sm font-semibold`}>Launch camera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </AppBackground>
  );
}
