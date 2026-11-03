import { DEFAULT_SESSION_CONFIG, LEVEL_THRESHOLDS, SessionConfig } from '../../content/levels';
import { RECIPE_BY_ID, RECIPES_CATALOG } from '../../content/recipes';
import { UPGRADE_BY_ID, UPGRADES_CATALOG } from '../../content/upgrades';
import {
  BrewStation,
  Inventory,
  Order,
  UpgradeState,
  Wallet,
} from '../../domain/entities';
import { GameEvent, GameEventListener } from '../../domain/events';
import {
  BillingPort,
  ClockPort,
  FeedbackPort,
  PlayerSaveSnapshot,
  RandomPort,
  SaveRepositoryPort,
} from '../../domain/ports';
import { BrewingRules, EconomyRules, QueueRules } from '../../domain/services';
import {
  IAP_CATALOG,
  IapProductId,
  IapPurchaseResult,
  IngredientId,
  RecipeId,
  StationId,
  UpgradeId,
} from '../../domain/value-objects';
import {
  FloatingFeedbackItem,
  GameUiSnapshot,
  OrderViewModel,
  SessionSummaryDTO,
  StationViewModel,
  UpgradeViewModel,
} from '../dto';
import {
  BuyUpgradeUseCase,
  CreateOrderUseCase,
  PurchaseProductUseCase,
  RestorePurchasesUseCase,
  RestockIngredientUseCase,
  ServeOrderUseCase,
  StartBrewUseCase,
} from '../use-cases';

export type SnapshotListener = (snapshot: GameUiSnapshot) => void;

/**
 * Fixed-timestep deterministic Game Engine & Session Coordinator.
 * - Fixed step: 50ms
 * - Max catch-up steps per frame: 5 (250ms) to prevent spiral of death on lag/background
 * - Throttles UI snapshot publishing so React never rerenders on every internal tick unless state changed or 100ms elapsed.
 */
export class GameEngine {
  public static readonly FIXED_STEP_MS = 50;
  public static readonly MAX_CATCHUP_STEPS = 5;
  public static readonly UI_SNAPSHOT_THROTTLE_MS = 100;

  private readonly clock: ClockPort;
  private readonly random: RandomPort;
  private readonly saveRepo: SaveRepositoryPort;
  private readonly feedback: FeedbackPort;
  private readonly config: SessionConfig;

  private readonly billing?: BillingPort;
  private readonly purchaseProductUseCase?: PurchaseProductUseCase;
  private readonly restorePurchasesUseCase?: RestorePurchasesUseCase;
  private ownedEntitlements: string[] = [];
  private isIapPurchasing: boolean = false;

  private wallet: Wallet;
  private inventory: Inventory;
  private upgrades: UpgradeState;
  private xp: number = 0;
  private level: number = 1;
  private lifetimeOrdersServed: number = 0;
  private tutorialCompleted: boolean = false;
  private settings = {
    soundEnabled: true,
    hapticsEnabled: true,
    lowMotionEnabled: false,
  };

  private stations: Record<StationId, BrewStation>;
  private activeOrders: Order[] = [];
  private selectedRecipeId: RecipeId = 'cutting';
  private selectedReadyStationId: StationId | null = null;

  private sessionActive: boolean = false;
  private isPaused: boolean = false;
  private sessionId: string = 'session_0';
  private sessionStartedIso: string = '';
  private sessionElapsedMs: number = 0;
  private timeSinceLastSpawnMs: number = 0;
  private firstOrderSpawned: boolean = false;
  private wasRushHour: boolean = false;

  // Current session scorecard stats
  private sessionOrdersServed: number = 0;
  private sessionOrdersExpired: number = 0;
  private sessionCoinsEarned: number = 0;
  private sessionTipsEarned: number = 0;
  private sessionXpEarned: number = 0;
  private sessionSatisfactionSum: number = 0;
  private lastSessionSummary: SessionSummaryDTO | null = null;

  // Floating feedback banners/popups
  private feedbackItems: FloatingFeedbackItem[] = [];

  // Fixed-step accumulator
  private lastWallClockMs: number = 0;
  private accumulatorMs: number = 0;
  private timeSinceLastUiPublishMs: number = 0;
  private dirtyUiFlag: boolean = true;

  private readonly eventListeners = new Set<GameEventListener>();
  private readonly snapshotListeners = new Set<SnapshotListener>();

