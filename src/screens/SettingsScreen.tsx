import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser, useClerk } from '@clerk/clerk-expo';
import tw from 'twrnc';
import { RootStackParamList } from '../types';
import { storageService } from '../services/storageService';
import { supabaseService } from '../services/supabaseService';
import { MaterialIcons } from '@expo/vector-icons';
import GlassButton from '../components/buttons/GlassButton';
import BackButton from '../components/buttons/BackButton';
import AppBackground from '../components/AppBackground';
import { useCredits } from '../hooks/useCredits';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface UserPreferences {
  autoSave: boolean;
  highQuality: boolean;
  showTags: boolean;
  cloudStorage: boolean;
}

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { credits, isLoading: creditsLoading } = useCredits();
  const [preferences, setPreferences] = useState<UserPreferences>({
    autoSave: true,
    highQuality: false,
    showTags: true,
    cloudStorage: false,
  });
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async (): Promise<void> => {
    try {
      // Load user preferences
      const savedPreferences = await storageService.getUserPreferences();
      if (savedPreferences && Object.keys(savedPreferences).length > 0) {
        setPreferences(prev => ({ ...prev, ...savedPreferences }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handlePreferenceChange = async (key: keyof UserPreferences, value: boolean): Promise<void> => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    // Save preferences immediately
    try {
      await storageService.saveUserPreferences(newPreferences);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const handleClearAllData = async (): Promise<void> => {
    Alert.alert(
      'Clear All Data',
      'This will delete all photos and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageService.clearAllData();
              setPreferences({
                autoSave: true,
                highQuality: false,
                showTags: true,
                cloudStorage: false,
              });
              Alert.alert('Success', 'All data cleared successfully');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = (): void => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will permanently delete:\n\n• Your account and profile\n• All your photos\n• Your credits and preferences\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete your account and all associated data. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    await performAccountDeletion();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const performAccountDeletion = async (): Promise<void> => {
    if (!user?.id) {
      Alert.alert('Error', 'No user account found');
      return;
    }

    setIsDeletingAccount(true);

    try {
      const userId: string = user.id;

      // 1. Delete user data from Supabase
      try {
        await supabaseService.deleteUserAccount(userId);
      } catch (supabaseError) {
        console.error('Error deleting from Supabase:', supabaseError);
        // Continue with other deletions even if Supabase fails
      }

      // 2. Delete local storage data
      try {
        await storageService.clearUserData(userId);
      } catch (storageError) {
        console.error('Error clearing local storage:', storageError);
        // Continue with account deletion even if local storage fails
      }

      // 3. Delete Clerk account (this will sign out the user automatically)
      try {
        await user.delete();
      } catch (clerkError) {
        console.error('Error deleting Clerk account:', clerkError);
        // If Clerk deletion fails, try to sign out anyway
        try {
          await signOut();
        } catch (signOutError) {
          console.error('Error signing out:', signOutError);
        }
        Alert.alert(
          'Account Deletion',
          'Some data may not have been fully deleted. Please contact support if you need assistance.',
          [{ text: 'OK' }]
        );
        return;
      }

      // 4. Sign out (should happen automatically, but ensure it)
      try {
        await signOut();
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
      }

      // Navigation will be handled automatically by auth state change
    } catch (error) {
      console.error('Error during account deletion:', error);
      Alert.alert(
        'Error',
        'Failed to delete account. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <AppBackground>
      <SafeAreaView style={tw`flex-1`}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={tw`flex-row justify-between items-center px-5 py-4 border-b border-gray-200`}>
          <BackButton />

          <Text style={tw`text-lg font-semibold text-gray-800`}>Settings</Text>

          <View style={tw`min-w-15`} />
        </View>

        <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
          {/* Preferences Section */}
          <View style={tw`bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm`}>
            <Text style={tw`text-lg font-bold text-gray-800 mb-4`}>Preferences</Text>

            <View style={tw`flex-row items-center py-3 border-b border-gray-100`}>
              <View style={tw`flex-1 mr-4`}>
                <Text style={tw`text-base font-medium text-gray-800 mb-1`}>Auto-save Photos</Text>
                <Text style={tw`text-sm text-gray-600 leading-4`}>
                  Automatically save AI photos locally
                </Text>
              </View>
              <Switch
                value={preferences.autoSave}
                onValueChange={(value: boolean) => handlePreferenceChange('autoSave', value)}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={tw`flex-row items-center py-3 border-b border-gray-100`}>
              <View style={tw`flex-1 mr-4`}>
                <Text style={tw`text-base font-medium text-gray-800 mb-1`}>High Quality Images</Text>
                <Text style={tw`text-sm text-gray-600 leading-4`}>
                  Send higher quality images for photos (uses more data)
                </Text>
              </View>
              <Switch
                value={preferences.highQuality}
                onValueChange={(value: boolean) => handlePreferenceChange('highQuality', value)}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={tw`flex-row items-center py-3`}>
              <View style={tw`flex-1 mr-4`}>
                <Text style={tw`text-base font-medium text-gray-800 mb-1`}>Show Tags</Text>
                <Text style={tw`text-sm text-gray-600 leading-4`}>
                  Display AI-generated tags with photos
                </Text>
              </View>
              <Switch
                value={preferences.showTags}
                onValueChange={(value: boolean) => handlePreferenceChange('showTags', value)}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={tw`flex-row items-center py-3`}>
              <View style={tw`flex-1 mr-4`}>
                <Text style={tw`text-base font-medium text-gray-800 mb-1`}>Cloud Storage</Text>
                <Text style={tw`text-sm text-gray-600 leading-4`}>
                  Backup generated images to the cloud
                </Text>
              </View>
              <Switch
                value={preferences.cloudStorage}
                onValueChange={(value: boolean) => handlePreferenceChange('cloudStorage', value)}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Credits Section */}
          {user && (
            <View style={tw`bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm`}>
              <View style={tw`flex-row justify-between items-center mb-4`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>Credits</Text>
                <View style={tw`flex-row items-center bg-gray-100 px-3 py-1 rounded-full`}>
                  <MaterialIcons name="bolt" size={16} color="#4b5563" style={tw`mr-1`} />
                  <Text style={tw`font-semibold text-gray-900`}>
                    {creditsLoading ? '...' : credits}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={tw`py-3 px-4 bg-blue-500 rounded-lg`}
                onPress={() => navigation.navigate('PurchaseCredits')}
              >
                <View style={tw`flex-row items-center justify-center`}>
                  <MaterialIcons name="shopping-cart" size={20} color="#FFFFFF" />
                  <Text style={tw`text-white text-center font-semibold ml-2`}>Buy More Credit</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Data Management */}
          <View style={tw`bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm`}>
            <Text style={tw`text-lg font-bold text-gray-800 mb-4`}>Data Management</Text>

            <TouchableOpacity
              style={tw`py-3 px-4 bg-orange-500 rounded-lg mb-3`}
              onPress={handleClearAllData}
            >
              <Text style={tw`text-white text-center font-semibold`}>Clear All Data</Text>
            </TouchableOpacity>

            {user && (
              <TouchableOpacity
                style={tw`py-3 px-4 bg-red-600 rounded-lg ${isDeletingAccount ? 'opacity-60' : ''}`}
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                <Text style={tw`text-white text-center font-semibold`}>
                  {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* About Section */}
          <View style={tw`bg-white mx-4 mt-4 mb-4 p-4 rounded-xl shadow-sm`}>
            <Text style={tw`text-lg font-bold text-gray-800 mb-4`}>About</Text>
            <Text style={tw`text-sm text-gray-600 leading-5`}>
              PopCam v1.0.0{'\n'}
              AI-powered photos app{'\n'}
              Built with React Native & OpenAI
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}