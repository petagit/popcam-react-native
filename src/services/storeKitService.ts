import {
  initConnection,
  getProducts,
  requestPurchase,
  finishTransactionIOS,
  finishTransactionAndroid,
  getPendingPurchasesIOS,
  getAvailablePurchases,
  endConnection,
  Product,
  Purchase,
} from 'react-native-iap';
import { Platform } from 'react-native';

export interface InAppProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  localizedPrice: string;
  credits: number; // Number of credits this product provides
}

class StoreKitService {
  private productIds: string[] = [
    'com.popcam.credits.10',
    'com.popcam.credits.50',
    'com.popcam.credits.100',
  ];

  private creditMapping: Record<string, number> = {
    'com.popcam.credits.10': 10,
    'com.popcam.credits.50': 50,
    'com.popcam.credits.100': 100,
  };

  /**
   * Initialize the StoreKit service
   */
  async initialize(): Promise<void> {
    try {
      const available: boolean = await initConnection();
      if (!available) {
        throw new Error('StoreKit not available on this device');
      }
    } catch (error) {
      console.error('Error initializing StoreKit:', error);
      throw error;
    }
  }

  /**
   * Fetch available products from the App Store
   */
  async getProducts(): Promise<InAppProduct[]> {
    try {
      const products: Product[] = await getProducts({ skus: this.productIds });

      return products.map((product: Product) => ({
        productId: product.productId,
        title: product.title,
        description: product.description,
        price: product.price,
        currency: product.currency || 'USD',
        localizedPrice: product.localizedPrice,
        credits: this.creditMapping[product.productId] || 0,
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Purchase a product
   */
  async purchaseProduct(productId: string): Promise<Purchase> {
    try {
      const purchase: Purchase = await requestPurchase({ sku: productId });
      return purchase;
    } catch (error) {
      console.error('Error purchasing product:', error);
      throw error;
    }
  }

  /**
   * Finish a transaction (call after successfully processing the purchase)
   */
  async finishTransaction(purchase: Purchase): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await finishTransactionIOS(purchase.transactionId);
      } else {
        await finishTransactionAndroid(purchase.purchaseToken || '', true);
      }
    } catch (error) {
      console.error('Error finishing transaction:', error);
      throw error;
    }
  }

  /**
   * Get the number of credits for a product ID
   */
  getCreditsForProduct(productId: string): number {
    return this.creditMapping[productId] || 0;
  }

  /**
   * Check if purchases are available on this device
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await initConnection();
    } catch (error) {
      console.error('Error checking StoreKit availability:', error);
      return false;
    }
  }

  /**
   * Get pending purchases (for handling interrupted purchases)
   */
  async getPendingPurchases(): Promise<Purchase[]> {
    try {
      if (Platform.OS === 'ios') {
        return await getPendingPurchasesIOS();
      } else {
        const purchases: Purchase[] = await getAvailablePurchases();
        return purchases;
      }
    } catch (error) {
      console.error('Error getting pending purchases:', error);
      return [];
    }
  }

  /**
   * Clean up connections
   */
  async cleanup(): Promise<void> {
    try {
      await endConnection();
    } catch (error) {
      console.error('Error cleaning up StoreKit:', error);
    }
  }
}

export const storeKitService = new StoreKitService();

