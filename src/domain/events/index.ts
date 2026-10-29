import {
  CustomerArchetypeId,
  IngredientId,
  RecipeId,
  StationId,
  UpgradeId,
} from '../value-objects';

export type GameEvent =
  | {
      readonly type: 'ORDER_CREATED';
      readonly orderId: string;
      readonly customerId: string;
      readonly archetypeId: CustomerArchetypeId;
      readonly recipeId: RecipeId;
      readonly timestampMs: number;
    }
  | {
      readonly type: 'BREW_STARTED';
      readonly stationId: StationId;
      readonly recipeId: RecipeId;
      readonly brewJobId: string;
      readonly durationMs: number;
      readonly timestampMs: number;
    }
  | {
      readonly type: 'BREW_COMPLETED';
      readonly stationId: StationId;
      readonly recipeId: RecipeId;
      readonly brewJobId: string;
      readonly timestampMs: number;
    }
  | {
      readonly type: 'ORDER_SERVED';
      readonly orderId: string;
      readonly stationId: StationId;
      readonly recipeId: RecipeId;
      readonly baseCoins: number;
      readonly tipCoins: number;
      readonly totalCoins: number;
      readonly xpEarned: number;
      readonly patienceRatio: number;
      readonly timestampMs: number;
    }
  | {
      readonly type: 'ORDER_MISMATCH';
      readonly orderId: string;
      readonly stationId: StationId;
      readonly expectedRecipeId: RecipeId;
      readonly attemptedRecipeId: RecipeId;
      readonly timestampMs: number;
    }
  | {
      readonly type: 'ORDER_EXPIRED';
      readonly orderId: string;
      readonly customerId: string;
      readonly recipeId: RecipeId;
      readonly timestampMs: number;
    }
  | {
      readonly type: 'INSUFFICIENT_INGREDIENTS';
      readonly recipeId: RecipeId;
      readonly timestampMs: number;
    }
  | {
      readonly type: 'UPGRADE_PURCHASED';
      readonly upgradeId: UpgradeId;
      readonly newLevel: number;
      readonly costCoins: number;
      readonly timestampMs: number;
    }
  | {
      readonly type: 'INVENTORY_RESTOCKED';
      readonly ingredientId: IngredientId;
      readonly unitsAdded: number;
      readonly costCoins: number;
      readonly timestampMs: number;
    }
  | {
      readonly type: 'RUSH_HOUR_STARTED';
      readonly timestampMs: number;
    }
  | {
      readonly type: 'RUSH_HOUR_ENDED';
      readonly timestampMs: number;
    }
  | {
      readonly type: 'LEVEL_UP';
      readonly newLevel: number;
      readonly unlockedRecipes: readonly RecipeId[];
      readonly timestampMs: number;
    }
  | {
      readonly type: 'SESSION_COMPLETED';
      readonly sessionId: string;
      readonly ordersServed: number;
      readonly ordersExpired: number;
      readonly coinsEarned: number;
      readonly tipsEarned: number;
      readonly xpEarned: number;
      readonly averageSatisfaction: number;
      readonly timestampMs: number;
    };

export type GameEventListener = (event: GameEvent) => void;
