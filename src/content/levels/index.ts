export interface LevelThreshold {
  readonly level: number;
  readonly minXp: number;
  readonly title: string;
}

export const LEVEL_THRESHOLDS: readonly LevelThreshold[] = [
  { level: 1, minXp: 0, title: 'Roadside Tapri Rookie' },
  { level: 2, minXp: 45, title: 'Adrak Apprentice' },
  { level: 3, minXp: 110, title: 'Elaichi Artisan' },
  { level: 4, minXp: 200, title: 'Bazaar Favorite' },
  { level: 5, minXp: 320, title: 'Masala Master' },
  { level: 6, minXp: 480, title: 'Chai-Shai Tycoon' },
] as const;

export interface SessionConfig {
  readonly sessionDurationMs: number;
  readonly baseSpawnIntervalMs: number;
  readonly firstCustomerDelayMs: number;
  readonly rushStartMs: number;
  readonly rushDurationMs: number;
  readonly tutorialFreeOrdersCount: number;
  readonly baseStorageCapacity: number;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  sessionDurationMs: 180_000, // 3-minute session
  baseSpawnIntervalMs: 6_500, // Normal spawn interval (halved to 3.25s during rush, floor 2.5s)
  firstCustomerDelayMs: 600, // Spawn first order quickly
  rushStartMs: 90_000, // Rush hour at 90s
  rushDurationMs: 30_000, // For 30s
  tutorialFreeOrdersCount: 3, // Tutorial provides free inventory for 3 orders
  baseStorageCapacity: 15,
};

export * from '../themes';

