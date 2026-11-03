import {
  BillingPort,
  FeedbackPort,
  PlayerSaveSnapshot,
  SaveRepositoryPort,
} from '../../domain/ports';
import {
  IAP_PRODUCT_BY_ID,
  IapProductId,
  IapPurchaseResult,
} from '../../domain/value-objects';

export class PurchaseProductUseCase {
  constructor(
    private readonly billing: BillingPort,
    private readonly saveRepo: SaveRepositoryPort,
    private readonly feedback?: FeedbackPort,
  ) {}

  public async execute(params: {
    productId: IapProductId;
    currentSnapshot: PlayerSaveSnapshot;
    onSuccess: (newCoins: number, updatedSnapshot: PlayerSaveSnapshot) => void;
  }): Promise<IapPurchaseResult> {
    const product = IAP_PRODUCT_BY_ID[params.productId];
    if (!product) {
      return {
        success: false,
        productId: params.productId,
        coinsAwarded: 0,
        error: `Unknown product: ${params.productId}`,
      };
    }

    try {
      const receipt = await this.billing.requestPurchase(params.productId);

      // Idempotency check: don't double award if transaction was already processed
      const isDuplicate = params.currentSnapshot.processedTransactionIds.includes(
        receipt.transactionId,
      );

      if (isDuplicate) {
        await this.billing.acknowledgePurchase(receipt.purchaseToken);
        return {
          success: true,
          productId: params.productId,
          coinsAwarded: 0,
        };
      }

      const newCoins = params.currentSnapshot.coins + product.coinsReward;
      const updatedEntitlements = [
        ...(params.currentSnapshot.ownedEntitlements ?? []),
      ];
      if (
        product.type === 'non_consumable' &&
        !updatedEntitlements.includes(product.id)
      ) {
        updatedEntitlements.push(product.id);
      }

      const updatedSnapshot: PlayerSaveSnapshot = {
        ...params.currentSnapshot,
        coins: newCoins,
        processedTransactionIds: [
          ...params.currentSnapshot.processedTransactionIds,
          receipt.transactionId,
        ],
        ownedEntitlements: updatedEntitlements,
      };

      await this.saveRepo.recordIapPurchase({
        transactionId: receipt.transactionId,
        productId: params.productId,
        coinsAwarded: product.coinsReward,
        newCoinBalance: newCoins,
        entitlementAdded:
          product.type === 'non_consumable' ? product.id : undefined,
      });

      await this.billing.acknowledgePurchase(receipt.purchaseToken);

      if (this.feedback) {
        void this.feedback.playSound('upgrade_buy');
        void this.feedback.triggerHaptic('success');
      }

      params.onSuccess(newCoins, updatedSnapshot);

      return {
        success: true,
        productId: params.productId,
        coinsAwarded: product.coinsReward,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (this.feedback) {
        void this.feedback.triggerHaptic('error');
      }
      return {
        success: false,
        productId: params.productId,
        coinsAwarded: 0,
        error: errorMsg,
      };
    }
  }
}

export class RestorePurchasesUseCase {
  constructor(
    private readonly billing: BillingPort,
    private readonly saveRepo: SaveRepositoryPort,
  ) {}

  public async execute(params: {
    currentSnapshot: PlayerSaveSnapshot;
    onRestored: (updatedSnapshot: PlayerSaveSnapshot) => void;
  }): Promise<{ restoredCount: number }> {
    const receipts = await this.billing.restorePurchases();
    let restoredCount = 0;
    let runningSnapshot = { ...params.currentSnapshot };

    for (const r of receipts) {
      const product = IAP_PRODUCT_BY_ID[r.productId];
      if (!product) continue;

      const alreadyHas =
        runningSnapshot.ownedEntitlements?.includes(product.id) ||
        runningSnapshot.processedTransactionIds.includes(r.transactionId);

      if (!alreadyHas) {
        const newCoins = runningSnapshot.coins + product.coinsReward;
        const newEntitlements = [
          ...(runningSnapshot.ownedEntitlements ?? []),
          product.id,
        ];
        runningSnapshot = {
          ...runningSnapshot,
          coins: newCoins,
          ownedEntitlements: newEntitlements,
          processedTransactionIds: [
            ...runningSnapshot.processedTransactionIds,
            r.transactionId,
          ],
        };
        await this.saveRepo.recordIapPurchase({
          transactionId: r.transactionId,
          productId: r.productId,
          coinsAwarded: product.coinsReward,
          newCoinBalance: newCoins,
          entitlementAdded: product.id,
        });
        await this.billing.acknowledgePurchase(r.purchaseToken);
        restoredCount++;
      }
    }

    if (restoredCount > 0) {
      params.onRestored(runningSnapshot);
    }

    return { restoredCount };
  }
}
