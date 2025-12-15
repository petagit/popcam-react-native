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
    'com.popcam.app.credits24',
    'com.popcam.app.credits48',
    'com.popcam.app.credits96',
  ];

  private creditMapping: Record<string, number> = {
    'com.popcam.app.credits24': 24,
    'com.popcam.app.credits48': 48,
    'com.popcam.app.credits96': 96,
  };

  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the StoreKit service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const available: boolean = await initConnection();
        if (!available) {
          throw new Error('StoreKit not available on this device');
        }
        this.initialized = true;
      } catch (error) {
        console.error('Error initializing StoreKit:', error);
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Fetch available products from the App Store
   */
  async getProducts(): Promise<InAppProduct[]> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const products: Product[] = (await fetchProducts({ skus: this.productIds })) as Product[];
      console.log('Fetched products from store:', JSON.stringify(products, null, 2));

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
      if (!this.initialized) {
        await this.initialize();
      }

      if (!productId) {
        throw new Error('Product ID is required for purchase');
      }

      console.log(`Initiating purchase for product: ${productId}`);

      const purchase = await requestPurchase({
        request: {
          ios: {
            sku: productId,
            andDangerouslyFinishTransactionAutomaticallyIOS: false,
          },
          android: {
            skus: [productId],
          },
        },
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
      // If already initialized, we are connected
      if (this.initialized) return true;
      // Otherwise try to connect
      await this.initialize();
      return this.initialized;
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
      if (!this.initialized) {
        await this.initialize();
      }
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

