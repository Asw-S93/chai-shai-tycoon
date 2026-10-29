/**
 * Domain Value Objects — Pure TypeScript, zero framework imports.
 */

export type RecipeId = 'cutting' | 'adrak' | 'elaichi' | 'masala';

export type IngredientId = 'tea' | 'milk' | 'sugar' | 'ginger' | 'cardamom' | 'spices';

export type CustomerArchetypeId = 'office_worker' | 'student' | 'regular';

export type StationId = 'station_1' | 'station_2';

export type StationState = 'Locked' | 'Idle' | 'Brewing' | 'Ready';

export type OrderState = 'Pending' | 'Served' | 'Expired';

export type UpgradeId =
  | 'faster_brewing'
  | 'second_burner'
  | 'larger_queue'
  | 'better_tips'
  | 'larger_storage'
  | 'additional_patience';

export type UpgradeCategory = 'equipment' | 'staff' | 'decor';

export const ALL_RECIPE_IDS: readonly RecipeId[] = ['cutting', 'adrak', 'elaichi', 'masala'] as const;

export const ALL_INGREDIENT_IDS: readonly IngredientId[] = [
  'tea',
  'milk',
  'sugar',
  'ginger',
  'cardamom',
  'spices',
] as const;

export const ALL_CUSTOMER_ARCHETYPE_IDS: readonly CustomerArchetypeId[] = [
  'office_worker',
  'student',
  'regular',
] as const;

export const ALL_UPGRADE_IDS: readonly UpgradeId[] = [
  'faster_brewing',
  'second_burner',
  'larger_queue',
  'better_tips',
  'larger_storage',
  'additional_patience',
] as const;

/**
 * Immutable integer coin amount. Never allows negative values or fractional coins.
 */
export class Money {
  public readonly coins: number;

  private constructor(coins: number) {
    if (!Number.isInteger(coins) || coins < 0) {
      throw new Error(`Invalid Money amount: ${coins}. Must be a non-negative integer.`);
    }
    this.coins = coins;
  }

  public static of(coins: number): Money {
    return new Money(Math.floor(coins));
  }

  public static zero(): Money {
    return new Money(0);
  }

  public add(other: Money): Money {
    return new Money(this.coins + other.coins);
  }

  public canAfford(cost: Money): boolean {
    return this.coins >= cost.coins;
  }

  public subtract(cost: Money): Money {
    if (!this.canAfford(cost)) {
      throw new Error(`Insufficient funds: have ${this.coins}, need ${cost.coins}`);
    }
    return new Money(this.coins - cost.coins);
  }

  public equals(other: Money): boolean {
    return this.coins === other.coins;
  }
}

/**
 * Game time value object in milliseconds.
 */
export class GameTime {
  public readonly elapsedMs: number;

  private constructor(elapsedMs: number) {
    if (elapsedMs < 0 || !Number.isFinite(elapsedMs)) {
      throw new Error(`Invalid GameTime: ${elapsedMs}`);
    }
    this.elapsedMs = Math.round(elapsedMs);
  }

  public static zero(): GameTime {
    return new GameTime(0);
  }

  public static fromMs(ms: number): GameTime {
    return new GameTime(ms);
  }

  public static fromSeconds(seconds: number): GameTime {
    return new GameTime(Math.round(seconds * 1000));
  }

  public advance(deltaMs: number): GameTime {
    if (deltaMs < 0) {
      throw new Error(`Cannot advance GameTime by negative delta: ${deltaMs}`);
    }
    return new GameTime(this.elapsedMs + deltaMs);
  }

  public get seconds(): number {
    return this.elapsedMs / 1000;
  }
}
