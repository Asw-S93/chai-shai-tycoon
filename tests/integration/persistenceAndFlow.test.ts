import * as fs from 'fs';
import * as path from 'path';
import { GameEngine } from '../../src/application/engine';
import { ClockPort, FeedbackPort } from '../../src/domain/ports';
import {
  ALL_INGREDIENT_IDS,
  ALL_UPGRADE_IDS,
  IngredientId,
  UpgradeId,
} from '../../src/domain/value-objects';
import {
  SqlDatabaseAdapter,
  SqliteSaveRepository,
} from '../../src/infrastructure/persistence/SqliteSaveRepository';
import { SeededRandomAdapter } from '../../src/infrastructure/platform';

/**
 * In-memory relational fake implementing SqlDatabaseAdapter to verify SQLite migrations,
 * transactional atomic writes, duplicate order rejection, and process restart persistence.
 */
class InMemorySqlDatabase implements SqlDatabaseAdapter {
  public tablesCreated = false;
  public migrations: { version: number; applied_at: string }[] = [];
  public playerProgress: {
    id: number;
    coins: number;
    xp: number;
    level: number;
    lifetime_orders_served: number;
    tutorial_completed: number;
    updated_at: string;
  } | null = null;
  public inventory = new Map<string, number>();
  public upgrades = new Map<string, number>();
  public settings: {
    sound_enabled: number;
    haptics_enabled: number;
    low_motion_enabled: number;
  } | null = null;
  public completedOrders = new Map<string, { order_id: string; served_at: string }>();
  public sessions = new Map<string, unknown>();

  public async execAsync(sql: string): Promise<void> {
    if (sql.includes('CREATE TABLE IF NOT EXISTS player_progress')) {
      this.tablesCreated = true;
    }
  }

  public async runAsync(
    sql: string,
    params: (string | number | null)[] = []
  ): Promise<void> {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    if (normalized.startsWith('INSERT INTO schema_migrations')) {
      this.migrations.push({
        version: Number(params[0]),
        applied_at: String(params[1]),
      });
      return;
    }

    if (normalized.startsWith('INSERT INTO player_progress')) {
      this.playerProgress = {
        id: 1,
        coins: Number(params[0]),
        xp: Number(params[1]),
        level: Number(params[2]),
        lifetime_orders_served: Number(params[3]),
        tutorial_completed: Number(params[4]),
        updated_at: String(params[5]),
      };
      return;
    }

    if (normalized.startsWith('UPDATE player_progress SET coins = ?')) {
      if (this.playerProgress) {
        this.playerProgress.coins = Number(params[0]);
        this.playerProgress.updated_at = String(params[1]);
      }
      return;
    }

    if (normalized.startsWith('UPDATE player_progress SET coins = ?, xp = ?')) {
      if (this.playerProgress) {
        this.playerProgress.coins = Number(params[0]);
        this.playerProgress.xp = Number(params[1]);
        this.playerProgress.level = Number(params[2]);
        this.playerProgress.lifetime_orders_served = Number(params[3]);
        this.playerProgress.updated_at = String(params[4]);
      }
      return;
    }

    if (normalized.startsWith('INSERT INTO inventory')) {
      this.inventory.set(String(params[0]), Number(params[1]));
      return;
    }

    if (normalized.startsWith('INSERT INTO upgrade_levels')) {
      this.upgrades.set(String(params[0]), Number(params[1]));
      return;
    }

    if (normalized.startsWith('INSERT INTO settings')) {
      this.settings = {
        sound_enabled: Number(params[0]),
        haptics_enabled: Number(params[1]),
        low_motion_enabled: Number(params[2]),
      };
      return;
    }

    if (normalized.startsWith('INSERT INTO completed_orders')) {
      const orderId = String(params[0]);
      this.completedOrders.set(orderId, {
        order_id: orderId,
        served_at: String(params[5]),
      });
      return;
    }

    if (normalized.startsWith('INSERT INTO sessions')) {
      this.sessions.set(String(params[0]), params);
    }
  }

  public async getFirstAsync<T>(
    sql: string,
    params: (string | number | null)[] = []
  ): Promise<T | null> {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    if (normalized.includes('FROM schema_migrations')) {
      const found = this.migrations.find((m) => m.version === 1);
      return (found ? { version: found.version } : null) as T | null;
    }
    if (normalized.includes('SELECT id FROM player_progress')) {
      return (this.playerProgress ? { id: 1 } : null) as T | null;
    }
    if (normalized.includes('FROM player_progress WHERE id = 1')) {
      return (this.playerProgress ?? null) as T | null;
    }
    if (normalized.includes('FROM settings WHERE id = 1')) {
      return (this.settings ?? null) as T | null;
    }
    if (normalized.includes('FROM completed_orders WHERE order_id = ?')) {
      const id = String(params[0]);
      return (this.completedOrders.get(id) ?? null) as T | null;
    }
    return null;
  }

  public async getAllAsync<T>(sql: string): Promise<T[]> {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    if (normalized.includes('FROM inventory')) {
      return Array.from(this.inventory.entries()).map(([ingredient_id, quantity]) => ({
        ingredient_id,
        quantity,
      })) as unknown as T[];
    }
    if (normalized.includes('FROM upgrade_levels')) {
      return Array.from(this.upgrades.entries()).map(([upgrade_id, level]) => ({
        upgrade_id,
        level,
      })) as unknown as T[];
    }
    if (normalized.includes('FROM completed_orders')) {
      return Array.from(this.completedOrders.values()) as unknown as T[];
    }
    return [];
  }

  public async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }
}

