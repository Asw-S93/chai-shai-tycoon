import {
  CustomerArchetypeId,
  IngredientId,
  Money,
  OrderState,
  RecipeId,
  StationId,
  StationState,
  UpgradeCategory,
  UpgradeId,
} from '../value-objects';

export interface RecipeDefinition {
  readonly id: RecipeId;
  readonly name: string;
  readonly description: string;
  readonly ingredients: Partial<Record<IngredientId, number>>;
  readonly baseBrewTimeMs: number;
  readonly baseCoins: number;
  readonly xpReward: number;
  readonly unlockLevel: number;
}

export interface CustomerArchetype {
  readonly id: CustomerArchetypeId;
  readonly name: string;
  readonly basePatienceMs: number;
  readonly tipMultiplier: number; // e.g., 1.0 standard, 1.25 office worker, 0.5 student
  readonly normalSpawnWeight: number;
  readonly rushSpawnWeight: number;
}

export interface UpgradeDefinition {
  readonly id: UpgradeId;
  readonly name: string;
  readonly description: string;
  readonly category: UpgradeCategory;
  readonly maxLevel: number;
  readonly baseCost: number;
  readonly costMultiplier: number;
  readonly effectPerLevel: number; // interpretation depends on UpgradeId
}

/**
 * Customer Order Entity
 * Terminal transitions (Served, Expired) are idempotent.
 */
export class Order {
  public readonly id: string;
  public readonly customerId: string;
  public readonly customerName: string;
  public readonly archetypeId: CustomerArchetypeId;
  public readonly recipeId: RecipeId;
  public readonly createdAtMs: number;
  public readonly maxPatienceMs: number;
  private _remainingPatienceMs: number;
  private _state: OrderState;
  private _rewardClaimed: boolean;

  constructor(params: {
    id: string;
    customerId: string;
    customerName: string;
    archetypeId: CustomerArchetypeId;
    recipeId: RecipeId;
    createdAtMs: number;
    maxPatienceMs: number;
    remainingPatienceMs?: number;
    state?: OrderState;
    rewardClaimed?: boolean;
  }) {
    this.id = params.id;
    this.customerId = params.customerId;
    this.customerName = params.customerName;
    this.archetypeId = params.archetypeId;
    this.recipeId = params.recipeId;
    this.createdAtMs = params.createdAtMs;
    this.maxPatienceMs = Math.max(1000, params.maxPatienceMs);
    this._remainingPatienceMs =
      params.remainingPatienceMs !== undefined ? params.remainingPatienceMs : this.maxPatienceMs;
    this._state = params.state ?? 'Pending';
    this._rewardClaimed = params.rewardClaimed ?? false;
  }

  public get state(): OrderState {
    return this._state;
  }

  public get remainingPatienceMs(): number {
    return this._remainingPatienceMs;
  }

  public get rewardClaimed(): boolean {
    return this._rewardClaimed;
  }

  /**
   * Ratio between 0.0 and 1.0 representing remaining patience / satisfaction.
   */
  public get patienceRatio(): number {
    if (this._state === 'Expired') return 0;
    return Math.max(0, Math.min(1, this._remainingPatienceMs / this.maxPatienceMs));
  }

  /**
   * Advances patience timer. Returns true ONLY on the exact tick when the order transitions Pending -> Expired.
   * Idempotent if already Served or Expired.
   */
  public tickPatience(deltaMs: number): boolean {
    if (this._state !== 'Pending') {
      return false;
    }
    this._remainingPatienceMs = Math.max(0, this._remainingPatienceMs - Math.max(0, deltaMs));
    if (this._remainingPatienceMs <= 0) {
      this._state = 'Expired';
      return true;
    }
    return false;
  }

  /**
   * Marks the order as Served.
   * Returns true ONLY if transitioning from Pending -> Served for the first time.
   * Idempotent on subsequent calls or if Expired.
   */
  public markServed(): boolean {
    if (this._state !== 'Pending' || this._rewardClaimed) {
      return false;
    }
    this._state = 'Served';
    this._rewardClaimed = true;
    return true;
  }
}

/**
 * Brewing Station / BrewJob Entity
 * States: Locked | Idle | Brewing | Ready
 */
export class BrewStation {
  public readonly id: StationId;
  private _state: StationState;
  private _activeRecipeId: RecipeId | null;
  private _totalBrewTimeMs: number;
  private _elapsedBrewTimeMs: number;
  private _brewJobId: string | null;

