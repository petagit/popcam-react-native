import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '@clerk/clerk-expo';
import tw from 'twrnc';
import { RootStackParamList, ImageAnalysis } from '../types';
import { storageService } from '../services/storageService';
import CameraButton from '../components/buttons/CameraButton';
import { MaterialIcons } from '@expo/vector-icons';
import GlassButton from '../components/buttons/GlassButton';
import BackButton from '../components/buttons/BackButton';
import AppBackground from '../components/AppBackground';

type GalleryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Gallery'>;

interface GroupedAnalysis {
  title: string;
  data: ImageAnalysis[];
}

interface ListItem {
  type: 'header' | 'item';
  id: string;
  analysis?: ImageAnalysis;
  title?: string;
  count?: number;
  row?: ImageAnalysis[];
}

const { width } = Dimensions.get('window');
const ITEM_MARGIN = 4;
const NUM_COLUMNS = 3;
const ITEM_WIDTH = (width - (NUM_COLUMNS + 1) * ITEM_MARGIN * 2) / NUM_COLUMNS;

export default function GalleryScreen(): React.JSX.Element {
  const navigation = useNavigation<GalleryScreenNavigationProp>();
  const { user } = useUser();

  const [listData, setListData] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);


  useFocusEffect(
    useCallback(() => {
      loadAnalyses();
    }, [user])
  );

  const formatDateHeader = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const analysisDate = new Date(date);

    if (analysisDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (analysisDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return analysisDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  const groupAnalysesByDate = (analyses: ImageAnalysis[]): GroupedAnalysis[] => {
    const grouped = analyses.reduce((acc: { [key: string]: ImageAnalysis[] }, analysis: ImageAnalysis) => {
      const dateKey = analysis.timestamp.toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(analysis);
      return acc;
    }, {});

    return Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((dateKey: string) => ({
        title: formatDateHeader(new Date(dateKey)),
        data: grouped[dateKey].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      }));
  };

  const createFlatListData = (groupedAnalyses: GroupedAnalysis[]): ListItem[] => {
    const flatData: ListItem[] = [];

    groupedAnalyses.forEach((group: GroupedAnalysis) => {
      // Add header
      flatData.push({
        type: 'header',
        id: `header-${group.title}`,
        title: group.title,
        count: group.data.length,
      });

      // Create rows of items for this section
      const rows: ImageAnalysis[][] = [];
      for (let i = 0; i < group.data.length; i += NUM_COLUMNS) {
        rows.push(group.data.slice(i, i + NUM_COLUMNS));
      }

      // Add rows as single items
      rows.forEach((row: ImageAnalysis[], rowIndex: number) => {
        flatData.push({
          type: 'item',
          id: `row-${group.title}-${rowIndex}`,
          analysis: undefined, // We'll handle the row data differently
          title: undefined,
          count: undefined,
          row: row, // Add row data
        });
      });
    });

    return flatData;
  };

  const loadAnalyses = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Sync with cloud history first to restore any missing items
      if (user?.id) {
        try {
          await storageService.syncCloudHistory(user.id);
        } catch (syncError) {
          console.warn('Background sync failed, showing local data only:', syncError);
        }
      }

      const resolvedAnalyses: ImageAnalysis[] = await storageService.getResolvedAnalyses(user?.id);
      // Filter to only show analyses with AI generations
      const infographicAnalyses: ImageAnalysis[] = resolvedAnalyses.filter(
        (analysis: ImageAnalysis) => analysis.hasInfographic && analysis.infographicUri
      );

      const grouped: GroupedAnalysis[] = groupAnalysesByDate(resolvedAnalyses);
      const flatData: ListItem[] = createFlatListData(grouped);
      setListData(flatData);
    } catch (error) {
      console.error('Error loading analyses:', error);
      Alert.alert('Error', 'Failed to load gallery');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadAnalyses();
    setRefreshing(false);
  };

  const handleAnalysisPress = (analysis: ImageAnalysis): void => {
    navigation.navigate('GalleryImage', {
      imageUri: analysis.imageUri,
      infographicUri: analysis.infographicUri,
      showInfographicFirst: analysis.hasInfographic && !!analysis.infographicUri,
      analysisId: analysis.id,
    });
  };

  const handleDeleteAnalysis = (analysis: ImageAnalysis): void => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageService.deleteAnalysis(analysis.id, user?.id);
              await loadAnalyses(); // Refresh the list
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };



  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    if (item.type === 'header') {
      return (
        <View style={tw`px-4 py-3 bg-gray-50 border-t border-gray-200`}>
          <Text style={tw`text-lg font-semibold text-gray-800`}>{item.title}</Text>
          <Text style={tw`text-sm text-gray-500`}>
            {item.count} {item.count === 1 ? 'generation' : 'generations'}
          </Text>
        </View>
      );
    }

    if (item.type === 'item' && item.row) {
      return (
        <View style={tw`flex-row justify-start px-2 mb-1`}>
          {item.row.map((analysis: ImageAnalysis, columnIndex: number) => (
            <TouchableOpacity
              key={analysis.id}
              style={[
                tw`bg-white rounded-lg overflow-hidden shadow-sm`,
                {
                  width: ITEM_WIDTH,
                  height: ITEM_WIDTH,
                  marginLeft: columnIndex === 0 ? ITEM_MARGIN : ITEM_MARGIN / 2,
                  marginRight: columnIndex === NUM_COLUMNS - 1 ? ITEM_MARGIN : ITEM_MARGIN / 2,
                }
              ]}
              onPress={() => handleAnalysisPress(analysis)}
              onLongPress={() => handleDeleteAnalysis(analysis)}
            >
              <Image
                source={{ uri: analysis.hasInfographic && analysis.infographicUri ? analysis.infographicUri : analysis.imageUri }}
                style={tw`w-full h-full`}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
          {/* Add empty spacers if row is not full */}
          {item.row.length < NUM_COLUMNS &&
            Array.from({ length: NUM_COLUMNS - item.row.length }).map((_, emptyIndex) => (
              <View
                key={`empty-${emptyIndex}`}
                style={[
                  { width: ITEM_WIDTH, height: ITEM_WIDTH },
                  {
                    marginLeft: (item.row!.length + emptyIndex) === 0 ? ITEM_MARGIN : ITEM_MARGIN / 2,
                    marginRight: (item.row!.length + emptyIndex) === NUM_COLUMNS - 1 ? ITEM_MARGIN : ITEM_MARGIN / 2,
                  }
                ]}
              />
            ))
          }
        </View>
      );
    }

    return null;
  };

  const renderEmptyState = () => (
    <View style={tw`flex-1 justify-center items-center px-10`}>
      <Text style={tw`text-2xl font-bold text-gray-800 mb-3 text-center`}>No Generations Yet</Text>
      <Text style={tw`text-base text-gray-500 text-center leading-6 mb-8`}>
        Take your first photo and create an AI generation!
      </Text>
      <TouchableOpacity
        style={tw`bg-blue-500 px-8 py-4 rounded-xl`}
        onPress={() => navigation.navigate('Camera')}
      >
        <Text style={tw`text-white text-base font-semibold`}>Take Photo</Text>
      </TouchableOpacity>
    </View>
  );

  const itemsCount = listData
    .filter((item: ListItem) => item.type === 'item' && item.row)
    .reduce((count: number, item: ListItem) => count + (item.row?.length || 0), 0);

  return (
    <AppBackground>
      <SafeAreaView style={tw`flex-1`}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={tw`flex-row justify-between items-center px-5 py-4 border-b border-gray-200`}>
          <BackButton />

          <Text style={tw`text-lg font-semibold text-gray-800`}>Gallery</Text>

          <CameraButton onPress={() => navigation.navigate('Camera')} />
        </View>

        {itemsCount === 0 && !isLoading ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={listData}
            renderItem={renderItem}
            keyExtractor={(item: ListItem) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`pb-5`}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3498db']}
                tintColor="#3498db"
              />
            }
          />
        )}


      </SafeAreaView>
    </AppBackground>
  );
}
