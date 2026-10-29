import { CUSTOMERS_CATALOG } from '../../src/content/customers';
import { RECIPES_CATALOG, RECIPE_BY_ID } from '../../src/content/recipes';
import { UPGRADES_CATALOG, UPGRADE_BY_ID } from '../../src/content/upgrades';
import {
  BrewStation,
  Inventory,
  Order,
  UpgradeState,
  Wallet,
} from '../../src/domain/entities';
import {
  ClockPort,
  FeedbackPort,
  PlayerSaveSnapshot,
  RandomPort,
  SaveRepositoryPort,
} from '../../src/domain/ports';
import { BrewingRules, EconomyRules, QueueRules } from '../../src/domain/services';
import { Money } from '../../src/domain/value-objects';
import { GameEngine } from '../../src/application/engine';
import {
  BuyUpgradeUseCase,
  ServeOrderUseCase,
  StartBrewUseCase,
} from '../../src/application/use-cases';
import { createSeededSaveSnapshot } from '../../src/infrastructure/persistence/schemas';

class FakeClock implements ClockPort {
  public currentMs = 1_000_000;
  public nowMs(): number {
    return this.currentMs;
  }
}

class DeterministicRandom implements RandomPort {
  private values: number[];
  private idx = 0;
  private idCounter = 0;

  constructor(values: number[] = [0.1, 0.4, 0.7, 0.9]) {
    this.values = values;
  }

  public nextFloat(): number {
    const val = this.values[this.idx % this.values.length];
    this.idx++;
    return val;
  }

  public nextId(prefix = 'id'): string {
    this.idCounter++;
    return `${prefix}_${this.idCounter}`;
  }
}

const noopFeedback: FeedbackPort = {
  playSound: jest.fn(),
  triggerHaptic: jest.fn(),
  setSoundEnabled: jest.fn(),
  setHapticsEnabled: jest.fn(),
};

function createMemorySaveRepo(initial?: PlayerSaveSnapshot): SaveRepositoryPort {
  let state = initial ?? createSeededSaveSnapshot();
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    loadSave: jest.fn().mockImplementation(async () => state),
    saveProgress: jest.fn().mockImplementation(async (s: PlayerSaveSnapshot) => {
      state = s;
    }),
    recordUpgradePurchase: jest.fn().mockResolvedValue(true),
    recordOrderServed: jest.fn().mockResolvedValue(true),
    recordSessionCompleted: jest.fn().mockResolvedValue(undefined),
    updateSettings: jest.fn().mockResolvedValue(undefined),
  };
}

