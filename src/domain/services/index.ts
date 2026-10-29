import {
  CustomerArchetype,
  Order,
  RecipeDefinition,
  UpgradeDefinition,
  UpgradeState,
} from '../entities';
import { IngredientId } from '../value-objects';

/**
 * Pure domain rules for brewing time, station availability, and recipe unlocks.
 */
export class BrewingRules {
  /**
   * Calculates effective brew duration in ms after applying `faster_brewing` upgrade.
   * Each level reduces brew time by `effectPerLevel` (e.g. 12% per level), bounded to at least 1200ms.
   */
  public static calculateBrewTimeMs(
    recipe: RecipeDefinition,
    upgrades: UpgradeState,
    fasterBrewingDef: UpgradeDefinition
  ): number {
    const level = upgrades.getLevel('faster_brewing');
    const reductionFraction = Math.min(0.6, level * fasterBrewingDef.effectPerLevel);
    const computed = Math.round(recipe.baseBrewTimeMs * (1 - reductionFraction));
    return Math.max(1200, computed);
  }

  public static isSecondBurnerUnlocked(upgrades: UpgradeState): boolean {
    return upgrades.getLevel('second_burner') >= 1;
  }

  public static isRecipeUnlocked(recipe: RecipeDefinition, playerLevel: number): boolean {
    return playerLevel >= recipe.unlockLevel;
  }
}

/**
 * Pure domain rules for tips, payouts, upgrade costs, restock costs, and XP progression.
 */
export class EconomyRules {
  /**
   * Tips are proportional to remaining patience and bounded strictly to 0–30% of base reward.
   */
  public static calculateServeReward(
    recipe: RecipeDefinition,
    order: Order,
    archetype: CustomerArchetype,
    upgrades: UpgradeState,
    betterTipsDef: UpgradeDefinition
  ): { baseCoins: number; tipCoins: number; totalCoins: number; xpEarned: number } {
    const baseCoins = recipe.baseCoins;
    const maxAllowedTip = Math.floor(baseCoins * 0.3);

    const tipUpgradeLevel = upgrades.getLevel('better_tips');
    const upgradeBonusMultiplier = 1 + tipUpgradeLevel * betterTipsDef.effectPerLevel;

    // Raw tip fraction up to 30% scaled by patience ratio, archetype tip multiplier, and upgrade bonus
    const rawTipFraction =
      0.3 * order.patienceRatio * archetype.tipMultiplier * upgradeBonusMultiplier;
    const uncappedTip = Math.round(baseCoins * rawTipFraction);

    const tipCoins = Math.max(0, Math.min(maxAllowedTip, uncappedTip));
    return {
      baseCoins,
      tipCoins,
      totalCoins: baseCoins + tipCoins,
      xpEarned: recipe.xpReward,
    };
  }