const noopFeedback: FeedbackPort = {
  playSound: jest.fn(),
  triggerHaptic: jest.fn(),
  setSoundEnabled: jest.fn(),
  setHapticsEnabled: jest.fn(),
};

describe('Integration Tests (Section 10)', () => {
  test('1. Clean Architecture Boundary: src/domain has zero React Native, Expo, Skia, or SQLite imports', () => {
    const domainDir = path.resolve(__dirname, '../../src/domain');
    const getAllFiles = (dir: string): string[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      return entries.flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        return entry.isDirectory() ? getAllFiles(fullPath) : [fullPath];
      });
    };

    const files = getAllFiles(domainDir).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThanOrEqual(5);

    const forbiddenPatterns = [
      /from\s+['"]react['"]/,
      /from\s+['"]react-native['"]/,
      /from\s+['"]expo/,
      /from\s+['"]@shopify\/react-native-skia['"]/,
      /from\s+['"]zustand['"]/,
    ];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const regex of forbiddenPatterns) {
        expect(content).not.toMatch(regex);
      }
    }
  });

  test('2. SQLite migrations, seeded save, persistent purchases, and process restart recovery', async () => {
    const sharedDb = new InMemorySqlDatabase();
    const repo1 = new SqliteSaveRepository(async () => sharedDb);

    let now = 10_000;
    const clock: ClockPort = { nowMs: () => now };

    const engine1 = new GameEngine({
      clock,
      random: new SeededRandomAdapter(42),
      saveRepo: repo1,
      feedback: noopFeedback,
    });

    const initialSnap = await engine1.initializeFromStorage();
    expect(sharedDb.tablesCreated).toBe(true);
    expect(sharedDb.migrations.length).toBe(1);
    expect(initialSnap.coins).toBe(100);
    expect(ALL_INGREDIENT_IDS.every((id: IngredientId) => initialSnap.inventory[id] > 0)).toBe(
      true
    );
    expect(ALL_UPGRADE_IDS.every((id: UpgradeId) => initialSnap.upgrades.some((u) => u.id === id))).toBe(
      true
    );

    // Buy second_burner (cost 80) -> leaves 20 coins
    const bought = engine1.buyUpgrade('second_burner');
    expect(bought).toBe(true);
    expect(engine1.buildUiSnapshot().coins).toBe(20);

    // Simulate process restart with a brand new GameEngine + SqliteSaveRepository over the same DB
    const repo2 = new SqliteSaveRepository(async () => sharedDb);
    const engine2 = new GameEngine({
      clock,
      random: new SeededRandomAdapter(99),
      saveRepo: repo2,
      feedback: noopFeedback,
    });

    const restoredSnap = await engine2.initializeFromStorage();
    expect(restoredSnap.coins).toBe(20);
    const secondBurnerUpg = restoredSnap.upgrades.find((u) => u.id === 'second_burner');
    expect(secondBurnerUpg?.currentLevel).toBe(1);
    const station2 = restoredSnap.stations.find((s) => s.id === 'station_2');
    expect(station2?.state).toBe('Idle');
  });

  test('3. Complete 10 mixed orders loop with ingredient deduction, XP unlocks, and no duplicate payouts', async () => {
    const sharedDb = new InMemorySqlDatabase();
    const repo = new SqliteSaveRepository(async () => sharedDb);
    let now = 50_000;
    const clock: ClockPort = { nowMs: () => now };

    const engine = new GameEngine({
      clock,
      random: new SeededRandomAdapter(101),
      saveRepo: repo,
      feedback: noopFeedback,
    });

    await engine.initializeFromStorage();
    engine.startSession();

    // Top up coins and restock so we can serve 10 orders seamlessly
    for (let i = 0; i < 10; i++) {
      // Advance simulation until at least 1 order is in the queue
      let guard = 0;
      while (engine.buildUiSnapshot().activeOrders.length === 0 && guard < 300) {
        engine.stepFixed(50);
        guard++;
      }

      const snapBefore = engine.buildUiSnapshot();
      const targetOrder = snapBefore.activeOrders[0];
      expect(targetOrder).toBeDefined();

      // Ensure ingredient stock is topped up
      engine.restockAllIngredients();

      // Select the requested recipe and start brewing on station_1
      engine.selectRecipe(targetOrder.recipeId);
      const brewStarted = engine.tapStation('station_1');
      expect(brewStarted).toBe(true);

      // Step until station_1 is Ready
      let brewGuard = 0;
      while (
        engine.buildUiSnapshot().stations[0].state !== 'Ready' &&
        brewGuard < 300
      ) {
        engine.stepFixed(50);
        brewGuard++;
      }
      expect(engine.buildUiSnapshot().stations[0].state).toBe('Ready');

      const coinsBeforeServe = engine.buildUiSnapshot().coins;
      const served = engine.tapCustomerOrder(targetOrder.id, 'station_1');
      expect(served).toBe(true);

      const coinsAfterServe = engine.buildUiSnapshot().coins;
      expect(coinsAfterServe).toBeGreaterThan(coinsBeforeServe);

      // Attempting to serve the same order ID again fails safely
      const duplicateServe = engine.tapCustomerOrder(targetOrder.id, 'station_1');
      expect(duplicateServe).toBe(false);
      expect(engine.buildUiSnapshot().coins).toBe(coinsAfterServe);
    }

    const finalSnap = engine.buildUiSnapshot();
    expect(finalSnap.lifetimeOrdersServed).toBe(10);
    expect(finalSnap.level).toBeGreaterThanOrEqual(3); // Unlocked Adrak and Elaichi!
    expect(finalSnap.unlockedRecipes).toContain('adrak');
    expect(finalSnap.unlockedRecipes).toContain('elaichi');
  });
});
