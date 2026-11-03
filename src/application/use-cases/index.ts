import {
  CUSTOMER_ARCHETYPE_BY_ID,
  CUSTOMER_FIRST_NAMES,
  CUSTOMERS_CATALOG,
} from '../../content/customers';
import { DEFAULT_SESSION_CONFIG, LEVEL_THRESHOLDS } from '../../content/levels';
import { RECIPE_BY_ID, RECIPES_CATALOG } from '../../content/recipes';
import { UPGRADE_BY_ID } from '../../content/upgrades';
import {
  BrewStation,
  Inventory,
  Order,
  UpgradeState,
  Wallet,
} from '../../domain/entities';
import { GameEvent } from '../../domain/events';
import { RandomPort } from '../../domain/ports';
import { BrewingRules, EconomyRules, QueueRules } from '../../domain/services';
import { IngredientId, RecipeId, StationId, UpgradeId } from '../../domain/value-objects';

/**
 * Use-case 1: Spawn a new customer order if queue has capacity.
 */
export class CreateOrderUseCase {
  public static execute(params: {
    activeOrders: Order[];
    upgrades: UpgradeState;
    playerLevel: number;
    sessionElapsedMs: number;
    random: RandomPort;
    forcedRecipeId?: RecipeId;
  }): { order: Order | null; event: GameEvent | null } {
    const maxQueue = QueueRules.calculateMaxQueueSize(
      params.upgrades,
      UPGRADE_BY_ID.larger_queue
    );
    const pendingCount = params.activeOrders.filter((o) => o.state === 'Pending').length;
    if (pendingCount >= maxQueue) {
      return { order: null, event: null };
    }

    const isRush = QueueRules.isRushHour(params.sessionElapsedMs);
    const archetype = QueueRules.selectCustomerArchetype(
      CUSTOMERS_CATALOG,
      isRush,
      params.random.nextFloat()
    );

    const unlockedRecipes = RECIPES_CATALOG.filter((r) =>
      BrewingRules.isRecipeUnlocked(r, params.playerLevel)
    );
    const recipe = params.forcedRecipeId
      ? RECIPE_BY_ID[params.forcedRecipeId]
      : QueueRules.selectUnlockedRecipe(unlockedRecipes, params.random.nextFloat());

    const names = CUSTOMER_FIRST_NAMES[archetype.id];
    const nameIdx = Math.min(
      names.length - 1,
      Math.floor(params.random.nextFloat() * names.length)
    );
    const customerName = names[nameIdx];

    const maxPatienceMs = QueueRules.calculateCustomerPatienceMs(
      archetype,
      params.upgrades,
      UPGRADE_BY_ID.additional_patience
    );

    const orderId = params.random.nextId('ord');
    const customerId = params.random.nextId('cust');

    const order = new Order({
      id: orderId,
      customerId,
      customerName,
      archetypeId: archetype.id,
      recipeId: recipe.id,
      createdAtMs: params.sessionElapsedMs,
      maxPatienceMs,
    });

    params.activeOrders.push(order);

    return {
      order,
      event: {
        type: 'ORDER_CREATED',
        orderId: order.id,
        customerId: order.customerId,
        archetypeId: order.archetypeId,
        recipeId: order.recipeId,
        timestampMs: params.sessionElapsedMs,
      },
    };
  }
}

/**
 * Use-case 2: Start brewing a selected recipe on an idle station.
 * Deducts ingredients ONLY ONCE when the brew begins.
 */
export class StartBrewUseCase {
  public static execute(params: {
    station: BrewStation;
    recipeId: RecipeId;
    playerLevel: number;
    inventory: Inventory;
    upgrades: UpgradeState;
    sessionElapsedMs: number;
    random: RandomPort;
  }): {
    started: boolean;
    reason?: 'station_not_idle' | 'recipe_locked' | 'insufficient_ingredients';
    event: GameEvent | null;
  } {
    if (params.station.state !== 'Idle') {
      return { started: false, reason: 'station_not_idle', event: null };
    }

    const recipe = RECIPE_BY_ID[params.recipeId];
    if (!BrewingRules.isRecipeUnlocked(recipe, params.playerLevel)) {
      return { started: false, reason: 'recipe_locked', event: null };
    }

    // Deduct ingredients atomically once
    const deducted = params.inventory.deduct(recipe.ingredients);
    if (!deducted) {
      return {
        started: false,
        reason: 'insufficient_ingredients',
        event: {
          type: 'INSUFFICIENT_INGREDIENTS',
          recipeId: params.recipeId,
          timestampMs: params.sessionElapsedMs,
        },
      };
    }

    const durationMs = BrewingRules.calculateBrewTimeMs(
      recipe,
      params.upgrades,
      UPGRADE_BY_ID.faster_brewing
    );
    const brewJobId = params.random.nextId('brew');

    const ok = params.station.startBrew(params.recipeId, durationMs, brewJobId);
    if (!ok) {
      return { started: false, reason: 'station_not_idle', event: null };
    }

    return {
      started: true,
      event: {
        type: 'BREW_STARTED',
        stationId: params.station.id,
        recipeId: params.recipeId,
        brewJobId,
        durationMs,
        timestampMs: params.sessionElapsedMs,
      },
    };
  }
}