  constructor(params: {
    clock: ClockPort;
    random: RandomPort;
    saveRepo: SaveRepositoryPort;
    feedback: FeedbackPort;
    billing?: BillingPort;
    config?: Partial<SessionConfig>;
  }) {
    this.clock = params.clock;
    this.random = params.random;
    this.saveRepo = params.saveRepo;
    this.feedback = params.feedback;
    this.billing = params.billing;
    this.config = { ...DEFAULT_SESSION_CONFIG, ...params.config };

    if (this.billing) {
      this.purchaseProductUseCase = new PurchaseProductUseCase(
        this.billing,
        this.saveRepo,
        this.feedback
      );
      this.restorePurchasesUseCase = new RestorePurchasesUseCase(
        this.billing,
        this.saveRepo
      );
    }

    this.wallet = new Wallet(100);
    this.upgrades = new UpgradeState();
    this.inventory = new Inventory(undefined, this.config.baseStorageCapacity);
    this.stations = {
      station_1: new BrewStation({ id: 'station_1', state: 'Idle' }),
      station_2: new BrewStation({ id: 'station_2', state: 'Locked' }),
    };
  }

  public async initializeFromStorage(): Promise<GameUiSnapshot> {
    await this.saveRepo.initialize();
    if (this.billing) {
      await this.billing.initialize();
    }
    const saved = await this.saveRepo.loadSave();
    this.hydrateFromSnapshot(saved);
    this.publishSnapshotNow();
    return this.buildUiSnapshot();
  }

  public hydrateFromSnapshot(saved: PlayerSaveSnapshot): void {
    this.wallet = new Wallet(saved.coins, saved.processedTransactionIds);
    this.xp = saved.xp;
    this.level = EconomyRules.calculateLevelFromXp(this.xp, LEVEL_THRESHOLDS);
    this.lifetimeOrdersServed = saved.lifetimeOrdersServed;
    this.tutorialCompleted = saved.tutorialCompleted;
    this.upgrades = new UpgradeState(saved.upgrades);
    this.ownedEntitlements = [...(saved.ownedEntitlements ?? [])];

    const maxCap = EconomyRules.calculateStorageCapacity(
      this.config.baseStorageCapacity,
      this.upgrades,
      UPGRADE_BY_ID.larger_storage
    );
    this.inventory = new Inventory(saved.inventory, maxCap);

    // Ensure tutorial has enough free inventory for at least 3 Cutting Chai orders
    if (this.lifetimeOrdersServed < this.config.tutorialFreeOrdersCount) {
      if (this.inventory.getStock('tea') < 3) this.inventory.addStock('tea', 3);
      if (this.inventory.getStock('milk') < 3) this.inventory.addStock('milk', 3);
      if (this.inventory.getStock('sugar') < 3) this.inventory.addStock('sugar', 3);
    }

    this.settings = { ...saved.settings };
    this.feedback.setSoundEnabled(this.settings.soundEnabled);
    this.feedback.setHapticsEnabled(this.settings.hapticsEnabled);

    const secondUnlocked = BrewingRules.isSecondBurnerUnlocked(this.upgrades);
    this.stations = {
      station_1: new BrewStation({ id: 'station_1', state: 'Idle' }),
      station_2: new BrewStation({
        id: 'station_2',
        state: secondUnlocked ? 'Idle' : 'Locked',
      }),
    };
    this.dirtyUiFlag = true;
  }

  public exportSaveSnapshot(): PlayerSaveSnapshot {
    return {
      coins: this.wallet.coins,
      xp: this.xp,
      level: this.level,
      lifetimeOrdersServed: this.lifetimeOrdersServed,
      tutorialCompleted: this.tutorialCompleted,
      inventory: this.inventory.getSnapshot(),
      upgrades: this.upgrades.getSnapshot(),
      settings: { ...this.settings },
      processedTransactionIds: [...this.wallet.processedTransactionIds],
      ownedEntitlements: [...this.ownedEntitlements],
    };
  }

