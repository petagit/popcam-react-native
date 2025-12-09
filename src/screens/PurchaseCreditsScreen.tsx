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
  PurchaseError
} from 'react-native-iap';
import { storeKitService, InAppProduct } from '../services/storeKitService';
import { supabaseService } from '../services/supabaseService';
import { useCredits } from '../hooks/useCredits';
import { MaterialIcons } from '@expo/vector-icons';
import GlassButton from '../components/GlassButton';
import { LinearGradient } from 'expo-linear-gradient';

type PurchaseCreditsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PurchaseCredits'>;

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
            Alert.alert('Error', 'Failed to process purchase. Please contact support.');
          }
        }
      );

      purchaseErrorSubscription = purchaseErrorListener(
        (error: PurchaseError) => {
          console.error('Purchase error:', error);
          if (error.code !== 'E_USER_CANCELLED') {
            Alert.alert('Purchase Failed', error.message || 'Failed to complete purchase.');
          }
          setPurchasingProductId(null);
        }
      );
    };

    setupListeners();

    return () => {
      // Cleanup on unmount
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
        Alert.alert(
          'Not Available',
          'In-app purchases are not available on this device.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      await storeKitService.initialize();
      const fetchedProducts: InAppProduct[] = await storeKitService.getProducts();
      setProducts(fetchedProducts);

      // Handle any pending purchases
      await handlePendingPurchases();
    } catch (error) {
      console.error('Error initializing StoreKit:', error);
      Alert.alert(
        'Error',
        'Failed to load products. Please try again later.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePendingPurchases = async (): Promise<void> => {
    try {
      const pendingPurchases = await storeKitService.getPendingPurchases();
      if (pendingPurchases.length > 0 && user?.id) {
        // Process pending purchases
        for (const purchase of pendingPurchases) {
          await processPurchase(purchase);
        }
      }
    } catch (error) {
      console.error('Error handling pending purchases:', error);
    }
  };

  const handlePurchase = async (product: InAppProduct): Promise<void> => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to purchase credits.');
      return;
    }

    setPurchasingProductId(product.productId);

    try {
      const purchase = await storeKitService.purchaseProduct(product.productId);
      await processPurchase(purchase);
    } catch (error: any) {
      console.error('Purchase error:', error);

      // Handle user cancellation
      if (error.code === 'E_USER_CANCELLED') {
        // User cancelled, no need to show error
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
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const creditsToAdd: number = storeKitService.getCreditsForProduct(purchase.productId);

      if (creditsToAdd === 0) {
        throw new Error('Invalid product ID');
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

  const renderProductCard = (product: InAppProduct): React.JSX.Element => {
    const isPurchasing: boolean = purchasingProductId === product.productId;
    const isBestValue: boolean = product.credits >= 100;

    return (
      <TouchableOpacity
        key={product.productId}
        style={tw`mb-4 ${isPurchasing ? 'opacity-60' : ''}`}
        onPress={() => handlePurchase(product)}
        disabled={isPurchasing || !isAvailable}
        activeOpacity={0.8}
      >
        <View
          style={tw`bg-white rounded-2xl p-5 border-2 ${isBestValue ? 'border-blue-500' : 'border-gray-200'
            } shadow-sm`}
        >
          {isBestValue && (
            <View style={tw`absolute top-2 right-2 bg-blue-500 px-2 py-1 rounded-full`}>
              <Text style={tw`text-white text-xs font-bold`}>BEST VALUE</Text>
            </View>
          )}

          <View style={tw`flex-row items-center justify-between mb-3`}>
            <View style={tw`flex-1`}>
              <Text style={tw`text-xl font-bold text-gray-900`}>
                {product.credits} Credits
              </Text>
              <Text style={tw`text-sm text-gray-600 mt-1`}>
                {product.description || `Get ${product.credits} credits to use for AI analysis`}
              </Text>
            </View>
            <MaterialIcons
              name="attach-money"
              size={24}
              color={isBestValue ? '#3b82f6' : '#6b7280'}
            />
          </View>

          <View style={tw`flex-row items-center justify-between mt-4 pt-4 border-t border-gray-100`}>
            <Text style={tw`text-2xl font-bold text-gray-900`}>
              {product.localizedPrice}
            </Text>
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <View style={tw`bg-blue-500 px-4 py-2 rounded-lg`}>
                <Text style={tw`text-white font-semibold`}>Buy</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={tw`flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-200`}>
        <GlassButton size={40} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={20} color="#111827" />
        </GlassButton>

        <Text style={tw`text-lg font-semibold text-gray-800`}>Buy Credits</Text>

        <View style={tw`min-w-15`} />
      </View>

      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        {/* Current Credits Display */}
        <View style={tw`mx-4 mt-4`}>
          <LinearGradient
            colors={['#3b82f6', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={tw`rounded-2xl p-6`}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View>
                <Text style={tw`text-white text-sm opacity-90 mb-1`}>Current Balance</Text>
                <Text style={tw`text-white text-4xl font-bold`}>{credits}</Text>
                <Text style={tw`text-white text-sm opacity-80 mt-1`}>Credits</Text>
              </View>
              <MaterialIcons name="account-balance-wallet" size={48} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </View>

        {/* Products List */}
        <View style={tw`mx-4 mt-6 mb-4`}>
          {isLoading ? (
            <View style={tw`items-center justify-center py-12`}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={tw`text-gray-600 mt-4`}>Loading products...</Text>
            </View>
          ) : products.length === 0 ? (
            <View style={tw`items-center justify-center py-12`}>
              <MaterialIcons name="error-outline" size={48} color="#ef4444" />
              <Text style={tw`text-gray-600 mt-4 text-center`}>
                No products available.{'\n'}Please check your App Store Connect configuration.
              </Text>
            </View>
          ) : (
            <>
              <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
                Choose a Package
              </Text>
              {products.map((product: InAppProduct) => renderProductCard(product))}
            </>
          )}
        </View>

        {/* Info Section */}
        <View style={tw`mx-4 mb-4 p-4 bg-blue-50 rounded-xl`}>
          <View style={tw`flex-row items-start mb-2`}>
            <MaterialIcons name="info" size={20} color="#3b82f6" />
            <Text style={tw`text-sm text-blue-900 ml-2 flex-1`}>
              Credits are used to generate AI analyses and remix photos. Purchases are processed securely through the App Store.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