/**
 * Use-case 3: Serve a ready cup from a station to a customer order.
 * - Wrong matching gives clear feedback and NO reward, without deleting the order or cup.
 * - Terminal order state transition is idempotent; wallet credits once per order ID.
 */
export class ServeOrderUseCase {
  public static execute(params: {
    station: BrewStation;
    order: Order;
    wallet: Wallet;
    upgrades: UpgradeState;
    currentXp: number;
    currentLevel: number;
    sessionElapsedMs: number;
  }): {
    served: boolean;
    reason?:
      | 'station_not_ready'
      | 'order_not_pending'
      | 'recipe_mismatch'
      | 'already_rewarded';
    baseCoins: number;
    tipCoins: number;
    totalCoins: number;
    xpEarned: number;
    newXp: number;
    newLevel: number;
    events: GameEvent[];
  } {
    if (params.station.state !== 'Ready' || !params.station.activeRecipeId) {
      return {
        served: false,
        reason: 'station_not_ready',
        baseCoins: 0,
        tipCoins: 0,
        totalCoins: 0,
        xpEarned: 0,
        newXp: params.currentXp,
        newLevel: params.currentLevel,
        events: [],
      };
    }

    if (params.order.state !== 'Pending') {
      return {
        served: false,
        reason: 'order_not_pending',
        baseCoins: 0,
        tipCoins: 0,
        totalCoins: 0,
        xpEarned: 0,
        newXp: params.currentXp,
        newLevel: params.currentLevel,
        events: [],
      };
    }

    const stationRecipeId = params.station.activeRecipeId;
    if (stationRecipeId !== params.order.recipeId) {
      // Wrong match: keep order Pending and keep cup Ready on station, emit mismatch event
      return {
        served: false,
        reason: 'recipe_mismatch',
        baseCoins: 0,
        tipCoins: 0,
        totalCoins: 0,
        xpEarned: 0,
        newXp: params.currentXp,
        newLevel: params.currentLevel,
        events: [
          {
            type: 'ORDER_MISMATCH',
            orderId: params.order.id,
            stationId: params.station.id,
            expectedRecipeId: params.order.recipeId,
            attemptedRecipeId: stationRecipeId,
            timestampMs: params.sessionElapsedMs,
          },
        ],
      };
    }

    // Snapshot patience ratio before marking served
    const patienceRatio = params.order.patienceRatio;
    const transitioned = params.order.markServed();
    if (!transitioned) {
      return {
        served: false,
        reason: 'already_rewarded',
        baseCoins: 0,
        tipCoins: 0,
        totalCoins: 0,
        xpEarned: 0,
        newXp: params.currentXp,
        newLevel: params.currentLevel,
        events: [],
      };
    }

    const recipe = RECIPE_BY_ID[params.order.recipeId];
    const archetype = CUSTOMER_ARCHETYPE_BY_ID[params.order.archetypeId];
    const reward = EconomyRules.calculateServeReward(
      recipe,
      params.order,
      archetype,
      params.upgrades,
      UPGRADE_BY_ID.better_tips
    );

    const credited = params.wallet.credit(reward.totalCoins, `serve_${params.order.id}`);
    if (!credited) {
      return {
        served: false,
        reason: 'already_rewarded',
        baseCoins: 0,
        tipCoins: 0,
        totalCoins: 0,
        xpEarned: 0,
        newXp: params.currentXp,
        newLevel: params.currentLevel,
        events: [],
      };
    }

    // Consume cup from station
    params.station.collectReadyCup();

    const newXp = params.currentXp + reward.xpEarned;
    const newLevel = EconomyRules.calculateLevelFromXp(newXp, LEVEL_THRESHOLDS);

    const events: GameEvent[] = [
      {
        type: 'ORDER_SERVED',
        orderId: params.order.id,
        stationId: params.station.id,
        recipeId: recipe.id,
        baseCoins: reward.baseCoins,
        tipCoins: reward.tipCoins,
        totalCoins: reward.totalCoins,
        xpEarned: reward.xpEarned,
        patienceRatio,
        timestampMs: params.sessionElapsedMs,
      },
    ];

    if (newLevel > params.currentLevel) {
      const newlyUnlocked = RECIPES_CATALOG.filter(
        (r) => r.unlockLevel > params.currentLevel && r.unlockLevel <= newLevel
      ).map((r) => r.id);
      events.push({
        type: 'LEVEL_UP',
        newLevel,
        unlockedRecipes: newlyUnlocked,
        timestampMs: params.sessionElapsedMs,
      });
    }

    return {
      served: true,
      baseCoins: reward.baseCoins,
      tipCoins: reward.tipCoins,
      totalCoins: reward.totalCoins,
      xpEarned: reward.xpEarned,
      newXp,
      newLevel,
      events,
    };
  }
}

