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

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<HomeScreenNavigationProp>();
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
      id: 'nano-banana',
      title: 'Nano Banana',
      subtitle: 'Experiment with prompts',
      icon: 'auto-awesome',
      onPress: handleNanoBananaPress,
      accentColor: '#d97706',
      backgroundColor: '#fef3c7',
      iconBackground: '#fde68a',
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Tune your experience',
      icon: 'tune',
      onPress: handleSettingsPress,
      accentColor: '#4b5563',
      backgroundColor: '#e5e7eb',
      iconBackground: '#d1d5db',
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
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={tw`px-6 pt-6 pb-3`}>
        <View style={tw`flex-row justify-between items-start`}>
          <View style={tw`flex-1 pr-4`}>
            <Text style={tw`text-3xl font-bold text-gray-900`}>PopCam</Text>
            <Text style={tw`text-base text-gray-500 mt-1`}>Your AI photo companion</Text>
            {user && (
              <Text style={tw`text-sm text-gray-400 mt-3`} numberOfLines={1}>
                Hi {user.firstName || user.emailAddresses[0]?.emailAddress}, welcome back.
              </Text>
            )}
          </View>
          <View style={tw`flex-row items-center gap-3`}>
            <GlassButton size={40} onPress={handleSettingsPress}>
              <MaterialIcons name="settings" size={20} color="#111827" />
            </GlassButton>
            {user && <SignOutButton iconOnly size="small" />}
          </View>
        </View>
      </View>

      {/* User summary */}
      {user && <UserProfileSection style={tw`mx-6 mb-4`} />}

      {/* Primary action card */}
      <View style={tw`px-6`}>
        <TouchableOpacity onPress={handleCameraPress} activeOpacity={0.92}>
          <LinearGradient
            colors={['#2563eb', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={tw`rounded-3xl px-6 py-6 shadow-md`}
          >
            <View style={tw`flex-row items-center`}>
              <View style={tw`flex-1 pr-2`}>
                <Text style={tw`text-white text-2xl font-bold`}>Start a new generation</Text>
                <Text style={tw`text-white text-sm mt-2 opacity-90`}>
                  Capture something new and let PopCam craft an AI-powered generation in seconds.
                </Text>
                <View style={tw`flex-row items-center bg-white/20 px-4 py-2 rounded-full mt-4 self-start`}>
                  <MaterialIcons name="photo-camera" size={18} color="#ffffff" />
                  <Text style={tw`text-white text-sm font-semibold ml-2`}>Open Camera</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <View style={tw`px-6 mt-5`}>
        <View style={tw`flex-row gap-3`}>
          {quickActions.map((action: QuickAction) => (
            <TouchableOpacity
              key={action.id}
              style={[
                tw`flex-1 rounded-2xl p-4 border border-gray-100 shadow-sm`,
                { backgroundColor: action.backgroundColor },
              ]}
              onPress={action.onPress}
              activeOpacity={0.85}
            >
              <View
                style={[
                  tw`w-10 h-10 rounded-full items-center justify-center mb-3`,
                  { backgroundColor: action.iconBackground },
                ]}
              >
                <MaterialIcons name={action.icon} size={22} color={action.accentColor} />
              </View>
              <Text style={tw`text-sm font-semibold text-gray-900`}>{action.title}</Text>
              <Text style={tw`text-xs text-gray-600 mt-1`} numberOfLines={2}>
                {action.subtitle}
              </Text>
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
            <Text style={tw`text-sm font-semibold text-blue-500`}>View all</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <Text style={tw`text-gray-500 text-center py-8`}>Loading...</Text>
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
            <Text style={tw`text-gray-500 text-lg text-center mb-2`}>
              No generations yet
            </Text>
            <Text style={tw`text-gray-400 text-base text-center`}>
              Capture your first moment to see PopCam’s AI generation here.
            </Text>
            <TouchableOpacity
              style={tw`mt-6 bg-blue-500 px-6 py-3 rounded-full`}
              onPress={handleCameraPress}
            >
              <Text style={tw`text-white text-sm font-semibold`}>Launch camera</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
