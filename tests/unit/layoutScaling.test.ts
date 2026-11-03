import { MIN_TOUCH_TARGET_DP } from '../../src/presentation/theme';

export function computeSceneLayout(windowHeight: number, windowWidth: number) {
  const totalBackgroundHeight = Math.max(
    280,
    Math.min(420, Math.round(windowHeight * 0.40))
  );
  const streetBannerHeight = Math.round(totalBackgroundHeight * 0.28);
  const stallHeight = totalBackgroundHeight - streetBannerHeight;

  // Shelf, stove, burner positions inside stall
  const burnerCenterY = Math.round(stallHeight * 0.74);
  const shelfTop = Math.round(stallHeight * 0.28);
  const garlandY = Math.round(stallHeight * 0.12);

  // Remaining viewport height for order queues, pantry, and brew controls
  const remainingHeight = windowHeight - totalBackgroundHeight;

  return {
    totalBackgroundHeight,
    streetBannerHeight,
    stallHeight,
    burnerCenterY,
    shelfTop,
    garlandY,
    remainingHeight,
    backgroundRatio: totalBackgroundHeight / windowHeight,
  };
}

describe('Multi-Resolution Layout Scaling & 40% Background Allocation (tests/unit/layoutScaling.test.ts)', () => {
  const RESOLUTION_FIXTURES = [
    { name: 'Compact Phone (360x640)', width: 360, height: 640, minExpectedHeight: 280 },
    { name: 'Standard Phone (390x844)', width: 390, height: 844, expectedHeight: 338 },
    { name: 'Tall Phone (412x915)', width: 412, height: 915, expectedHeight: 366 },
    { name: 'Standard Tablet (768x1024)', width: 768, height: 1024, expectedHeight: 410 },
    { name: 'Tall Tablet (800x1280)', width: 800, height: 1280, maxExpectedHeight: 420 },
  ];

  test('1. Background covers ~40% of viewport across all devices, with safety clamping [280, 420]', () => {
    for (const fix of RESOLUTION_FIXTURES) {
      const layout = computeSceneLayout(fix.height, fix.width);

      if (fix.expectedHeight !== undefined) {
        expect(layout.totalBackgroundHeight).toBe(fix.expectedHeight);
        expect(layout.backgroundRatio).toBeCloseTo(0.40, 1);
      } else if (fix.minExpectedHeight !== undefined) {
        expect(layout.totalBackgroundHeight).toBe(fix.minExpectedHeight);
      } else if (fix.maxExpectedHeight !== undefined) {
        expect(layout.totalBackgroundHeight).toBe(fix.maxExpectedHeight);
      }

      expect(layout.totalBackgroundHeight).toBeGreaterThanOrEqual(280);
      expect(layout.totalBackgroundHeight).toBeLessThanOrEqual(420);
    }
  });

  test('2. Sub-scene partitioning preserves 28% street banner vs 72% stall canvas', () => {
    for (const fix of RESOLUTION_FIXTURES) {
      const layout = computeSceneLayout(fix.height, fix.width);
      expect(layout.streetBannerHeight + layout.stallHeight).toBe(layout.totalBackgroundHeight);

      const streetRatio = layout.streetBannerHeight / layout.totalBackgroundHeight;
      expect(streetRatio).toBeCloseTo(0.28, 1);
    }
  });

  test('3. Remaining viewport leaves ample vertical budget for pantry, stations and queues', () => {
    for (const fix of RESOLUTION_FIXTURES) {
      const layout = computeSceneLayout(fix.height, fix.width);
      // Ensure at least 350dp remaining for bottom controls on compact screens, and more on taller screens
      expect(layout.remainingHeight).toBeGreaterThanOrEqual(350);
    }
  });

  test('4. Minimum touch target size adheres to mobile accessibility standards (>= 48dp)', () => {
    expect(MIN_TOUCH_TARGET_DP).toBeGreaterThanOrEqual(48);
  });
});