  public onEvent(listener: GameEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public onSnapshot(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    return () => this.snapshotListeners.delete(listener);
  }

  /**
   * Starts a new 3-minute gameplay shift.
   */
  public startSession(): void {
    this.sessionActive = true;
    this.isPaused = false;
    this.sessionId = this.random.nextId('sess');
    this.sessionStartedIso = new Date(this.clock.nowMs()).toISOString();
    this.sessionElapsedMs = 0;
    this.timeSinceLastSpawnMs = 0;
    this.firstOrderSpawned = false;
    this.wasRushHour = false;

    this.sessionOrdersServed = 0;
    this.sessionOrdersExpired = 0;
    this.sessionCoinsEarned = 0;
    this.sessionTipsEarned = 0;
    this.sessionXpEarned = 0;
    this.sessionSatisfactionSum = 0;
    this.activeOrders = [];
    this.feedbackItems = [];
    this.selectedReadyStationId = null;

    // Reset stations to Idle (or Locked if station_2 not owned)
    const secondUnlocked = BrewingRules.isSecondBurnerUnlocked(this.upgrades);
    this.stations = {
      station_1: new BrewStation({ id: 'station_1', state: 'Idle' }),
      station_2: new BrewStation({
        id: 'station_2',
        state: secondUnlocked ? 'Idle' : 'Locked',
      }),
    };

    // Ensure tutorial players have ingredients for 3 Cutting Chai orders
    if (this.lifetimeOrdersServed < this.config.tutorialFreeOrdersCount) {
      if (this.inventory.getStock('tea') < 3) this.inventory.addStock('tea', 5);
      if (this.inventory.getStock('milk') < 3) this.inventory.addStock('milk', 5);
      if (this.inventory.getStock('sugar') < 3) this.inventory.addStock('sugar', 5);
    }

    this.lastWallClockMs = this.clock.nowMs();
    this.accumulatorMs = 0;
    this.publishSnapshotNow();
  }

  public pauseSession(): void {
    if (!this.sessionActive || this.isPaused) return;
    this.isPaused = true;
    this.accumulatorMs = 0;
    this.publishSnapshotNow();
    void this.saveRepo.saveProgress(this.exportSaveSnapshot());
  }

  public resumeSession(): void {
    if (!this.sessionActive || !this.isPaused) return;
    this.isPaused = false;
    this.lastWallClockMs = this.clock.nowMs();
    this.accumulatorMs = 0;
    this.publishSnapshotNow();
  }

  /**
   * Advances simulation based on wall clock delta using fixed 50ms steps and bounded catch-up.
   */
  public updateFromWallClock(): void {
    if (!this.sessionActive || this.isPaused) {
      return;
    }
    const now = this.clock.nowMs();
    const rawDelta = Math.max(0, now - this.lastWallClockMs);
    this.lastWallClockMs = now;

    // Bound catchup to avoid spiral of death if thread hiccups
    const boundedDelta = Math.min(
      rawDelta,
      GameEngine.FIXED_STEP_MS * GameEngine.MAX_CATCHUP_STEPS
    );
    this.accumulatorMs += boundedDelta;

    let stepsExecuted = 0;
    while (
      this.accumulatorMs >= GameEngine.FIXED_STEP_MS &&
      stepsExecuted < GameEngine.MAX_CATCHUP_STEPS &&
      this.sessionActive &&
      !this.isPaused
    ) {
      this.stepFixed(GameEngine.FIXED_STEP_MS);
      this.accumulatorMs -= GameEngine.FIXED_STEP_MS;
      stepsExecuted++;
    }

    this.timeSinceLastUiPublishMs += boundedDelta;
    if (
      this.dirtyUiFlag ||
      this.timeSinceLastUiPublishMs >= GameEngine.UI_SNAPSHOT_THROTTLE_MS
    ) {
      this.publishSnapshotNow();
    }
  }

  /**
   * Executes one deterministic fixed simulation step (default 50ms).
   * Can also be called directly by deterministic unit/integration tests.
   */
  public stepFixed(stepMs: number = GameEngine.FIXED_STEP_MS): void {
    if (!this.sessionActive || this.isPaused) {
      return;
    }

    this.sessionElapsedMs += stepMs;
    this.timeSinceLastSpawnMs += stepMs;

    // 1. Check Rush Hour transitions (90s -> 120s)
    const isNowRush = QueueRules.isRushHour(this.sessionElapsedMs);
    if (isNowRush && !this.wasRushHour) {
      this.wasRushHour = true;
      this.dirtyUiFlag = true;
      this.pushFeedback('RUSH HOUR! 2x Customers!', 'rush');
      this.emit({ type: 'RUSH_HOUR_STARTED', timestampMs: this.sessionElapsedMs });
      void this.feedback.playSound('rush_hour');
      void this.feedback.triggerHaptic('heavy');
    } else if (!isNowRush && this.wasRushHour) {
      this.wasRushHour = false;
      this.dirtyUiFlag = true;
      this.pushFeedback('Rush Hour Ended', 'info');
      this.emit({ type: 'RUSH_HOUR_ENDED', timestampMs: this.sessionElapsedMs });
    }

    // 2. Spawn customers
    if (!this.firstOrderSpawned && this.sessionElapsedMs >= this.config.firstCustomerDelayMs) {
      this.firstOrderSpawned = true;
      this.timeSinceLastSpawnMs = 0;
      this.spawnCustomerOrder();
    } else if (this.firstOrderSpawned) {
      const effectiveInterval = QueueRules.calculateEffectiveSpawnIntervalMs(
        this.config.baseSpawnIntervalMs,
        this.sessionElapsedMs
      );
      if (this.timeSinceLastSpawnMs >= effectiveInterval) {
        this.timeSinceLastSpawnMs = 0;
        this.spawnCustomerOrder();
      }
    }

    // 3. Advance brewing stations
    (Object.values(this.stations) as BrewStation[]).forEach((station) => {
      const completedJustNow = station.tick(stepMs);
      if (completedJustNow && station.activeRecipeId && station.brewJobId) {
        this.dirtyUiFlag = true;
        if (!this.selectedReadyStationId) {
          this.selectedReadyStationId = station.id;
        }
        this.emit({
          type: 'BREW_COMPLETED',
          stationId: station.id,
          recipeId: station.activeRecipeId,
          brewJobId: station.brewJobId,
          timestampMs: this.sessionElapsedMs,
        });
        void this.feedback.playSound('brew_ready');
        void this.feedback.triggerHaptic('medium');
      }
    });

    // 4. Advance order patience & expire timed-out orders
    for (const order of this.activeOrders) {
      if (order.state === 'Pending') {
        const expiredJustNow = order.tickPatience(stepMs);
        if (expiredJustNow) {
          this.sessionOrdersExpired += 1;
          this.dirtyUiFlag = true;
          this.pushFeedback(`${order.customerName} left impatiently!`, 'error');
          this.emit({
            type: 'ORDER_EXPIRED',
            orderId: order.id,
            customerId: order.customerId,
            recipeId: order.recipeId,
            timestampMs: this.sessionElapsedMs,
          });
          void this.feedback.playSound('order_expired');
          void this.feedback.triggerHaptic('warning');
        }
      }
    }

    // Remove non-pending orders that have been resolved
    const beforeCount = this.activeOrders.length;
    this.activeOrders = this.activeOrders.filter((o) => o.state === 'Pending');
    if (this.activeOrders.length !== beforeCount) {
      this.dirtyUiFlag = true;
    }

    // Expire old floating feedback items after 2200ms
    const prevFeedbackLen = this.feedbackItems.length;
    this.feedbackItems = this.feedbackItems.filter(
      (f) => this.sessionElapsedMs - f.createdAtMs < 2200
    );
    if (this.feedbackItems.length !== prevFeedbackLen) {
      this.dirtyUiFlag = true;
    }

    // 5. Check session end
    if (this.sessionElapsedMs >= this.config.sessionDurationMs) {
      this.completeSession();
    }
  }

  public selectRecipe(recipeId: RecipeId): void {
    const recipe = RECIPE_BY_ID[recipeId];
    if (!BrewingRules.isRecipeUnlocked(recipe, this.level)) {
      this.pushFeedback(`Unlocks at Level ${recipe.unlockLevel}`, 'error');
      void this.feedback.triggerHaptic('warning');
      this.publishSnapshotNow();
      return;
    }
    this.selectedRecipeId = recipeId;
    void this.feedback.playSound('tap');
    void this.feedback.triggerHaptic('light');
    this.publishSnapshotNow();
  }

  /**
   * Player taps a station:
   * - If Idle: starts brewing the currently selected recipe.
   * - If Ready: selects this station's cup to serve to a customer.
   * - If Locked: informs player how to unlock.
   */
  public tapStation(stationId: StationId): boolean {
    const station = this.stations[stationId];
    if (!station) return false;

    if (station.state === 'Locked') {
      this.pushFeedback('Unlock 2nd Burner in Upgrade Shop!', 'info');
      void this.feedback.triggerHaptic('warning');
      this.publishSnapshotNow();
      return false;
    }

    if (station.state === 'Ready') {
      this.selectedReadyStationId = stationId;
      void this.feedback.playSound('tap');
      void this.feedback.triggerHaptic('light');
      this.publishSnapshotNow();
      return true;
    }

    if (station.state === 'Idle') {
      const res = StartBrewUseCase.execute({
        station,
        recipeId: this.selectedRecipeId,
        playerLevel: this.level,
        inventory: this.inventory,
        upgrades: this.upgrades,
        sessionElapsedMs: this.sessionElapsedMs,
        random: this.random,
      });

      if (res.event) {
        this.emit(res.event);
      }

      if (!res.started) {
        if (res.reason === 'insufficient_ingredients') {
          this.pushFeedback('Low ingredients! Tap Restock!', 'error');
          void this.feedback.playSound('serve_wrong');
          void this.feedback.triggerHaptic('error');
        }
        this.publishSnapshotNow();
        return false;
      }

      void this.feedback.playSound('brew_start');
      void this.feedback.triggerHaptic('light');
      this.publishSnapshotNow();
      return true;
    }

    return false;
  }

  /**
   * Discards a ready cup on a station if the player brewed the wrong recipe and needs the burner free.
   */
  public discardReadyStationCup(stationId: StationId): boolean {
    const station = this.stations[stationId];
    if (!station || station.state !== 'Ready') return false;
    station.discardCup();
    if (this.selectedReadyStationId === stationId) {
      const otherReady = (Object.values(this.stations) as BrewStation[]).find(
        (s) => s.state === 'Ready'
      );
      this.selectedReadyStationId = otherReady ? otherReady.id : null;
    }
    this.pushFeedback('Emptied kettle', 'info');
    void this.feedback.triggerHaptic('light');
    this.publishSnapshotNow();
    return true;
  }

  /**
   * Player taps a waiting customer order to serve a ready cup.
   */
  public tapCustomerOrder(orderId: string, preferredStationId?: StationId): boolean {
    const order = this.activeOrders.find((o) => o.id === orderId && o.state === 'Pending');
    if (!order) return false;

    // Determine which station cup is being served
    let targetStation: BrewStation | null = null;
    if (preferredStationId && this.stations[preferredStationId]?.state === 'Ready') {
      targetStation = this.stations[preferredStationId];
    } else if (
      this.selectedReadyStationId &&
      this.stations[this.selectedReadyStationId]?.state === 'Ready'
    ) {
      targetStation = this.stations[this.selectedReadyStationId];
    } else {
      // Auto-select a ready station that matches the order's recipe if available, else any ready station
      const readyStations = (Object.values(this.stations) as BrewStation[]).filter(
        (s) => s.state === 'Ready'
      );
      targetStation =
        readyStations.find((s) => s.activeRecipeId === order.recipeId) ??
        readyStations[0] ??
        null;
    }

    if (!targetStation) {
      this.pushFeedback('Brew a cup first!', 'info');
      void this.feedback.triggerHaptic('light');
      this.publishSnapshotNow();
      return false;
    }

    const patienceSnapshot = order.patienceRatio;
    const result = ServeOrderUseCase.execute({
      station: targetStation,
      order,
      wallet: this.wallet,
      upgrades: this.upgrades,
      currentXp: this.xp,
      currentLevel: this.level,
      sessionElapsedMs: this.sessionElapsedMs,
    });

    for (const ev of result.events) {
      this.emit(ev);
    }

    if (!result.served) {
      if (result.reason === 'recipe_mismatch') {
        const wantedName = RECIPE_BY_ID[order.recipeId].name;
        this.pushFeedback(`Wrong Chai! Wants ${wantedName}`, 'error');
        void this.feedback.playSound('serve_wrong');
        void this.feedback.triggerHaptic('error');
      }
      this.publishSnapshotNow();
      return false;
    }

    // Update progression state
    this.xp = result.newXp;
    this.level = result.newLevel;
    this.lifetimeOrdersServed += 1;
    if (this.lifetimeOrdersServed >= this.config.tutorialFreeOrdersCount) {
      this.tutorialCompleted = true;
    }

    this.sessionOrdersServed += 1;
    this.sessionCoinsEarned += result.totalCoins;
    this.sessionTipsEarned += result.tipCoins;
    this.sessionXpEarned += result.xpEarned;
    this.sessionSatisfactionSum += patienceSnapshot;

    // Remove served order from active queue
    this.activeOrders = this.activeOrders.filter((o) => o.id !== order.id);

    // Update selected ready station pointer
    const anotherReady = (Object.values(this.stations) as BrewStation[]).find(
      (s) => s.state === 'Ready'
    );
    this.selectedReadyStationId = anotherReady ? anotherReady.id : null;

    const tipText = result.tipCoins > 0 ? ` (+${result.tipCoins} tip!)` : '';
    this.pushFeedback(`+${result.totalCoins} Coins${tipText}`, 'coin');
    void this.feedback.playSound('serve_success');
    void this.feedback.triggerHaptic('success');

    // Persist immediately
    void this.saveRepo.recordOrderServed({
      orderId: order.id,
      recipeId: order.recipeId,
      coinsEarned: result.baseCoins,
      tipEarned: result.tipCoins,
      xpEarned: result.xpEarned,
      newCoinBalance: this.wallet.coins,
      newXp: this.xp,
      newLevel: this.level,
      newLifetimeServed: this.lifetimeOrdersServed,
      inventory: this.inventory.getSnapshot(),
    });

    // If queue is now empty during active session, spawn a replacement customer quickly
    if (this.activeOrders.length === 0 && this.sessionActive) {
      this.timeSinceLastSpawnMs = Math.max(
        this.timeSinceLastSpawnMs,
        this.config.baseSpawnIntervalMs - 1000
      );
    }

    this.publishSnapshotNow();
    return true;
  }

  public buyUpgrade(upgradeId: UpgradeId): boolean {
    const res = BuyUpgradeUseCase.execute({
      upgradeId,
      wallet: this.wallet,
      upgrades: this.upgrades,
      inventory: this.inventory,
      stations: this.stations,
      timestampMs: this.sessionElapsedMs,
      random: this.random,
    });

    if (!res.purchased) {
      if (res.reason === 'insufficient_funds') {
        this.pushFeedback('Not enough coins!', 'error');
        void this.feedback.triggerHaptic('error');
      } else if (res.reason === 'max_level_reached') {
        this.pushFeedback('Max level reached!', 'info');
      }
      this.publishSnapshotNow();
      return false;
    }

    if (res.event) {
      this.emit(res.event);
    }

    void this.feedback.playSound('upgrade_buy');
    void this.feedback.triggerHaptic('success');

    void this.saveRepo.recordUpgradePurchase({
      transactionId: res.transactionId,
      upgradeId,
      newLevel: res.newLevel,
      newCoinBalance: this.wallet.coins,
    });
    void this.saveRepo.saveProgress(this.exportSaveSnapshot());

    this.publishSnapshotNow();
    return true;
  }

  public restockIngredient(ingredientId: IngredientId): boolean {
    const res = RestockIngredientUseCase.execute({
      ingredientId,
      wallet: this.wallet,
      inventory: this.inventory,
      lifetimeOrdersServed: this.lifetimeOrdersServed,
      timestampMs: this.sessionElapsedMs,
      random: this.random,
    });

    if (!res.restocked) {
      if (res.reason === 'insufficient_funds') {
        this.pushFeedback('Need more coins to restock!', 'error');
        void this.feedback.triggerHaptic('error');
      } else if (res.reason === 'storage_full') {
        this.pushFeedback('Tin is already full!', 'info');
      }
      this.publishSnapshotNow();
      return false;
    }

    if (res.event) {
      this.emit(res.event);
    }

    this.pushFeedback(
      res.costCoins === 0
        ? `Free Tutorial Restock (+${res.unitsAdded})`
        : `Restocked +${res.unitsAdded} (-${res.costCoins}c)`,
      'info'
    );
    void this.feedback.playSound('restock');
    void this.feedback.triggerHaptic('light');
    void this.saveRepo.saveProgress(this.exportSaveSnapshot());
    this.publishSnapshotNow();
    return true;
  }

  public restockAllIngredients(): boolean {
    let anyRestocked = false;
    const ingredients: IngredientId[] = [
      'tea',
      'milk',
      'sugar',
      'ginger',
      'cardamom',
      'spices',
    ];
    for (const id of ingredients) {
      const r = RestockIngredientUseCase.execute({
        ingredientId: id,
        wallet: this.wallet,
        inventory: this.inventory,
        lifetimeOrdersServed: this.lifetimeOrdersServed,
        timestampMs: this.sessionElapsedMs,
        random: this.random,
      });
      if (r.restocked) {
        anyRestocked = true;
      }
    }
    if (anyRestocked) {
      void this.feedback.playSound('restock');
      void this.feedback.triggerHaptic('success');
      void this.saveRepo.saveProgress(this.exportSaveSnapshot());
      this.publishSnapshotNow();
    }
    return anyRestocked;
  }

  public completeTutorial(): void {
    this.tutorialCompleted = true;
    void this.saveRepo.saveProgress(this.exportSaveSnapshot());
    this.publishSnapshotNow();
  }

  public resetTutorialForReplay(): void {
    this.tutorialCompleted = false;
    void this.saveRepo.saveProgress(this.exportSaveSnapshot());
    this.publishSnapshotNow();
  }

  public updateSettings(partial: Partial<PlayerSaveSnapshot['settings']>): void {
    this.settings = { ...this.settings, ...partial };
    this.feedback.setSoundEnabled(this.settings.soundEnabled);
    this.feedback.setHapticsEnabled(this.settings.hapticsEnabled);
    void this.saveRepo.updateSettings(this.settings);
    this.publishSnapshotNow();
  }

  public async buyIapProduct(productId: IapProductId): Promise<IapPurchaseResult> {
    if (!this.purchaseProductUseCase) {
      return {
        success: false,
        productId,
        coinsAwarded: 0,
        error: 'Billing not configured',
      };
    }

    this.isIapPurchasing = true;
    this.publishSnapshotNow();

    try {
      const result = await this.purchaseProductUseCase.execute({
        productId,
        currentSnapshot: this.exportSaveSnapshot(),
        onSuccess: (newCoins, updatedSnapshot) => {
          this.hydrateFromSnapshot(updatedSnapshot);
          this.pushFeedback(
            `Purchased! +${result?.coinsAwarded ?? 0} coins`,
            'info'
          );
        },
      });

      if (!result.success && result.error) {
        this.pushFeedback(result.error, 'error');
      }

      return result;
    } finally {
      this.isIapPurchasing = false;
      this.publishSnapshotNow();
    }
  }

  public async restoreIapPurchases(): Promise<{ restoredCount: number }> {
    if (!this.restorePurchasesUseCase) {
      return { restoredCount: 0 };
    }

    this.isIapPurchasing = true;
    this.publishSnapshotNow();

    try {
      const result = await this.restorePurchasesUseCase.execute({
        currentSnapshot: this.exportSaveSnapshot(),
        onRestored: (updatedSnapshot) => {
          this.hydrateFromSnapshot(updatedSnapshot);
          this.pushFeedback('Purchases restored successfully!', 'info');
        },
      });
      return result;
    } finally {
      this.isIapPurchasing = false;
      this.publishSnapshotNow();
    }
  }

  public completeSession(): SessionSummaryDTO {
    this.sessionActive = false;
    this.isPaused = false;

    const avgSat =
      this.sessionOrdersServed > 0
        ? Math.round((this.sessionSatisfactionSum / this.sessionOrdersServed) * 100)
        : 0;

    const summary: SessionSummaryDTO = {
      sessionId: this.sessionId,
      ordersServed: this.sessionOrdersServed,
      ordersExpired: this.sessionOrdersExpired,
      coinsEarned: this.sessionCoinsEarned,
      tipsEarned: this.sessionTipsEarned,
      xpEarned: this.sessionXpEarned,
      averageSatisfactionPercent: avgSat,
      newLevelReached: this.level,
    };
    this.lastSessionSummary = summary;

    this.emit({
      type: 'SESSION_COMPLETED',
      sessionId: this.sessionId,
      ordersServed: this.sessionOrdersServed,
      ordersExpired: this.sessionOrdersExpired,
      coinsEarned: this.sessionCoinsEarned,
      tipsEarned: this.sessionTipsEarned,
      xpEarned: this.sessionXpEarned,
      averageSatisfaction: avgSat,
      timestampMs: this.sessionElapsedMs,
    });

    void this.saveRepo.recordSessionCompleted(
      {
        sessionId: this.sessionId,
        startedAtIso: this.sessionStartedIso || new Date(this.clock.nowMs()).toISOString(),
        endedAtIso: new Date(this.clock.nowMs()).toISOString(),
        ordersServed: this.sessionOrdersServed,
        ordersExpired: this.sessionOrdersExpired,
        coinsEarned: this.sessionCoinsEarned,
        tipsEarned: this.sessionTipsEarned,
        xpEarned: this.sessionXpEarned,
        averageSatisfaction: avgSat,
      },
      this.exportSaveSnapshot()
    );

    this.publishSnapshotNow();
    return summary;
  }

  private spawnCustomerOrder(): Order | null {
    // During first 2 lifetime orders, force Cutting Chai so the tutorial is super approachable
    const forcedRecipeId: RecipeId | undefined =
      this.lifetimeOrdersServed < 2 ? 'cutting' : undefined;

    const res = CreateOrderUseCase.execute({
      activeOrders: this.activeOrders,
      upgrades: this.upgrades,
      playerLevel: this.level,
      sessionElapsedMs: this.sessionElapsedMs,
      random: this.random,
      forcedRecipeId,
    });

    if (res.order && res.event) {
      this.dirtyUiFlag = true;
      this.emit(res.event);
    }
    return res.order;
  }

  private pushFeedback(
    text: string,
    kind: FloatingFeedbackItem['kind']
  ): void {
    this.feedbackItems.push({
      id: this.random.nextId('fb'),
      text,
      kind,
      createdAtMs: this.sessionElapsedMs,
    });
    if (this.feedbackItems.length > 5) {
      this.feedbackItems.shift();
    }
    this.dirtyUiFlag = true;
  }

  private emit(event: GameEvent): void {
    this.eventListeners.forEach((l) => l(event));
  }

  public publishSnapshotNow(): void {
    this.dirtyUiFlag = false;
    this.timeSinceLastUiPublishMs = 0;
    const snap = this.buildUiSnapshot();
    this.snapshotListeners.forEach((l) => l(snap));
  }

  public buildUiSnapshot(): GameUiSnapshot {
    const currentThreshold =
      LEVEL_THRESHOLDS.find((t) => t.level === this.level) ?? LEVEL_THRESHOLDS[0];
    const nextThreshold =
      LEVEL_THRESHOLDS.find((t) => t.level === this.level + 1) ?? null;

    const stationsVm: StationViewModel[] = (
      ['station_1', 'station_2'] as const
    ).map((id, idx) => {
      const s = this.stations[id];
      const activeRecipe = s.activeRecipeId ? RECIPE_BY_ID[s.activeRecipeId] : null;
      const remMs = Math.max(0, s.totalBrewTimeMs - s.elapsedBrewTimeMs);
      return {
        id,
        label: `Kettle #${idx + 1}`,
        state: s.state,
        activeRecipeId: s.activeRecipeId,
        activeRecipeName: activeRecipe ? activeRecipe.name : null,
        progressRatio: s.progressRatio,
        remainingSeconds: Math.ceil(remMs / 100) / 10,
      };
    });

    const ordersVm: OrderViewModel[] = this.activeOrders
      .filter((o) => o.state === 'Pending')
      .map((o) => ({
        id: o.id,
        customerId: o.customerId,
        customerName: o.customerName,
        archetypeId: o.archetypeId,
        recipeId: o.recipeId,
        recipeName: RECIPE_BY_ID[o.recipeId].name,
        remainingPatienceMs: o.remainingPatienceMs,
        maxPatienceMs: o.maxPatienceMs,
        patienceRatio: o.patienceRatio,
        state: o.state,
      }));

    const upgradesVm: UpgradeViewModel[] = UPGRADES_CATALOG.map((u) => {
      const currentLevel = this.upgrades.getLevel(u.id);
      const isMaxed = currentLevel >= u.maxLevel;
      const nextCost = EconomyRules.getUpgradeCost(u, currentLevel);
      return {
        id: u.id,
        name: u.name,
        description: u.description,
        category: u.category,
        currentLevel,
        maxLevel: u.maxLevel,
        nextCost,
        isMaxed,
        canAfford: !isMaxed && this.wallet.coins >= nextCost,
      };
    });

    const unlockedRecipes = RECIPES_CATALOG.filter((r) =>
      BrewingRules.isRecipeUnlocked(r, this.level)
    ).map((r) => r.id);

    return {
      sessionActive: this.sessionActive,
      isPaused: this.isPaused,
      sessionElapsedMs: this.sessionElapsedMs,
      sessionRemainingMs: Math.max(
        0,
        this.config.sessionDurationMs - this.sessionElapsedMs
      ),
      isRushHour: QueueRules.isRushHour(this.sessionElapsedMs),
      coins: this.wallet.coins,
      xp: this.xp,
      level: this.level,
      levelTitle: currentThreshold.title,
      nextLevelXp: nextThreshold ? nextThreshold.minXp : null,
      lifetimeOrdersServed: this.lifetimeOrdersServed,
      isTutorialFreePeriod:
        this.lifetimeOrdersServed < this.config.tutorialFreeOrdersCount,
      tutorialCompleted: this.tutorialCompleted,
      selectedRecipeId: this.selectedRecipeId,
      selectedReadyStationId: this.selectedReadyStationId,
      stations: stationsVm,
      activeOrders: ordersVm,
      maxQueueSize: QueueRules.calculateMaxQueueSize(
        this.upgrades,
        UPGRADE_BY_ID.larger_queue
      ),
      inventory: this.inventory.getSnapshot(),
      maxStorageCapacity: this.inventory.maxCapacity,
      upgrades: upgradesVm,
      unlockedRecipes,
      feedbackItems: [...this.feedbackItems],
      lastSessionSummary: this.lastSessionSummary,
      settings: { ...this.settings },
      iapCatalog: IAP_CATALOG,
      isIapPurchasing: this.isIapPurchasing,
      ownedEntitlements: [...this.ownedEntitlements],
    };
  }
}