  constructor(params: {
    id: StationId;
    state?: StationState;
    activeRecipeId?: RecipeId | null;
    totalBrewTimeMs?: number;
    elapsedBrewTimeMs?: number;
    brewJobId?: string | null;
  }) {
    this.id = params.id;
    this._state = params.state ?? 'Idle';
    this._activeRecipeId = params.activeRecipeId ?? null;
    this._totalBrewTimeMs = params.totalBrewTimeMs ?? 0;
    this._elapsedBrewTimeMs = params.elapsedBrewTimeMs ?? 0;
    this._brewJobId = params.brewJobId ?? null;
  }

  public get state(): StationState {
    return this._state;
  }

  public get activeRecipeId(): RecipeId | null {
    return this._activeRecipeId;
  }

  public get totalBrewTimeMs(): number {
    return this._totalBrewTimeMs;
  }

  public get elapsedBrewTimeMs(): number {
    return this._elapsedBrewTimeMs;
  }

  public get brewJobId(): string | null {
    return this._brewJobId;
  }

  public get progressRatio(): number {
    if (this._state === 'Ready') return 1;
    if (this._state !== 'Brewing' || this._totalBrewTimeMs <= 0) return 0;
    return Math.max(0, Math.min(1, this._elapsedBrewTimeMs / this._totalBrewTimeMs));
  }

  public unlock(): void {
    if (this._state === 'Locked') {
      this._state = 'Idle';
    }
  }

  public startBrew(recipeId: RecipeId, durationMs: number, jobId: string): boolean {
    if (this._state !== 'Idle') {
      return false;
    }
    this._state = 'Brewing';
    this._activeRecipeId = recipeId;
    this._totalBrewTimeMs = Math.max(500, durationMs);
    this._elapsedBrewTimeMs = 0;
    this._brewJobId = jobId;
    return true;
  }

  /**
   * Advances brew timer. Returns true on the exact tick when Brewing -> Ready.
   */
  public tick(deltaMs: number): boolean {
    if (this._state !== 'Brewing') {
      return false;
    }
    this._elapsedBrewTimeMs = Math.min(
      this._totalBrewTimeMs,
      this._elapsedBrewTimeMs + Math.max(0, deltaMs)
    );
    if (this._elapsedBrewTimeMs >= this._totalBrewTimeMs) {
      this._state = 'Ready';
      return true;
    }
    return false;
  }

  /**
   * Consumes the ready cup from the station and resets it to Idle.
   */
  public collectReadyCup(): { recipeId: RecipeId; brewJobId: string } | null {
    if (this._state !== 'Ready' || !this._activeRecipeId || !this._brewJobId) {
      return null;
    }
    const result = {
      recipeId: this._activeRecipeId,
      brewJobId: this._brewJobId,
    };
    this._state = 'Idle';
    this._activeRecipeId = null;
    this._totalBrewTimeMs = 0;
    this._elapsedBrewTimeMs = 0;
    this._brewJobId = null;
    return result;
  }

  public discardCup(): boolean {
    if (this._state !== 'Ready') {
      return false;
    }
    this._state = 'Idle';
    this._activeRecipeId = null;
    this._totalBrewTimeMs = 0;
    this._elapsedBrewTimeMs = 0;
    this._brewJobId = null;
    return true;
  }
}

/**
 * Player Wallet Entity with idempotent transaction tracking.
 */
export class Wallet {
  private _balance: Money;
  private readonly _processedTransactionIds: Set<string>;

  constructor(initialCoins: number = 100, processedIds: Iterable<string> = []) {
    this._balance = Money.of(initialCoins);
    this._processedTransactionIds = new Set(processedIds);
  }

  public get coins(): number {
    return this._balance.coins;
  }

  public get balance(): Money {
    return this._balance;
  }

  public hasProcessed(transactionId: string): boolean {
    return this._processedTransactionIds.has(transactionId);
  }

  /**
   * Credits coins for a unique transaction ID.
   * Rejects duplicate transaction IDs or negative amounts.
   */
  public credit(amount: number, transactionId: string): boolean {
    if (amount < 0 || !Number.isInteger(amount)) {
      throw new Error(`Invalid credit amount: ${amount}`);
    }
    if (this._processedTransactionIds.has(transactionId)) {
      return false;
    }
    this._balance = this._balance.add(Money.of(amount));
    this._processedTransactionIds.add(transactionId);
    return true;
  }

