import {
  computeDepthScale,
  computePerspectiveRoadGeometry,
  computeSkyPropPose,
  computeVanishingPoint,
} from '../../src/presentation/game/perspectiveMath';

describe('One-Point Perspective Geometry & Calculations (tests/unit/perspectiveMath.test.ts)', () => {
  test('1. computeVanishingPoint centers horizontally and positions on horizon ratio', () => {
    const vp = computeVanishingPoint(400, 100, 0.38);
    expect(vp.x).toBe(200);
    expect(vp.y).toBe(38);
  });

  test('2. computeDepthScale scales objects from minScale at horizon to maxScale at bottom', () => {
    const horizonY = 40;
    const totalHeight = 100;

    // At horizon line -> minScale (0.45)
    const scaleHorizon = computeDepthScale(40, horizonY, totalHeight, 0.45, 1.0);
    expect(scaleHorizon).toBe(0.45);

    // Mid-distance -> ~0.725
    const scaleMid = computeDepthScale(70, horizonY, totalHeight, 0.45, 1.0);
    expect(scaleMid).toBeCloseTo(0.725, 2);

    // At bottom curb -> maxScale (1.0)
    const scaleForeground = computeDepthScale(100, horizonY, totalHeight, 0.45, 1.0);
    expect(scaleForeground).toBe(1.0);
  });

  test('3. computePerspectiveRoadGeometry generates converging curb lines toward vanishing point', () => {
    const width = 360;
    const height = 90;
    const horizonY = 34;

    const geom = computePerspectiveRoadGeometry(width, height, horizonY);
    expect(geom.vanishingPoint.x).toBe(180);
    expect(geom.vanishingPoint.y).toBe(34);

    // Left curb starts near VP and flares out to bottom left
    expect(geom.leftCurbStart.y).toBe(horizonY);
    expect(geom.leftCurbEnd.y).toBe(height);
    expect(geom.leftCurbEnd.x).toBeLessThan(geom.leftCurbStart.x);

    // Right curb starts near VP and flares out to bottom right
    expect(geom.rightCurbStart.y).toBe(horizonY);
    expect(geom.rightCurbEnd.y).toBe(height);
    expect(geom.rightCurbEnd.x).toBeGreaterThan(geom.rightCurbStart.x);

    // Road polygon path starts with M and closes with Z
    expect(geom.roadPolygonPath).toMatch(/^M \d+ \d+ L \d+ \d+ L \d+ \d+ L \d+ \d+ Z$/);
  });

  test('4. computeSkyPropPose produces graceful flight paths above horizon for all bird/kite types', () => {
    const width = 390;
    const horizonY = 42;

    const pigeonPose = computeSkyPropPose({
      index: 0,
      elapsedMs: 1500,
      width,
      horizonY,
      propType: 'pigeon',
      lowMotionEnabled: false,
    });
    expect(pigeonPose.y).toBeLessThanOrEqual(horizonY);
    expect(pigeonPose.opacity).toBeGreaterThan(0);

    const seagullPose = computeSkyPropPose({
      index: 1,
      elapsedMs: 2500,
      width,
      horizonY,
      propType: 'seagull',
      lowMotionEnabled: false,
    });
    expect(seagullPose.y).toBeLessThanOrEqual(horizonY);

    const kitePose = computeSkyPropPose({
      index: 0,
      elapsedMs: 3500,
      width,
      horizonY,
      propType: 'kite',
      lowMotionEnabled: false,
    });
    expect(kitePose.y).toBeLessThanOrEqual(horizonY);
  });

  test('5. computeSkyPropPose freezes safely without jitter when lowMotionEnabled is active', () => {
    const width = 360;
    const horizonY = 40;

    const poseA = computeSkyPropPose({
      index: 0,
      elapsedMs: 1000,
      width,
      horizonY,
      propType: 'pigeon',
      lowMotionEnabled: true,
    });

    const poseB = computeSkyPropPose({
      index: 0,
      elapsedMs: 8000,
      width,
      horizonY,
      propType: 'pigeon',
      lowMotionEnabled: true,
    });

    expect(poseA.x).toBe(poseB.x);
    expect(poseA.y).toBe(poseB.y);
    expect(poseA.rotateDeg).toBe(poseB.rotateDeg);
  });
});