  /**
   * Calculates cost for the next level of an upgrade (level 0 -> 1 costs baseCost).
   */
  public static getUpgradeCost(def: UpgradeDefinition, currentLevel: number): number {
    if (currentLevel >= def.maxLevel) {
      return 0;
    }
    return Math.round(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
  }

  /**
   * Calculates max ingredient storage capacity based on `larger_storage` upgrade.
   */
  public static calculateStorageCapacity(
    baseCapacity: number,
    upgrades: UpgradeState,
    storageDef: UpgradeDefinition
  ): number {
    const level = upgrades.getLevel('larger_storage');
    return baseCapacity + Math.round(level * storageDef.effectPerLevel);
  }

  /**
   * Calculates cost to restock a bundle of ingredients.
   * During tutorial (first 3 completed orders lifetime), restocking is free if needed.
   */
  public static calculateRestockPackCost(
    ingredient: IngredientId,
    isTutorialFreePeriod: boolean
  ): { costCoins: number; unitsAdded: number } {
    if (isTutorialFreePeriod) {
      return { costCoins: 0, unitsAdded: 5 };
    }
    const baseCosts: Record<IngredientId, number> = {
      tea: 6,
      milk: 6,
      sugar: 5,
      ginger: 8,
      cardamom: 10,
      spices: 12,
    };
    return {
      costCoins: baseCosts[ingredient],
      unitsAdded: 5,
    };
  }

  /**
   * Determines player level from total XP using data-driven level thresholds.
   */
  public static calculateLevelFromXp(
    totalXp: number,
    levelThresholds: readonly { level: number; minXp: number }[]
  ): number {
    let resolvedLevel = 1;
    for (const entry of levelThresholds) {
      if (totalXp >= entry.minXp && entry.level > resolvedLevel) {
        resolvedLevel = entry.level;
      }
    }
    return resolvedLevel;
  }
}

/**
 * Pure domain rules for customer queue capacity, patience, and rush hour spawning.
 */
export class QueueRules {
  public static readonly DEFAULT_MAX_QUEUE = 4;
  public static readonly RUSH_START_MS = 90_000;
  public static readonly RUSH_DURATION_MS = 30_000;
  public static readonly RUSH_END_MS = 120_000;
  public static readonly MIN_SPAWN_INTERVAL_MS = 2_500;

  public static calculateMaxQueueSize(
    upgrades: UpgradeState,
    largerQueueDef: UpgradeDefinition
  ): number {
    const level = upgrades.getLevel('larger_queue');
    return (
      QueueRules.DEFAULT_MAX_QUEUE + Math.round(level * largerQueueDef.effectPerLevel)
    );
  }

  public static calculateCustomerPatienceMs(
    archetype: CustomerArchetype,
    upgrades: UpgradeState,
    additionalPatienceDef: UpgradeDefinition
  ): number {
    const level = upgrades.getLevel('additional_patience');
    const bonusMs = Math.round(level * additionalPatienceDef.effectPerLevel * 1000);
    return archetype.basePatienceMs + bonusMs;
  }

  public static isRushHour(sessionElapsedMs: number): boolean {
    return (
      sessionElapsedMs >= QueueRules.RUSH_START_MS &&
      sessionElapsedMs < QueueRules.RUSH_END_MS
    );
  }

  /**
   * During rush hour, spawn interval is halved with a floor of 2.5 seconds (2500ms).
   */
  public static calculateEffectiveSpawnIntervalMs(
    baseIntervalMs: number,
    sessionElapsedMs: number
  ): number {
    const isRush = QueueRules.isRushHour(sessionElapsedMs);
    const interval = isRush ? Math.round(baseIntervalMs * 0.5) : baseIntervalMs;
    return Math.max(QueueRules.MIN_SPAWN_INTERVAL_MS, interval);
  }

  /**
   * Deterministically selects a customer archetype using weighted random [0, 1).
   */
  public static selectCustomerArchetype(
    archetypes: readonly CustomerArchetype[],
    isRush: boolean,
    randomValue01: number
  ): CustomerArchetype {
    const weights = archetypes.map((a) =>
      isRush ? a.rushSpawnWeight : a.normalSpawnWeight
    );
    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    let threshold = Math.max(0, Math.min(0.999999, randomValue01)) * totalWeight;

    for (let i = 0; i < archetypes.length; i++) {
      threshold -= weights[i];
      if (threshold <= 0) {
        return archetypes[i];
      }
    }
    return archetypes[archetypes.length - 1];
  }

  /**
   * Deterministically selects an unlocked recipe using random [0, 1).
   */
  public static selectUnlockedRecipe(
    unlockedRecipes: readonly RecipeDefinition[],
    randomValue01: number
  ): RecipeDefinition {
    if (unlockedRecipes.length === 0) {
      throw new Error('At least one recipe must be unlocked');
    }
    const idx = Math.min(
      unlockedRecipes.length - 1,
      Math.floor(Math.max(0, randomValue01) * unlockedRecipes.length)
    );
    return unlockedRecipes[idx];
  }
}