  /**
   * Debits coins if balance is sufficient and transactionId has not been processed.
   */
  public debit(cost: number, transactionId: string): boolean {
    if (cost < 0 || !Number.isInteger(cost)) {
      throw new Error(`Invalid debit amount: ${cost}`);
    }
    if (this._processedTransactionIds.has(transactionId)) {
      return false;
    }
    const costMoney = Money.of(cost);
    if (!this._balance.canAfford(costMoney)) {
      return false;
    }
    this._balance = this._balance.subtract(costMoney);
    this._processedTransactionIds.add(transactionId);
    return true;
  }
}

/**
 * Ingredient Inventory Entity
 */
export class Inventory {
  private readonly _stock: Record<IngredientId, number>;
  private _maxCapacityPerIngredient: number;

  constructor(
    initialStock?: Partial<Record<IngredientId, number>>,
    maxCapacityPerIngredient: number = 15
  ) {
    this._maxCapacityPerIngredient = Math.max(5, maxCapacityPerIngredient);
    this._stock = {
      tea: initialStock?.tea ?? 10,
      milk: initialStock?.milk ?? 10,
      sugar: initialStock?.sugar ?? 10,
      ginger: initialStock?.ginger ?? 6,
      cardamom: initialStock?.cardamom ?? 6,
      spices: initialStock?.spices ?? 6,
    };
  }

  public get maxCapacity(): number {
    return this._maxCapacityPerIngredient;
  }

  public setMaxCapacity(capacity: number): void {
    this._maxCapacityPerIngredient = Math.max(5, capacity);
  }

  public getStock(ingredient: IngredientId): number {
    return this._stock[ingredient] ?? 0;
  }

  public getSnapshot(): Record<IngredientId, number> {
    return { ...this._stock };
  }

  public hasIngredients(requirements: Partial<Record<IngredientId, number>>): boolean {
    for (const [key, needed] of Object.entries(requirements)) {
      const amount = needed ?? 0;
      if (amount > 0 && this.getStock(key as IngredientId) < amount) {
        return false;
      }
    }
    return true;
  }

  /**
   * Atomically deducts required ingredients. Returns false without modifying stock if any ingredient is insufficient.
   */
  public deduct(requirements: Partial<Record<IngredientId, number>>): boolean {
    if (!this.hasIngredients(requirements)) {
      return false;
    }
    for (const [key, needed] of Object.entries(requirements)) {
      const amount = needed ?? 0;
      if (amount > 0) {
        const id = key as IngredientId;
        this._stock[id] = this._stock[id] - amount;
      }
    }
    return true;
  }

  public addStock(ingredient: IngredientId, quantity: number): number {
    if (quantity <= 0) return this._stock[ingredient];
    this._stock[ingredient] = Math.min(
      this._maxCapacityPerIngredient,
      this._stock[ingredient] + Math.floor(quantity)
    );
    return this._stock[ingredient];
  }

  public restockAllToFull(): number {
    let totalUnitsAdded = 0;
    (Object.keys(this._stock) as IngredientId[]).forEach((id) => {
      const deficit = Math.max(0, this._maxCapacityPerIngredient - this._stock[id]);
      this._stock[id] += deficit;
      totalUnitsAdded += deficit;
    });
    return totalUnitsAdded;
  }
}

/**
 * Upgrade State Tracker
 */
export class UpgradeState {
  private readonly _levels: Record<UpgradeId, number>;

  constructor(initialLevels?: Partial<Record<UpgradeId, number>>) {
    this._levels = {
      faster_brewing: initialLevels?.faster_brewing ?? 0,
      second_burner: initialLevels?.second_burner ?? 0,
      larger_queue: initialLevels?.larger_queue ?? 0,
      better_tips: initialLevels?.better_tips ?? 0,
      larger_storage: initialLevels?.larger_storage ?? 0,
      additional_patience: initialLevels?.additional_patience ?? 0,
    };
  }

  public getLevel(id: UpgradeId): number {
    return this._levels[id] ?? 0;
  }

  public getSnapshot(): Record<UpgradeId, number> {
    return { ...this._levels };
  }

  public incrementLevel(id: UpgradeId, maxLevel: number): boolean {
    const current = this.getLevel(id);
    if (current >= maxLevel) {
      return false;
    }
    this._levels[id] = current + 1;
    return true;
  }
}
