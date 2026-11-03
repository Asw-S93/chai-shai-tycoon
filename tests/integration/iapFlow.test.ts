import {
  PurchaseProductUseCase,
  RestorePurchasesUseCase,
} from '../../src/application/use-cases';
import {
  FeedbackPort,
  PlayerSaveSnapshot,
  SaveRepositoryPort,
} from '../../src/domain/ports';
import { IAP_CATALOG } from '../../src/domain/value-objects';
import { MockBillingAdapter } from '../../src/infrastructure/billing/MockBillingAdapter';
import { createSeededSaveSnapshot } from '../../src/infrastructure/persistence/schemas';

describe('In-App Purchases (IAP) Flow Integration Tests (tests/integration/iapFlow.test.ts)', () => {
  const noopFeedback: FeedbackPort = {
    playSound: jest.fn(),
    triggerHaptic: jest.fn(),
    setSoundEnabled: jest.fn(),
    setHapticsEnabled: jest.fn(),
  };

  function createMemorySaveRepo(initial?: PlayerSaveSnapshot): SaveRepositoryPort & {
    recordedIapPurchases: any[];
    currentState: PlayerSaveSnapshot;
  } {
    let currentState: PlayerSaveSnapshot = initial ?? createSeededSaveSnapshot();
    const recordedIapPurchases: any[] = [];

    return {
      recordedIapPurchases,
      get currentState() {
        return currentState;
      },
      initialize: jest.fn().mockResolvedValue(undefined),
      loadSave: jest.fn().mockImplementation(async () => currentState),
      saveProgress: jest.fn().mockImplementation(async (s: PlayerSaveSnapshot) => {
        currentState = s;
      }),
      recordUpgradePurchase: jest.fn().mockResolvedValue(true),
      recordIapPurchase: jest.fn().mockImplementation(async (params) => {
        recordedIapPurchases.push(params);
        currentState = {
          ...currentState,
          coins: params.newCoinBalance,
          processedTransactionIds: [
            ...currentState.processedTransactionIds,
            params.transactionId,
          ],
          ownedEntitlements: params.entitlementAdded
            ? [...(currentState.ownedEntitlements ?? []), params.entitlementAdded]
            : currentState.ownedEntitlements,
        };
        return true;
      }),
      recordOrderServed: jest.fn().mockResolvedValue(true),
      recordSessionCompleted: jest.fn().mockResolvedValue(undefined),
      updateSettings: jest.fn().mockResolvedValue(undefined),
    };
  }

  test('1. MockBillingAdapter initializes catalog matching IAP_CATALOG', async () => {
    const billing = new MockBillingAdapter();
    await billing.initialize();
    const catalog = await billing.fetchCatalog();

    expect(catalog).toHaveLength(4);
    expect(catalog.map((p) => p.id)).toEqual(IAP_CATALOG.map((p) => p.id));
  });

  test('2. Purchasing consumable cs_coins_pot awards 500 coins and records receipt', async () => {
    const billing = new MockBillingAdapter();
    await billing.initialize();
    const saveRepo = createMemorySaveRepo();
    const purchaseUseCase = new PurchaseProductUseCase(billing, saveRepo, noopFeedback);

    const initialSnapshot = saveRepo.currentState;
    expect(initialSnapshot.coins).toBe(100);

    let updatedSnapshot: PlayerSaveSnapshot = initialSnapshot;
    const result = await purchaseUseCase.execute({
      productId: 'cs_coins_pot',
      currentSnapshot: initialSnapshot,
      onSuccess: (_coins, snap) => {
        updatedSnapshot = snap;
      },
    });

    expect(result.success).toBe(true);
    expect(result.coinsAwarded).toBe(500);
    expect(updatedSnapshot.coins).toBe(600);
    expect(saveRepo.recordedIapPurchases).toHaveLength(1);
    expect(saveRepo.recordedIapPurchases[0].productId).toBe('cs_coins_pot');
    expect(saveRepo.recordedIapPurchases[0].coinsAwarded).toBe(500);
    expect(saveRepo.recordedIapPurchases[0].newCoinBalance).toBe(600);
  });

  test('3. Duplicate transactionId is handled idempotently without double-crediting coins', async () => {
    const billing = new MockBillingAdapter();
    await billing.initialize();
    const saveRepo = createMemorySaveRepo();
    const purchaseUseCase = new PurchaseProductUseCase(billing, saveRepo, noopFeedback);

    // Initial purchase
    const snap1 = saveRepo.currentState;
    let snap2 = snap1;
    await purchaseUseCase.execute({
      productId: 'cs_coins_pouch',
      currentSnapshot: snap1,
      onSuccess: (_coins, snap) => {
        snap2 = snap;
      },
    });

    expect(snap2.coins).toBe(250); // 100 + 150
    const txId = saveRepo.recordedIapPurchases[0].transactionId;

    // Simulate duplicate request returning the same transactionId
    jest.spyOn(billing, 'requestPurchase').mockResolvedValueOnce({
      productId: 'cs_coins_pouch',
      transactionId: txId,
      purchaseToken: 'token_dup',
      purchaseTimeMs: Date.now(),
    });

    let snap3 = snap2;
    const duplicateResult = await purchaseUseCase.execute({
      productId: 'cs_coins_pouch',
      currentSnapshot: snap2,
      onSuccess: (_coins, snap) => {
        snap3 = snap;
      },
    });

    expect(duplicateResult.success).toBe(true);
    expect(duplicateResult.coinsAwarded).toBe(0);
    expect(snap3.coins).toBe(250); // Not incremented again
  });

  test('4. Purchasing non-consumable cs_bundle_starter records entitlement', async () => {
    const billing = new MockBillingAdapter();
    await billing.initialize();
    const saveRepo = createMemorySaveRepo();
    const purchaseUseCase = new PurchaseProductUseCase(billing, saveRepo, noopFeedback);

    let current = saveRepo.currentState;
    const result = await purchaseUseCase.execute({
      productId: 'cs_bundle_starter',
      currentSnapshot: current,
      onSuccess: (_coins, snap) => {
        current = snap;
      },
    });

    expect(result.success).toBe(true);
    expect(result.coinsAwarded).toBe(300);
    expect(current.coins).toBe(400);
    expect(current.ownedEntitlements).toContain('cs_bundle_starter');
    expect(saveRepo.recordedIapPurchases[0].entitlementAdded).toBe('cs_bundle_starter');
  });

  test('5. RestorePurchasesUseCase restores uncredited store receipts', async () => {
    const billing = new MockBillingAdapter();
    await billing.initialize();

    // Mock billing returning a previously purchased starter pack
    jest.spyOn(billing, 'restorePurchases').mockResolvedValueOnce([
      {
        productId: 'cs_bundle_starter',
        transactionId: 'tx_restored_1',
        purchaseToken: 'tok_restored_1',
        purchaseTimeMs: Date.now() - 5000,
      },
    ]);

    const saveRepo = createMemorySaveRepo();
    const restoreUseCase = new RestorePurchasesUseCase(billing, saveRepo);

    let restoredSnapshot: PlayerSaveSnapshot | null = null;
    const result = await restoreUseCase.execute({
      currentSnapshot: saveRepo.currentState,
      onRestored: (snap) => {
        restoredSnapshot = snap;
      },
    });

    expect(result.restoredCount).toBe(1);
    expect(restoredSnapshot).not.toBeNull();
    expect(restoredSnapshot!.coins).toBe(400); // 100 + 300
    expect(restoredSnapshot!.ownedEntitlements).toContain('cs_bundle_starter');
    expect(restoredSnapshot!.processedTransactionIds).toContain('tx_restored_1');
  });
});