/**
 * Use-case 4: Buy an upgrade with wallet validation and level cap enforcement.
 */
export class BuyUpgradeUseCase {
  public static execute(params: {
    upgradeId: UpgradeId;
    wallet: Wallet;
    upgrades: UpgradeState;
    inventory: Inventory;
    stations: Record<StationId, BrewStation>;
    timestampMs: number;
    random: RandomPort;
  }): {
    purchased: boolean;
    reason?: 'max_level_reached' | 'insufficient_funds';
    newLevel: number;
    costCoins: number;
    transactionId: string;
    event: GameEvent | null;
  } {
    const def = UPGRADE_BY_ID[params.upgradeId];
    const currentLevel = params.upgrades.getLevel(params.upgradeId);

    if (currentLevel >= def.maxLevel) {
      return {
        purchased: false,
        reason: 'max_level_reached',
        newLevel: currentLevel,
        costCoins: 0,
        transactionId: '',
        event: null,
      };
    }

    const costCoins = EconomyRules.getUpgradeCost(def, currentLevel);
    const txId = params.random.nextId(`upg_${params.upgradeId}_L${currentLevel + 1}`);

    const debited = params.wallet.debit(costCoins, txId);
    if (!debited) {
      return {
        purchased: false,
        reason: 'insufficient_funds',
        newLevel: currentLevel,
        costCoins,
        transactionId: txId,
        event: null,
      };
    }

    params.upgrades.incrementLevel(params.upgradeId, def.maxLevel);
    const newLevel = params.upgrades.getLevel(params.upgradeId);

    // Apply immediate structural side effects
    if (params.upgradeId === 'second_burner' && newLevel >= 1) {
      params.stations.station_2.unlock();
    }
    if (params.upgradeId === 'larger_storage') {
      const newCap = EconomyRules.calculateStorageCapacity(
        DEFAULT_SESSION_CONFIG.baseStorageCapacity,
        params.upgrades,
        UPGRADE_BY_ID.larger_storage
      );
      params.inventory.setMaxCapacity(newCap);
    }

    return {
      purchased: true,
      newLevel,
      costCoins,
      transactionId: txId,
      event: {
        type: 'UPGRADE_PURCHASED',
        upgradeId: params.upgradeId,
        newLevel,
        costCoins,
        timestampMs: params.timestampMs,
      },
    };
  }
}

/**
 * Use-case 5: Restock an ingredient pack.
 * Free during tutorial (first 3 lifetime orders), costs coins afterward.
 */
export class RestockIngredientUseCase {
  public static execute(params: {
    ingredientId: IngredientId;
    wallet: Wallet;
    inventory: Inventory;
    lifetimeOrdersServed: number;
    timestampMs: number;
    random: RandomPort;
  }): {
    restocked: boolean;
    reason?: 'storage_full' | 'insufficient_funds';
    unitsAdded: number;
    costCoins: number;
    event: GameEvent | null;
  } {
    const currentStock = params.inventory.getStock(params.ingredientId);
    if (currentStock >= params.inventory.maxCapacity) {
      return {
        restocked: false,
        reason: 'storage_full',
        unitsAdded: 0,
        costCoins: 0,
        event: null,
      };
    }

    const isTutorialFree =
      params.lifetimeOrdersServed < DEFAULT_SESSION_CONFIG.tutorialFreeOrdersCount;
    const { costCoins, unitsAdded } = EconomyRules.calculateRestockPackCost(
      params.ingredientId,
      isTutorialFree
    );

    const txId = params.random.nextId(`restock_${params.ingredientId}`);
    if (costCoins > 0) {
      const debited = params.wallet.debit(costCoins, txId);
      if (!debited) {
        return {
          restocked: false,
          reason: 'insufficient_funds',
          unitsAdded: 0,
          costCoins,
          event: null,
        };
      }
    }

    const afterStock = params.inventory.addStock(params.ingredientId, unitsAdded);
    const actualAdded = afterStock - currentStock;

    return {
      restocked: true,
      unitsAdded: actualAdded,
      costCoins,
      event: {
        type: 'INVENTORY_RESTOCKED',
        ingredientId: params.ingredientId,
        unitsAdded: actualAdded,
        costCoins,
        timestampMs: params.timestampMs,
      },
    };
  }
}

export { PurchaseProductUseCase, RestorePurchasesUseCase } from './IapUseCases';

