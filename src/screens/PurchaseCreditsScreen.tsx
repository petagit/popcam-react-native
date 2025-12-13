import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '@clerk/clerk-expo';
import tw from 'twrnc';
import { RootStackParamList } from '../types';
import {
  purchaseUpdatedListener,
  purchaseErrorListener,
  Purchase,
  PurchaseError,
  ErrorCode
} from 'react-native-iap';
import { storeKitService, InAppProduct } from '../services/storeKitService';
import { supabaseService } from '../services/supabaseService';
import { useCredits } from '../hooks/useCredits';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import GlassButton from '../components/GlassButton';
import BackButton from '../components/BackButton';
import AppBackground from '../components/AppBackground';

type PurchaseCreditsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PurchaseCredits'>;

// Display data structure to map product IDs to UI
interface ProductDisplayInfo {
  id: string;
  name: string;
  subhead: string;
  priceDisplay: string;
  perImage: string;
  features: string[];
  mostPopular?: boolean;
}

const PRODUCT_DISPLAY_INFO: Record<string, ProductDisplayInfo> = {
  'com.popcam.app.credits24': {
    id: 'com.popcam.app.credits24',
    name: '24 Credits',
    subhead: 'Generate 24 infographics',
    priceDisplay: '$6.00',
    perImage: '$0.25 per image',
    features: [
      'Generate 24 infographics',
      'High-quality AI image generation',
      'Download generated images'
    ]
  },
  'com.popcam.app.credits48': {
    id: 'com.popcam.app.credits48',
    name: '48 Credits',
    subhead: 'Exclusive access to new model + 24/7 customer support',
    priceDisplay: '$10.00',
    perImage: '$0.21 per image',
    features: [
      'Generate 48 infographics',
      'Exclusive access to new model + 24/7 customer support',
      'High-quality AI image generation',
      'Download generated images'
    ],
    mostPopular: true
  },
  'com.popcam.app.credits96': {
    id: 'com.popcam.app.credits96',
    name: '96 Credits',
    subhead: 'Exclusive access to new model + 24/7 customer support',
    priceDisplay: '$20.00',
    perImage: '$0.21 per image',
    features: [
      'Generate 96 infographics',
      'Exclusive access to new model + 24/7 customer support',
      'High-quality AI image generation',
      'Download generated images'
    ]
  }
};

