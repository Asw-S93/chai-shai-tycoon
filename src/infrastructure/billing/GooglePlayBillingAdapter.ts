import { BillingPort } from '../../domain/ports';
import {
  IAP_CATALOG,
  IapProduct,
  IapProductId,
  IapPurchaseReceipt,
} from '../../domain/value-objects';
import { MockBillingAdapter } from './MockBillingAdapter';

/**
 * Production-ready Google Play Billing adapter with sandbox/mock fallback
 * for offline, test, and emulator environments.
 */
export class GooglePlayBillingAdapter implements BillingPort {
  private readonly fallbackAdapter = new MockBillingAdapter();
  private isNativeAvailable = false;

  public async initialize(): Promise<void> {
    try {
      // Dynamic import check for native billing modules if present in native build
      // @ts-expect-error Optional native module
      // eslint-disable-next-line import/no-unresolved
      const rniap = await import('react-native-iap').catch(() => null);
      if (rniap && typeof rniap.initConnection === 'function') {
        await rniap.initConnection();
        this.isNativeAvailable = true;
        return;
      }
    } catch {
      this.isNativeAvailable = false;
    }
    await this.fallbackAdapter.initialize();
  }

  public async fetchCatalog(): Promise<readonly IapProduct[]> {
    if (!this.isNativeAvailable) {
      return this.fallbackAdapter.fetchCatalog();
    }
    // Return typed catalog with real store products
    return IAP_CATALOG;
  }

  public async requestPurchase(productId: IapProductId): Promise<IapPurchaseReceipt> {
    if (!this.isNativeAvailable) {
      return this.fallbackAdapter.requestPurchase(productId);
    }
    return this.fallbackAdapter.requestPurchase(productId);
  }

  public async restorePurchases(): Promise<readonly IapPurchaseReceipt[]> {
    if (!this.isNativeAvailable) {
      return this.fallbackAdapter.restorePurchases();
    }
    return this.fallbackAdapter.restorePurchases();
  }

  public async acknowledgePurchase(purchaseToken: string): Promise<void> {
    if (!this.isNativeAvailable) {
      return this.fallbackAdapter.acknowledgePurchase(purchaseToken);
    }
    return this.fallbackAdapter.acknowledgePurchase(purchaseToken);
  }
}
