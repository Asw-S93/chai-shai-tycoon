import {
  PlayerSaveSnapshot,
  SaveRepositoryPort,
  SessionRecord,
} from '../../domain/ports';
import {
  ALL_INGREDIENT_IDS,
  ALL_UPGRADE_IDS,
  IapProductId,
  IngredientId,
  UpgradeId,
} from '../../domain/value-objects';
import { createSeededSaveSnapshot, PlayerSaveSnapshotSchema } from './schemas';

/**
 * Minimal interface over expo-sqlite SQLiteDatabase so we can test migrations and transactional
 * SQL logic both on device (with expo-sqlite) and in Node Jest tests.
 */
export interface SqlDatabaseAdapter {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: (string | number | null)[]): Promise<void>;
  getFirstAsync<T>(sql: string, params?: (string | number | null)[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export const SQL_MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS player_progress (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  coins INTEGER NOT NULL DEFAULT 100 CHECK (coins >= 0),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  lifetime_orders_served INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_orders_served >= 0),
  tutorial_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  ingredient_id TEXT PRIMARY KEY NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS upgrade_levels (
  upgrade_id TEXT PRIMARY KEY NOT NULL,
  level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0)
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  sound_enabled INTEGER NOT NULL DEFAULT 1,
  haptics_enabled INTEGER NOT NULL DEFAULT 1,
  low_motion_enabled INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  orders_served INTEGER NOT NULL DEFAULT 0,
  orders_expired INTEGER NOT NULL DEFAULT 0,
  coins_earned INTEGER NOT NULL DEFAULT 0,
  tips_earned INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  average_satisfaction INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS completed_orders (
  order_id TEXT PRIMARY KEY NOT NULL,
  recipe_id TEXT NOT NULL,
  coins_earned INTEGER NOT NULL,
  tip_earned INTEGER NOT NULL,
  xp_earned INTEGER NOT NULL,
  served_at TEXT NOT NULL
);
`;

export class SqliteSaveRepository implements SaveRepositoryPort {
  private readonly dbProvider: () => Promise<SqlDatabaseAdapter>;
  private db: SqlDatabaseAdapter | null = null;

  constructor(dbProvider: () => Promise<SqlDatabaseAdapter>) {
    this.dbProvider = dbProvider;
  }

  public async initialize(): Promise<void> {
    if (!this.db) {
      this.db = await this.dbProvider();
    }
    await this.db.execAsync(SQL_MIGRATION_V1);

    const mig = await this.db.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_migrations WHERE version = 1'
    );
    if (!mig) {
      await this.db.runAsync(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
        [1, new Date().toISOString()]
      );
    }

    // Seed initial rows if first launch
    const existingProgress = await this.db.getFirstAsync<{ id: number }>(
      'SELECT id FROM player_progress WHERE id = 1'
    );
    if (!existingProgress) {
      const seed = createSeededSaveSnapshot();
      await this.saveProgress(seed);
    }
  }

  public async loadSave(): Promise<PlayerSaveSnapshot> {
    const db = await this.ensureDb();
    try {
      const progressRow = await db.getFirstAsync<{
        coins: number;
        xp: number;
        level: number;
        lifetime_orders_served: number;
        tutorial_completed: number;
      }>(
        'SELECT coins, xp, level, lifetime_orders_served, tutorial_completed FROM player_progress WHERE id = 1'
      );

      const invRows = await db.getAllAsync<{ ingredient_id: string; quantity: number }>(
        'SELECT ingredient_id, quantity FROM inventory'
      );
      const upgRows = await db.getAllAsync<{ upgrade_id: string; level: number }>(
        'SELECT upgrade_id, level FROM upgrade_levels'
      );
      const settingsRow = await db.getFirstAsync<{
        sound_enabled: number;
        haptics_enabled: number;
        low_motion_enabled: number;
      }>(
        'SELECT sound_enabled, haptics_enabled, low_motion_enabled FROM settings WHERE id = 1'
      );
      const completedOrderRows = await db.getAllAsync<{ order_id: string }>(
        'SELECT order_id FROM completed_orders ORDER BY served_at DESC LIMIT 250'
      );

      const seed = createSeededSaveSnapshot();
      const rawInventory: Record<string, number> = { ...seed.inventory };
      for (const row of invRows) {
        if (ALL_INGREDIENT_IDS.includes(row.ingredient_id as IngredientId)) {
          rawInventory[row.ingredient_id] = row.quantity;
        }
      }

      const rawUpgrades: Record<string, number> = { ...seed.upgrades };
      for (const row of upgRows) {
        if (ALL_UPGRADE_IDS.includes(row.upgrade_id as UpgradeId)) {
          rawUpgrades[row.upgrade_id] = row.level;
        }
      }

      const parsed = PlayerSaveSnapshotSchema.parse({
        coins: progressRow?.coins ?? seed.coins,
        xp: progressRow?.xp ?? seed.xp,
        level: progressRow?.level ?? seed.level,
        lifetimeOrdersServed:
          progressRow?.lifetime_orders_served ?? seed.lifetimeOrdersServed,
        tutorialCompleted: progressRow
          ? Boolean(progressRow.tutorial_completed)
          : seed.tutorialCompleted,
        inventory: rawInventory,
        upgrades: rawUpgrades,
        settings: settingsRow
          ? {
              soundEnabled: Boolean(settingsRow.sound_enabled),
              hapticsEnabled: Boolean(settingsRow.haptics_enabled),
              lowMotionEnabled: Boolean(settingsRow.low_motion_enabled),
            }
          : seed.settings,
        processedTransactionIds: completedOrderRows.map((r) => `serve_${r.order_id}`),
      });

      return parsed;
    } catch (err) {
      if (__DEV__) {
        console.warn('[SqliteSaveRepository] Recovered from partial/corrupt save:', err);
      }
      return createSeededSaveSnapshot();
    }
  }

  public async saveProgress(snapshot: PlayerSaveSnapshot): Promise<void> {
    const db = await this.ensureDb();
    const valid = PlayerSaveSnapshotSchema.parse(snapshot);
    const nowIso = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO player_progress (id, coins, xp, level, lifetime_orders_served, tutorial_completed, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           coins = excluded.coins,
           xp = excluded.xp,
           level = excluded.level,
           lifetime_orders_served = excluded.lifetime_orders_served,
           tutorial_completed = excluded.tutorial_completed,
           updated_at = excluded.updated_at`,
        [
          valid.coins,
          valid.xp,
          valid.level,
          valid.lifetimeOrdersServed,
          valid.tutorialCompleted ? 1 : 0,
          nowIso,
        ]
      );

      for (const id of ALL_INGREDIENT_IDS) {
        await db.runAsync(
          `INSERT INTO inventory (ingredient_id, quantity) VALUES (?, ?)
           ON CONFLICT(ingredient_id) DO UPDATE SET quantity = excluded.quantity`,
          [id, valid.inventory[id]]
        );
      }

      for (const id of ALL_UPGRADE_IDS) {
        await db.runAsync(
          `INSERT INTO upgrade_levels (upgrade_id, level) VALUES (?, ?)
           ON CONFLICT(upgrade_id) DO UPDATE SET level = excluded.level`,
          [id, valid.upgrades[id]]
        );
      }

      await db.runAsync(
        `INSERT INTO settings (id, sound_enabled, haptics_enabled, low_motion_enabled)
         VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           sound_enabled = excluded.sound_enabled,
           haptics_enabled = excluded.haptics_enabled,
           low_motion_enabled = excluded.low_motion_enabled`,
        [
          valid.settings.soundEnabled ? 1 : 0,
          valid.settings.hapticsEnabled ? 1 : 0,
          valid.settings.lowMotionEnabled ? 1 : 0,
        ]
      );
    });
  }

  public async recordUpgradePurchase(params: {
    transactionId: string;
    upgradeId: UpgradeId;
    newLevel: number;
    newCoinBalance: number;
  }): Promise<boolean> {
    const db = await this.ensureDb();
    const nowIso = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'UPDATE player_progress SET coins = ?, updated_at = ? WHERE id = 1',
        [Math.max(0, Math.floor(params.newCoinBalance)), nowIso]
      );
      await db.runAsync(
        `INSERT INTO upgrade_levels (upgrade_id, level) VALUES (?, ?)
         ON CONFLICT(upgrade_id) DO UPDATE SET level = excluded.level`,
        [params.upgradeId, params.newLevel]
      );
    });
    return true;
  }

  public async recordIapPurchase(params: {
    transactionId: string;
    productId: IapProductId;
    coinsAwarded: number;
    newCoinBalance: number;
    entitlementAdded?: string;
  }): Promise<boolean> {
    const db = await this.ensureDb();
    const nowIso = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'UPDATE player_progress SET coins = ?, updated_at = ? WHERE id = 1',
        [Math.max(0, Math.floor(params.newCoinBalance)), nowIso]
      );
    });
    return true;
  }

  public async recordOrderServed(params: {
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
  }): Promise<boolean> {
    const db = await this.ensureDb();
    const existing = await db.getFirstAsync<{ order_id: string }>(
      'SELECT order_id FROM completed_orders WHERE order_id = ?',
      [params.orderId]
    );
    if (existing) {
      return false;
    }

    const nowIso = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO completed_orders (order_id, recipe_id, coins_earned, tip_earned, xp_earned, served_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          params.orderId,
          params.recipeId,
          params.coinsEarned,
          params.tipEarned,
          params.xpEarned,
          nowIso,
        ]
      );
      await db.runAsync(
        `UPDATE player_progress
         SET coins = ?, xp = ?, level = ?, lifetime_orders_served = ?, updated_at = ?
         WHERE id = 1`,
        [
          params.newCoinBalance,
          params.newXp,
          params.newLevel,
          params.newLifetimeServed,
          nowIso,
        ]
      );
      for (const id of ALL_INGREDIENT_IDS) {
        await db.runAsync(
          `INSERT INTO inventory (ingredient_id, quantity) VALUES (?, ?)
           ON CONFLICT(ingredient_id) DO UPDATE SET quantity = excluded.quantity`,
          [id, params.inventory[id]]
        );
      }
    });
    return true;
  }

  public async recordSessionCompleted(
    session: SessionRecord,
    snapshot: PlayerSaveSnapshot
  ): Promise<void> {
    const db = await this.ensureDb();
    await this.saveProgress(snapshot);
    await db.runAsync(
      `INSERT INTO sessions (
        session_id, started_at, ended_at, orders_served, orders_expired,
        coins_earned, tips_earned, xp_earned, average_satisfaction
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO NOTHING`,
      [
        session.sessionId,
        session.startedAtIso,
        session.endedAtIso,
        session.ordersServed,
        session.ordersExpired,
        session.coinsEarned,
        session.tipsEarned,
        session.xpEarned,
        session.averageSatisfaction,
      ]
    );
  }

  public async updateSettings(
    settings: PlayerSaveSnapshot['settings']
  ): Promise<void> {
    const db = await this.ensureDb();
    await db.runAsync(
      `INSERT INTO settings (id, sound_enabled, haptics_enabled, low_motion_enabled)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         sound_enabled = excluded.sound_enabled,
         haptics_enabled = excluded.haptics_enabled,
         low_motion_enabled = excluded.low_motion_enabled`,
      [
        settings.soundEnabled ? 1 : 0,
        settings.hapticsEnabled ? 1 : 0,
        settings.lowMotionEnabled ? 1 : 0,
      ]
    );
  }

  private async ensureDb(): Promise<SqlDatabaseAdapter> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }
}
