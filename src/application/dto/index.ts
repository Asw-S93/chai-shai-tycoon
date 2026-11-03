import {
  CustomerArchetypeId,
  IapProduct,
  IngredientId,
  OrderState,
  RecipeId,
  StationId,
  StationState,
  UpgradeCategory,
  UpgradeId,
} from '../../domain/value-objects';

export interface OrderViewModel {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly archetypeId: CustomerArchetypeId;
  readonly recipeId: RecipeId;
  readonly recipeName: string;
  readonly remainingPatienceMs: number;
  readonly maxPatienceMs: number;
  readonly patienceRatio: number;
  readonly state: OrderState;
}

export interface StationViewModel {
  readonly id: StationId;
  readonly label: string;
  readonly state: StationState;
  readonly activeRecipeId: RecipeId | null;
  readonly activeRecipeName: string | null;
  readonly progressRatio: number;
  readonly remainingSeconds: number;
}

export interface FloatingFeedbackItem {
  readonly id: string;
  readonly text: string;
  readonly kind: 'coin' | 'error' | 'info' | 'rush';
  readonly createdAtMs: number;
}

export interface UpgradeViewModel {
  readonly id: UpgradeId;
  readonly name: string;
  readonly description: string;
  readonly category: UpgradeCategory;
  readonly currentLevel: number;
  readonly maxLevel: number;
  readonly nextCost: number;
  readonly isMaxed: boolean;
  readonly canAfford: boolean;
}

export interface SessionSummaryDTO {
  readonly sessionId: string;
  readonly ordersServed: number;
  readonly ordersExpired: number;
  readonly coinsEarned: number;
  readonly tipsEarned: number;
  readonly xpEarned: number;
  readonly averageSatisfactionPercent: number;
  readonly newLevelReached: number;
}

export interface GameUiSnapshot {
  readonly sessionActive: boolean;
  readonly isPaused: boolean;
  readonly sessionElapsedMs: number;
  readonly sessionRemainingMs: number;
  readonly isRushHour: boolean;
  readonly coins: number;
  readonly xp: number;
  readonly level: number;
  readonly levelTitle: string;
  readonly nextLevelXp: number | null;
  readonly lifetimeOrdersServed: number;
  readonly isTutorialFreePeriod: boolean;
  readonly tutorialCompleted: boolean;
  readonly selectedRecipeId: RecipeId;
  readonly selectedReadyStationId: StationId | null;
  readonly stations: readonly StationViewModel[];
  readonly activeOrders: readonly OrderViewModel[];
  readonly maxQueueSize: number;
  readonly inventory: Record<IngredientId, number>;
  readonly maxStorageCapacity: number;
  readonly upgrades: readonly UpgradeViewModel[];
  readonly unlockedRecipes: readonly RecipeId[];
  readonly feedbackItems: readonly FloatingFeedbackItem[];
  readonly lastSessionSummary: SessionSummaryDTO | null;
  readonly settings: {
    readonly soundEnabled: boolean;
    readonly hapticsEnabled: boolean;
    readonly lowMotionEnabled: boolean;
  };
  readonly iapCatalog: readonly IapProduct[];
  readonly isIapPurchasing: boolean;
  readonly ownedEntitlements: readonly string[];
}