describe('Domain & Application Unit Tests (Section 10)', () => {
  test('1. Wallet rejects negatives and overspending; Money never goes negative', () => {
    expect(() => Money.of(-5)).toThrow();
    const wallet = new Wallet(100);
    expect(wallet.coins).toBe(100);

    expect(() => wallet.credit(-10, 'tx_neg')).toThrow();
    expect(wallet.debit(150, 'tx_overspend')).toBe(false);
    expect(wallet.coins).toBe(100);

    expect(wallet.debit(45, 'tx_valid_spend')).toBe(true);
    expect(wallet.coins).toBe(55);
  });

  test('2. Reward is credited exactly once; duplicate transaction IDs are rejected', () => {
    const wallet = new Wallet(100);
    expect(wallet.credit(12, 'serve_order_1')).toBe(true);
    expect(wallet.coins).toBe(112);

    // Duplicate credit with same transaction ID is rejected
    expect(wallet.credit(12, 'serve_order_1')).toBe(false);
    expect(wallet.coins).toBe(112);
  });

  test('3. Order expires exactly once and terminal states are idempotent', () => {
    const order = new Order({
      id: 'ord_1',
      customerId: 'c_1',
      customerName: 'Rohan',
      archetypeId: 'office_worker',
      recipeId: 'cutting',
      createdAtMs: 0,
      maxPatienceMs: 5000,
    });

    expect(order.state).toBe('Pending');
    expect(order.tickPatience(3000)).toBe(false);
    expect(order.remainingPatienceMs).toBe(2000);

    // Exact transition tick returns true
    expect(order.tickPatience(2000)).toBe(true);
    expect(order.state).toBe('Expired');

    // Subsequent ticks return false (idempotent)
    expect(order.tickPatience(1000)).toBe(false);
    // Expired order cannot be marked served
    expect(order.markServed()).toBe(false);
  });

  test('4. Inventory is deducted exactly once when brew starts', () => {
    const inv = new Inventory({ tea: 5, milk: 5, sugar: 5 }, 15);
    const station = new BrewStation({ id: 'station_1', state: 'Idle' });
    const upgrades = new UpgradeState();
    const random = new DeterministicRandom();

    const first = StartBrewUseCase.execute({
      station,
      recipeId: 'cutting',
      playerLevel: 1,
      inventory: inv,
      upgrades,
      sessionElapsedMs: 1000,
      random,
    });

    expect(first.started).toBe(true);
    expect(inv.getStock('tea')).toBe(4);
    expect(inv.getStock('milk')).toBe(4);
    expect(inv.getStock('sugar')).toBe(4);

    // Tapping again while Brewing does NOT deduct ingredients a second time
    const second = StartBrewUseCase.execute({
      station,
      recipeId: 'cutting',
      playerLevel: 1,
      inventory: inv,
      upgrades,
      sessionElapsedMs: 1200,
      random,
    });

    expect(second.started).toBe(false);
    expect(second.reason).toBe('station_not_idle');
    expect(inv.getStock('tea')).toBe(4);
  });

  test('5. Wrong recipe match never rewards and preserves both order and ready cup', () => {
    const station = new BrewStation({ id: 'station_1', state: 'Idle' });
    station.startBrew('cutting', 4000, 'job_1');
    station.tick(4000);
    expect(station.state).toBe('Ready');

    const order = new Order({
      id: 'ord_adrak',
      customerId: 'c_2',
      customerName: 'Priya',
      archetypeId: 'regular',
      recipeId: 'adrak',
      createdAtMs: 0,
      maxPatienceMs: 28000,
    });

    const wallet = new Wallet(100);
    const upgrades = new UpgradeState();

    const res = ServeOrderUseCase.execute({
      station,
      order,
      wallet,
      upgrades,
      currentXp: 0,
      currentLevel: 2,
      sessionElapsedMs: 5000,
    });

    expect(res.served).toBe(false);
    expect(res.reason).toBe('recipe_mismatch');
    expect(res.totalCoins).toBe(0);
    expect(wallet.coins).toBe(100);
    // Order is still Pending and cup is still Ready on the station
    expect(order.state).toBe('Pending');
    expect(station.state).toBe('Ready');
    expect(res.events[0]?.type).toBe('ORDER_MISMATCH');
  });

  test('6. Idempotent served events: serving the same order twice only rewards once', () => {
    const station1 = new BrewStation({ id: 'station_1', state: 'Idle' });
    station1.startBrew('cutting', 4000, 'job_1');
    station1.tick(4000);

    const station2 = new BrewStation({ id: 'station_2', state: 'Idle' });
    station2.startBrew('cutting', 4000, 'job_2');
    station2.tick(4000);

    const order = new Order({
      id: 'ord_10',
      customerId: 'c_10',
      customerName: 'Kabir',
      archetypeId: 'regular',
      recipeId: 'cutting',
      createdAtMs: 0,
      maxPatienceMs: 28000,
    });

    const wallet = new Wallet(100);
    const upgrades = new UpgradeState();

    const firstServe = ServeOrderUseCase.execute({
      station: station1,
      order,
      wallet,
      upgrades,
      currentXp: 0,
      currentLevel: 1,
      sessionElapsedMs: 4000,
    });

    expect(firstServe.served).toBe(true);
    const balanceAfterFirst = wallet.coins;
    expect(balanceAfterFirst).toBeGreaterThan(100);

    const secondServe = ServeOrderUseCase.execute({
      station: station2,
      order,
      wallet,
      upgrades,
      currentXp: firstServe.newXp,
      currentLevel: firstServe.newLevel,
      sessionElapsedMs: 4100,
    });

    expect(secondServe.served).toBe(false);
    expect(wallet.coins).toBe(balanceAfterFirst);
  });

  test('7. Tips are bounded strictly to 0-30% of base reward', () => {
    const upgrades = new UpgradeState({ better_tips: 4 }); // Max tip upgrade
    const orderFullPatience = new Order({
      id: 'ord_tip',
      customerId: 'c_tip',
      customerName: 'Vikram',
      archetypeId: 'office_worker',
      recipeId: 'masala', // 24 base coins -> 30% max tip is floor(7.2) = 7
      createdAtMs: 0,
      maxPatienceMs: 22000,
    });

    const reward = EconomyRules.calculateServeReward(
      RECIPE_BY_ID.masala,
      orderFullPatience,
      CUSTOMERS_CATALOG[0],
      upgrades,
      UPGRADE_BY_ID.better_tips
    );

    expect(reward.baseCoins).toBe(24);
    expect(reward.tipCoins).toBeLessThanOrEqual(Math.floor(24 * 0.3));
    expect(reward.tipCoins).toBe(7);
  });

  test('8. Upgrade max-level enforcement & insufficient funds check', () => {
    const wallet = new Wallet(500);
    const upgrades = new UpgradeState();
    const inventory = new Inventory();
    const stations = {
      station_1: new BrewStation({ id: 'station_1', state: 'Idle' }),
      station_2: new BrewStation({ id: 'station_2', state: 'Locked' }),
    };
    const random = new DeterministicRandom();

    // second_burner has maxLevel = 1 (cost 80)
    const firstBuy = BuyUpgradeUseCase.execute({
      upgradeId: 'second_burner',
      wallet,
      upgrades,
      inventory,
      stations,
      timestampMs: 0,
      random,
    });
    expect(firstBuy.purchased).toBe(true);
    expect(stations.station_2.state).toBe('Idle');

    // Buying again at max level fails safely without deducting coins
    const coinsBefore = wallet.coins;
    const secondBuy = BuyUpgradeUseCase.execute({
      upgradeId: 'second_burner',
      wallet,
      upgrades,
      inventory,
      stations,
      timestampMs: 0,
      random,
    });
    expect(secondBuy.purchased).toBe(false);
    expect(secondBuy.reason).toBe('max_level_reached');
    expect(wallet.coins).toBe(coinsBefore);
  });

  test('9. Rush-hour wave at 90s-120s halves spawn interval with 2.5s floor', () => {
    expect(QueueRules.isRushHour(89_999)).toBe(false);
    expect(QueueRules.isRushHour(90_000)).toBe(true);
    expect(QueueRules.isRushHour(119_999)).toBe(true);
    expect(QueueRules.isRushHour(120_000)).toBe(false);

    // Normal 6500ms -> halved to 3250ms during rush
    expect(QueueRules.calculateEffectiveSpawnIntervalMs(6500, 50_000)).toBe(6500);
    expect(QueueRules.calculateEffectiveSpawnIntervalMs(6500, 95_000)).toBe(3250);

    // Floor at 2500ms
    expect(QueueRules.calculateEffectiveSpawnIntervalMs(4000, 95_000)).toBe(2500);
  });

  test('10. Game clock pause prevents timers from advancing while paused/backgrounded', () => {
    const clock = new FakeClock();
    const random = new DeterministicRandom([0.2, 0.5, 0.8]);
    const saveRepo = createMemorySaveRepo();
    const engine = new GameEngine({
      clock,
      random,
      saveRepo,
      feedback: noopFeedback,
    });

    engine.startSession();
    engine.stepFixed(1000); // Spawns first customer
    const snapBeforePause = engine.buildUiSnapshot();
    expect(snapBeforePause.activeOrders.length).toBe(1);
    const initialPatience = snapBeforePause.activeOrders[0].remainingPatienceMs;

    engine.pauseSession();
    // Advance wall clock by 60 seconds while paused
    clock.currentMs += 60_000;
    engine.updateFromWallClock();
    engine.stepFixed(5000);

    const snapDuringPause = engine.buildUiSnapshot();
    expect(snapDuringPause.activeOrders[0].remainingPatienceMs).toBe(initialPatience);

    engine.resumeSession();
    engine.stepFixed(1000);
    const snapAfterResume = engine.buildUiSnapshot();
    expect(snapAfterResume.activeOrders[0].remainingPatienceMs).toBe(
      initialPatience - 1000
    );
  });

  test('11. Deterministic customer spawning produces identical sequences for identical seeds', () => {
    const runSequence = () => {
      const r = new DeterministicRandom([0.15, 0.65, 0.85, 0.25]);
      return [
        QueueRules.selectCustomerArchetype(CUSTOMERS_CATALOG, false, r.nextFloat()).id,
        QueueRules.selectUnlockedRecipe(RECIPES_CATALOG, r.nextFloat()).id,
        QueueRules.selectCustomerArchetype(CUSTOMERS_CATALOG, true, r.nextFloat()).id,
        QueueRules.selectUnlockedRecipe(RECIPES_CATALOG, r.nextFloat()).id,
      ];
    };

    expect(runSequence()).toEqual(runSequence());
    expect(UPGRADES_CATALOG.length).toBe(6);
    expect(RECIPES_CATALOG.length).toBe(4);
    expect(BrewingRules.isRecipeUnlocked(RECIPE_BY_ID.cutting, 1)).toBe(true);
    expect(BrewingRules.isRecipeUnlocked(RECIPE_BY_ID.masala, 4)).toBe(false);
    expect(BrewingRules.isRecipeUnlocked(RECIPE_BY_ID.masala, 5)).toBe(true);
  });
});
