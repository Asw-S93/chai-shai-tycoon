import { IngredientId, UpgradeId } from '../value-objects';

/**
 * Deterministic Clock Port
 */
export interface ClockPort {
  nowMs(): number;
}

/**
 * Deterministic Random Port
 */
export interface RandomPort {
  /** Returns a float in [0, 1) */
  nextFloat(): number;
  /** Returns a unique deterministic or UUID-like string */
  nextId(prefix?: string): string;
}

/**
 * Audio & Haptics Feedback Port
 */
export type SoundEffectId =
  | 'tap'
  | 'brew_start'
  | 'brew_ready'
  | 'serve_success'
  | 'serve_wrong'
  | 'order_expired'
  | 'rush_hour'
  | 'upgrade_buy'
  | 'restock';

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export interface FeedbackPort {
  playSound(soundId: SoundEffectId): Promise<void> | void;
  triggerHaptic(type: HapticFeedbackType): Promise<void> | void;
  setSoundEnabled(enabled: boolean): void;
  setHapticsEnabled(enabled: boolean): void;
}

/**
 * Player Save Snapshot Data Structure
 */
export interface PlayerSaveSnapshot {
  readonly coins: number;
  readonly xp: number;
  readonly level: number;
  readonly lifetimeOrdersServed: number;
  readonly tutorialCompleted: boolean;
  readonly inventory: Record<IngredientId, number>;
  readonly upgrades: Record<UpgradeId, number>;
  readonly settings: {
    readonly soundEnabled: boolean;
    readonly hapticsEnabled: boolean;
    readonly lowMotionEnabled: boolean;
  };
  readonly processedTransactionIds: readonly string[];
}

export interface SessionRecord {
  readonly sessionId: string;
  readonly startedAtIso: string;
  readonly endedAtIso: string;
  readonly ordersServed: number;
  readonly ordersExpired: number;
  readonly coinsEarned: number;
  readonly tipsEarned: number;
  readonly xpEarned: number;
  readonly averageSatisfaction: number;
}

/**
 * Persistence Port (implemented by SQLite repository in infrastructure)
 */
export interface SaveRepositoryPort {
  initialize(): Promise<void>;
  loadSave(): Promise<PlayerSaveSnapshot>;
  saveProgress(snapshot: PlayerSaveSnapshot): Promise<void>;
  recordUpgradePurchase(params: {
    transactionId: string;
    upgradeId: UpgradeId;
    newLevel: number;
    newCoinBalance: number;
  }): Promise<boolean>;
  recordOrderServed(params: {
    orderId: string;
    recipeId: string;
    coinsEarned: number;
    tipEarned: number;
    xpEarned: number;
    newCoinBalance: number;
    newXp: number;
    newLevel: number;
    newLifetimeServed: number;
    inventory: Record<IngredientId, number>;
  }): Promise<boolean>;
  recordSessionCompleted(
    session: SessionRecord,
    snapshot: PlayerSaveSnapshot
  ): Promise<void>;
  updateSettings(settings: PlayerSaveSnapshot['settings']): Promise<void>;
}