export default function PurchaseCreditsScreen(): React.JSX.Element {
  const navigation = useNavigation<PurchaseCreditsScreenNavigationProp>();
  const { user } = useUser();
  const { credits, refetchCredits } = useCredits();
  const [products, setProducts] = useState<InAppProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);

  useEffect(() => {
    let purchaseUpdateSubscription: any = null;
    let purchaseErrorSubscription: any = null;

    const setupListeners = async (): Promise<void> => {
      await initializeStoreKit();

      // Set up purchase listener
      purchaseUpdateSubscription = purchaseUpdatedListener(
        async (purchase: Purchase) => {
          try {
            await processPurchase(purchase);
          } catch (error) {
            console.error('Error processing purchase update:', error);
            // Don't show alert here as it might be a listener firing for an old purchase
          }
        }
      );

      purchaseErrorSubscription = purchaseErrorListener(
        (error: PurchaseError) => {
          console.error('Purchase error:', error);
          if (error.code !== ErrorCode.UserCancelled) {
            Alert.alert('Purchase Failed', error.message || 'Failed to complete purchase.');
          }
          setPurchasingProductId(null);
        }
      );
    };

    setupListeners();

    return () => {
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
      }
      if (purchaseErrorSubscription) {
        purchaseErrorSubscription.remove();
      }
      storeKitService.cleanup().catch(() => { });
    };
  }, [user?.id, refetchCredits]);

  const initializeStoreKit = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const available: boolean = await storeKitService.isAvailable();
      setIsAvailable(available);

      if (!available) {
        // Just log, don't alert immediately on mount to avoid annoyance if offline
        console.warn('In-app purchases not available');
        return;
      }

      await storeKitService.initialize();
      const fetchedProducts: InAppProduct[] = await storeKitService.getProducts();
      setProducts(fetchedProducts);

      // Handle any pending purchases
      await handlePendingPurchases();
    } catch (error) {
      console.error('Error initializing StoreKit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePendingPurchases = async (): Promise<void> => {
    try {
      const pendingPurchases = await storeKitService.getPendingPurchases();
      if (pendingPurchases.length > 0 && user?.id) {
        for (const purchase of pendingPurchases) {
          await processPurchase(purchase);
        }
      }
    } catch (error) {
      console.error('Error handling pending purchases:', error);
    }
  };

  const handlePurchase = async (productId: string): Promise<void> => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to purchase credits.');
      return;
    }

    setPurchasingProductId(productId);

    try {
      const purchase = await storeKitService.purchaseProduct(productId);
      await processPurchase(purchase);
    } catch (error: any) {
      console.error('Purchase error:', error);
      if (error.code === ErrorCode.UserCancelled) {
        return;
      }
      Alert.alert(
        'Purchase Failed',
        error.message || 'Failed to complete purchase. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setPurchasingProductId(null);
    }
  };

  const processPurchase = useCallback(async (purchase: any): Promise<void> => {
    if (!user?.id) return;

    try {
      const creditsToAdd: number = storeKitService.getCreditsForProduct(purchase.productId);

      if (creditsToAdd === 0) {
        // Maybe log?
        return;
      }

      // Add credits to user's account
      const email: string | undefined = user.primaryEmailAddress?.emailAddress ||
        user.emailAddresses?.[0]?.emailAddress;
      await supabaseService.addCredits(user.id, creditsToAdd, email);

      // Finish the transaction
      await storeKitService.finishTransaction(purchase);

      // Refresh credits display
      await refetchCredits();

      Alert.alert(
        'Purchase Successful',
        `You've received ${creditsToAdd} credits!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error processing purchase:', error);
      throw error;
    }
  }, [user?.id, refetchCredits]);

  // Combine fetched products with display info. 
  // If fetch failed or no products, we can still show the UI for demo/development purposes 
  // if we want, or fallback to "Loading".
  // For this environment (likely sim), let's render the cards based on PRODUCT_DISPLAY_INFO
  // and match with real product if available.

  const renderProductCard = (displayInfo: ProductDisplayInfo) => {
    const realProduct = products.find(p => p.productId === displayInfo.id);
    const isPurchasing = purchasingProductId === displayInfo.id;
    const isMostPopular = displayInfo.mostPopular;

    // Use localized price if available from IAP, else fallback to display info
    const priceToShow = realProduct?.localizedPrice || displayInfo.priceDisplay;

    return (
      <View
        key={displayInfo.id}
        style={tw`bg-white rounded-3xl p-6 mb-6 shadow-sm border ${isMostPopular ? 'border-gray-900 border-2' : 'border-gray-100'
          }`}
      >
        {isMostPopular && (
          <View style={tw`absolute -top-3 self-center bg-gray-900 px-3 py-1 rounded-full`}>
            <Text style={tw`text-white text-xs font-bold uppercase tracking-wider`}>Most Popular</Text>
          </View>
        )}

        <View style={tw`mb-4`}>
          <Text style={tw`text-2xl font-bold text-gray-900 mb-1`}>{displayInfo.name}</Text>
          <Text style={tw`text-sm text-gray-500`}>{displayInfo.subhead}</Text>
        </View>

        <View style={tw`mb-6`}>
          <Text style={tw`text-3xl font-bold text-gray-900`}>{priceToShow}</Text>
          <Text style={tw`text-sm text-gray-400`}>{displayInfo.perImage}</Text>
        </View>

        <View style={tw`mb-6`}>
          {displayInfo.features.map((feature, idx) => (
            <View key={idx} style={tw`flex-row items-center mb-2`}>
              <View style={tw`w-5 h-5 rounded-full border border-green-500 items-center justify-center mr-3`}>
                <Ionicons name="checkmark" size={12} color="#22c55e" />
              </View>
              <Text style={tw`text-gray-600 text-sm flex-1`}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={tw`w-full py-4 rounded-xl items-center justify-center ${isMostPopular ? 'bg-gray-900' : 'bg-white border border-gray-200'
            } ${isPurchasing ? 'opacity-70' : ''}`}
          onPress={() => handlePurchase(displayInfo.id)}
          disabled={isPurchasing}
        >
          {isPurchasing ? (
            <ActivityIndicator color={isMostPopular ? 'white' : 'black'} />
          ) : (
            <Text style={tw`text-base font-bold ${isMostPopular ? 'text-white' : 'text-gray-900'}`}>
              Purchase Now
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <AppBackground>
      <SafeAreaView style={tw`flex-1`}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={tw`px-5 py-4`}>
          <BackButton />
        </View>

        <ScrollView style={tw`flex-1 px-5`} showsVerticalScrollIndicator={false}>
          <View style={tw`items-center mb-8 mt-2`}>
            <Text style={tw`text-3xl font-bold text-gray-900 mb-3`}>Purchase Credits</Text>
            <Text style={tw`text-center text-gray-600 leading-5`}>
              Add more credits to your account and create more stunning infographics.
              Each credit allows you to generate one infographic.
            </Text>
          </View>

          {/* Use the defined order */}
          {renderProductCard(PRODUCT_DISPLAY_INFO['com.popcam.app.credits24'])}
          {renderProductCard(PRODUCT_DISPLAY_INFO['com.popcam.app.credits48'])}
          {renderProductCard(PRODUCT_DISPLAY_INFO['com.popcam.app.credits96'])}

          <View style={tw`items-center mt-4 mb-8`}>
            <TouchableOpacity
              onPress={async () => {
                try {
                  Alert.alert('Restoring', 'Checking for previous purchases...');
                  await handlePendingPurchases();
                  Alert.alert('Restore Complete', 'We checked for any missing purchases.');
                } catch (e) {
                  Alert.alert('Error', 'Failed to restore purchases. Please try again.');
                }
              }}
              style={tw`py-3 px-6`}
            >
              <Text style={tw`text-blue-500 font-semibold text-base`}>Restore Purchases</Text>
            </TouchableOpacity>
          </View>

          <View style={tw`h-10`} />

          {/* Debug/Info for development if no products loaded */}
          {products.length === 0 && isLoading && (
            <Text style={tw`text-center text-gray-400 text-xs mb-10`}>Connecting to App Store...</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

