import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  SafeAreaView,
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
import { SignOutButton } from '../components/SignOutButton';
import { UserProfileSection } from '../components/UserProfileSection';
import GlassButton from '../components/GlassButton';
import BackButton from '../components/BackButton';
import AppBackground from '../components/AppBackground';
import { BlurView } from 'expo-blur';

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
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
  const [recentGenerations, setRecentGenerations] = useState<ImageAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadRecentGenerations();
  }, [user?.id]);

  const loadRecentGenerations = async (): Promise<void> => {
    try {
      const analyses: ImageAnalysis[] = await storageService.getAnalyses(user?.id);
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

  const quickActions: QuickAction[] = [
    {
      id: 'gallery',
      title: 'Gallery',
      subtitle: 'Browse previous generations',
      icon: 'collections',
      onPress: handleGalleryPress,
      accentColor: '#2563eb',
      backgroundColor: '#dbeafe',
      iconBackground: '#bfdbfe',
    },
    {
      id: 'credits',
      title: 'Get Credits',
      subtitle: 'Top up balance',
      icon: 'shopping-bag',
      onPress: handlePurchaseCreditsPress,
      accentColor: '#059669',
      backgroundColor: '#d1fae5',
      iconBackground: '#a7f3d0',
    },
  ];

  const handleAnalysisPress = (analysis: ImageAnalysis): void => {
    navigation.navigate('Analysis', {
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
              <GlassButton size={40} onPress={handleSettingsPress} intensity={40} style={tw`bg-white/20`}>
                <MaterialIcons name="settings" size={20} color="#111827" />
              </GlassButton>
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

        {/* Primary action card */}
        <View style={tw`px-6`}>
          <TouchableOpacity onPress={handleCameraPress} activeOpacity={0.92}>
            <BlurView
              intensity={40}
              tint="light"
              style={[tw`rounded-3xl px-6 py-8 shadow-sm overflow-hidden border border-white/30`, { backgroundColor: '#EDCFAC' }]}
            >
              <View style={tw`items-center justify-center w-full`}>
                <Text style={tw`text-gray-900 text-2xl font-bold text-center`}>Back to PopCam</Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={tw`px-6 mt-5`}>
          <View style={tw`flex-row gap-3 justify-center`}>
            {quickActions.map((action: QuickAction) => (
              <TouchableOpacity
                key={action.id}
                onPress={action.onPress}
                activeOpacity={0.85}
                style={[tw`w-[48%]`, { height: 120 }]}
              >
                <BlurView
                  intensity={40}
                  tint="light"
                  style={[tw`flex-1 items-center justify-center rounded-2xl p-4 border border-white/30 overflow-hidden`, { backgroundColor: '#EDCFAC' }]}
                >
                  <View
                    style={[
                      tw`w-10 h-10 rounded-full items-center justify-center mb-3`,
                      { backgroundColor: action.iconBackground },
                    ]}
                  >
                    <MaterialIcons name={action.icon} size={22} color={action.accentColor} />
                  </View>
                  <Text style={tw`text-sm font-semibold text-gray-900 text-center`}>{action.title}</Text>
                  <Text style={tw`text-xs text-gray-700 mt-1 text-center`} numberOfLines={2}>
                    {action.subtitle}
                  </Text>
                </BlurView>
              </TouchableOpacity>
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
