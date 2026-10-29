import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { createSeededSaveSnapshot } from '../../src/infrastructure/persistence/schemas';
import { GameplayScreen } from '../../src/presentation/screens/GameplayScreen';
import { HomeScreen } from '../../src/presentation/screens/HomeScreen';
import { SettingsScreen } from '../../src/presentation/screens/SettingsScreen';
import { UpgradeShopScreen } from '../../src/presentation/screens/UpgradeShopScreen';
import { useGameStore } from '../../src/presentation/state/useGameStore';

describe('UI / E2E Smoke Flows (Section 10)', () => {
  beforeEach(() => {
    const engine = useGameStore.getState().engine;
    engine.hydrateFromSnapshot(createSeededSaveSnapshot());
    engine.publishSnapshotNow();
  });

  test('Home -> Start Session -> Brew -> Serve -> Shop -> Buy Upgrade -> Settings flow', async () => {
    // 1. Render Home Screen and verify initial 100 coins
    const home = await render(<HomeScreen />);
    expect(home.getByTestId('home-coins-text').props.children.join('')).toContain('100');

    // Start first shift
    await fireEvent.press(home.getByTestId('home-play-btn'));

    // 2. Render Gameplay Screen
    const gameplay = await render(<GameplayScreen />);

    // Skip tutorial overlay on first launch
    const skipBtn = gameplay.getByTestId('tutorial-skip-btn');
    await fireEvent.press(skipBtn);

    // Step engine forward 1000ms so first customer arrives
    await act(async () => {
      const engine = useGameStore.getState().engine;
      for (let i = 0; i < 20; i++) {
        engine.stepFixed(50);
      }
      engine.publishSnapshotNow();
    });

    const activeOrders = useGameStore.getState().snapshot.activeOrders;
    expect(activeOrders.length).toBe(1);
    const firstOrder = activeOrders[0];

    // Select Cutting Chai recipe and tap Kettle #1 to brew
    await fireEvent.press(gameplay.getByTestId('recipe-btn-cutting'));
    await fireEvent.press(gameplay.getByTestId('station-hitbox-station_1'));

    expect(useGameStore.getState().snapshot.stations[0].state).toBe('Brewing');

    // Advance 4000ms (80 steps of 50ms) to finish brewing Cutting Chai
    await act(async () => {
      const engine = useGameStore.getState().engine;
      for (let i = 0; i < 80; i++) {
        engine.stepFixed(50);
      }
      engine.publishSnapshotNow();
    });

    expect(useGameStore.getState().snapshot.stations[0].state).toBe('Ready');

    // Tap customer order to serve the ready cup
    await fireEvent.press(gameplay.getByTestId(`customer-order-${firstOrder.id}`));

    // Coins increased from 100 -> 113 (10 base + 3 tip)
    const coinsAfterServe = useGameStore.getState().snapshot.coins;
    expect(coinsAfterServe).toBeGreaterThan(100);

    // 3. Open Upgrade Shop and purchase High-Flame Brass Stove (faster_brewing, cost 45)
    const shop = await render(<UpgradeShopScreen />);
    await fireEvent.press(shop.getByTestId('buy-upgrade-faster_brewing'));

    const fasterBrewing = useGameStore
      .getState()
      .snapshot.upgrades.find((u) => u.id === 'faster_brewing');
    expect(fasterBrewing?.currentLevel).toBe(1);
    expect(useGameStore.getState().snapshot.coins).toBe(coinsAfterServe - 45);

    // 4. Open Settings Screen and verify sound/haptics/low-motion toggles work
    const settings = await render(<SettingsScreen />);
    await fireEvent(settings.getByTestId('toggle-sound'), 'valueChange', false);
    expect(useGameStore.getState().snapshot.settings.soundEnabled).toBe(false);

    await fireEvent(settings.getByTestId('toggle-low-motion'), 'valueChange', true);
    expect(useGameStore.getState().snapshot.settings.lowMotionEnabled).toBe(true);
  });
});
