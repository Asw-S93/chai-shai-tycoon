import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import {
  getCustomerStopMotionFrames,
  SPRITE_ASSETS,
} from '../../src/infrastructure/assets';
import { createSeededSaveSnapshot } from '../../src/infrastructure/persistence/schemas';
import { computeStopMotionFrameState } from '../../src/presentation/game/StopMotionSprite';
import {
  computeStreetVehiclePose,
  STREET_VEHICLE_TRACKS,
} from '../../src/presentation/game/StreetTrafficBanner';
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

  test('Stop-motion animation calculator steps discrete frames and freezes in low-motion mode', () => {
    const step0 = computeStopMotionFrameState({
      elapsedMs: 50,
      frameCount: 2,
      stepIntervalMs: 200,
      lowMotionEnabled: false,
      tiltStepsDeg: [-3, 3],
    });
    expect(step0.frameIndex).toBe(0);
    expect(step0.rotateDeg).toBe(-3);

    const step1 = computeStopMotionFrameState({
      elapsedMs: 250,
      frameCount: 2,
      stepIntervalMs: 200,
      lowMotionEnabled: false,
      tiltStepsDeg: [-3, 3],
    });
    expect(step1.frameIndex).toBe(1);
    expect(step1.rotateDeg).toBe(3);

    const frozen = computeStopMotionFrameState({
      elapsedMs: 950,
      frameCount: 2,
      stepIntervalMs: 200,
      lowMotionEnabled: true,
      tiltStepsDeg: [-3, 3],
    });
    expect(frozen.frameIndex).toBe(0);
    expect(frozen.rotateDeg).toBe(0);
    expect(frozen.translateY).toBe(0);
    expect(frozen.scaleX).toBe(1);
    expect(frozen.scaleY).toBe(1);
  });

  test('Female and male customer names map to gender-matched stop-motion character sprites', () => {
    expect(getCustomerStopMotionFrames('office_worker', 'Priya')).toBe(
      SPRITE_ASSETS.customersFemale.office_worker,
    );
    expect(getCustomerStopMotionFrames('office_worker', 'Rohan')).toBe(
      SPRITE_ASSETS.customers.office_worker,
    );
    expect(getCustomerStopMotionFrames('student', 'Diya')).toBe(
      SPRITE_ASSETS.customersFemale.student,
    );
    expect(getCustomerStopMotionFrames('regular', 'Bua Ji')).toBe(
      SPRITE_ASSETS.customersFemale.regular,
    );
  });

  test('Street traffic vehicles step across road and park cleanly in low-motion mode', () => {
    const autoTrack = STREET_VEHICLE_TRACKS.find((t) => t.id === 'autorickshaw')!;
    const scooterTrack = STREET_VEHICLE_TRACKS.find((t) => t.id === 'scooter')!;

    const poseT0 = computeStreetVehiclePose({
      track: autoTrack,
      bannerWidth: 360,
      elapsedMs: 0,
      isRushHour: false,
      lowMotionEnabled: false,
    });
    const poseT1 = computeStreetVehiclePose({
      track: autoTrack,
      bannerWidth: 360,
      elapsedMs: 1400,
      isRushHour: false,
      lowMotionEnabled: false,
    });
    expect(poseT1.translateX).toBeGreaterThan(poseT0.translateX);
    expect(poseT0.scaleX).toBe(1);

    const rtlParked = computeStreetVehiclePose({
      track: scooterTrack,
      bannerWidth: 360,
      elapsedMs: 5000,
      isRushHour: false,
      lowMotionEnabled: true,
    });
    expect(rtlParked.scaleX).toBe(-1);
    expect(rtlParked.rotateDeg).toBe(0);
    expect(rtlParked.translateY).toBe(0);
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
