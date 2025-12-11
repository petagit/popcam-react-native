import {
  initConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
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
    'com.popcam.credits.24',
    'com.popcam.credits.48',
    'com.popcam.credits.96',
  ];

  private creditMapping: Record<string, number> = {
    'com.popcam.credits.24': 24,
    'com.popcam.credits.48': 48,
    'com.popcam.credits.96': 96,
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
      const products: Product[] = (await fetchProducts({ skus: this.productIds })) as Product[];

      return products.map((product: any) => ({
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
      if (!productId) {
        throw new Error('Product ID is required for purchase');
      }

      console.log(`Initiating purchase for product: ${productId}`);

      const purchase = await requestPurchase({
        sku: productId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      } as any) as unknown as Purchase;

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
      await finishTransaction({ purchase, isConsumable: true });
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
      return await getAvailablePurchases();
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

