import { BillingPort } from '../../domain/ports';
import {
  IAP_CATALOG,
  IAP_PRODUCT_BY_ID,
  IapProduct,
  IapProductId,
  IapPurchaseReceipt,
} from '../../domain/value-objects';

export class MockBillingAdapter implements BillingPort {
  private isConnected = false;
  private readonly acknowledgedTokens = new Set<string>();
  private readonly restoredReceipts: IapPurchaseReceipt[] = [];

  public async initialize(): Promise<void> {
    this.isConnected = true;
  }

  public async fetchCatalog(): Promise<readonly IapProduct[]> {
    return IAP_CATALOG;
  }

  public async requestPurchase(productId: IapProductId): Promise<IapPurchaseReceipt> {
    if (!this.isConnected) {
      await this.initialize();
    }
    const product = IAP_PRODUCT_BY_ID[productId];
    if (!product) {
      throw new Error(`Product not found in catalog: ${productId}`);
    }

    const receipt: IapPurchaseReceipt = {
      productId,
      transactionId: `mock_tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      purchaseToken: `mock_tok_${productId}_${Date.now()}`,
      purchaseTimeMs: Date.now(),
    };

    if (product.type === 'non_consumable') {
      this.restoredReceipts.push(receipt);
    }

    return receipt;
  }

  public async restorePurchases(): Promise<readonly IapPurchaseReceipt[]> {
    return [...this.restoredReceipts];
  }

  public async acknowledgePurchase(purchaseToken: string): Promise<void> {
    this.acknowledgedTokens.add(purchaseToken);
  }

  public isTokenAcknowledged(token: string): boolean {
    return this.acknowledgedTokens.has(token);
  }
}
