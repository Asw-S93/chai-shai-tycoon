import { create } from 'zustand';
import { GameUiSnapshot } from '../../application/dto';
import { GameEngine } from '../../application/engine';
import { SaveRepositoryPort } from '../../domain/ports';
import {
  IngredientId,
  RecipeId,
  StationId,
  UpgradeId,
} from '../../domain/value-objects';
import { createDeviceSaveRepository } from '../../infrastructure/persistence/expoSqliteAdapter';
import {
  ExpoFeedbackAdapter,
  SeededRandomAdapter,
  SystemClockAdapter,
} from '../../infrastructure/platform';

export interface GameStoreState {
  isInitialized: boolean;
  snapshot: GameUiSnapshot;
  engine: GameEngine;
  initializeApp: () => Promise<void>;
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSessionEarly: () => void;
  selectRecipe: (recipeId: RecipeId) => void;
  tapStation: (stationId: StationId) => boolean;
  discardReadyCup: (stationId: StationId) => boolean;
  tapCustomerOrder: (orderId: string, preferredStationId?: StationId) => boolean;
  buyUpgrade: (upgradeId: UpgradeId) => boolean;
  restockIngredient: (ingredientId: IngredientId) => boolean;
  restockAll: () => boolean;
  completeTutorial: () => void;
  replayTutorial: () => void;
  updateSettings: (
    partial: Partial<GameUiSnapshot['settings']>
  ) => void;
}

/**
 * Explicit constructor-based factory that wires domain/application ports to infrastructure adapters
 * and creates a Zustand store bound to throttled UI snapshots.
 */
export function createGameStore(customSaveRepo?: SaveRepositoryPort) {
  const clock = new SystemClockAdapter();
  const random = new SeededRandomAdapter();
  const saveRepo = customSaveRepo ?? createDeviceSaveRepository();
  const feedback = new ExpoFeedbackAdapter();

  const engine = new GameEngine({
    clock,
    random,
    saveRepo,
    feedback,
  });

  const initialSnapshot = engine.buildUiSnapshot();

  return create<GameStoreState>((set, get) => {
    // Subscribe to throttled engine snapshots
    engine.onSnapshot((nextSnapshot) => {
      set({ snapshot: nextSnapshot });
    });

    return {
      isInitialized: false,
      snapshot: initialSnapshot,
      engine,
      initializeApp: async () => {
        if (get().isInitialized) return;
        const snap = await engine.initializeFromStorage();
        set({ isInitialized: true, snapshot: snap });
      },
      startSession: () => {
        engine.startSession();
      },
      pauseSession: () => {
        engine.pauseSession();
      },
      resumeSession: () => {
        engine.resumeSession();
      },
      endSessionEarly: () => {
        engine.completeSession();
      },
      selectRecipe: (recipeId: RecipeId) => {
        engine.selectRecipe(recipeId);
      },
      tapStation: (stationId: StationId) => {
        return engine.tapStation(stationId);
      },
      discardReadyCup: (stationId: StationId) => {
        return engine.discardReadyStationCup(stationId);
      },
      tapCustomerOrder: (orderId: string, preferredStationId?: StationId) => {
        return engine.tapCustomerOrder(orderId, preferredStationId);
      },
      buyUpgrade: (upgradeId: UpgradeId) => {
        return engine.buyUpgrade(upgradeId);
      },
      restockIngredient: (ingredientId: IngredientId) => {
        return engine.restockIngredient(ingredientId);
      },
      restockAll: () => {
        return engine.restockAllIngredients();
      },
      completeTutorial: () => {
        engine.completeTutorial();
      },
      replayTutorial: () => {
        engine.resetTutorialForReplay();
      },
      updateSettings: (partial) => {
        engine.updateSettings(partial);
      },
    };
  });
}

export const useGameStore = createGameStore();
