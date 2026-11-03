import {
  computeStreetVehiclePose,
  STREET_VEHICLE_TRACKS,
} from '../../src/presentation/game/StreetTrafficBanner';

describe('Linear Traffic Movement & Vehicle Filtering (tests/unit/trafficLinear.test.ts)', () => {
  test('1. Cycle rickshaw is removed from active street vehicle tracks', () => {
    const trackIds = STREET_VEHICLE_TRACKS.map((t) => t.id);
    expect(trackIds).toEqual(['city_bus', 'autorickshaw', 'scooter']);
    expect(trackIds).not.toContain('cycle_rickshaw');
  });

  test('2. LTR vehicles (bus, autorickshaw) move strictly monotonically to the right during half-cycle', () => {
    const bannerWidth = 390;
    const busTrack = STREET_VEHICLE_TRACKS.find((t) => t.id === 'city_bus')!;
    expect(busTrack.direction).toBe('ltr');

    // Sample across 3 successive timestamps within a single cycle
    const t0 = 1000;
    const t1 = 2000;
    const t2 = 3000;

    const pose0 = computeStreetVehiclePose({
      track: busTrack,
      bannerWidth,
      elapsedMs: t0,
      isRushHour: false,
      lowMotionEnabled: false,
    });

    const pose1 = computeStreetVehiclePose({
      track: busTrack,
      bannerWidth,
      elapsedMs: t1,
      isRushHour: false,
      lowMotionEnabled: false,
    });

    const pose2 = computeStreetVehiclePose({
      track: busTrack,
      bannerWidth,
      elapsedMs: t2,
      isRushHour: false,
      lowMotionEnabled: false,
    });

    // Translation must be strictly monotonic increasing for LTR
    expect(pose1.translateX).toBeGreaterThan(pose0.translateX);
    expect(pose2.translateX).toBeGreaterThan(pose1.translateX);
  });

  test('3. RTL vehicle (scooter) moves strictly monotonically to the left during half-cycle', () => {
    const bannerWidth = 390;
    const scooterTrack = STREET_VEHICLE_TRACKS.find((t) => t.id === 'scooter')!;
    expect(scooterTrack.direction).toBe('rtl');

    const t0 = 500;
    const t1 = 1500;
    const t2 = 2500;

    const pose0 = computeStreetVehiclePose({
      track: scooterTrack,
      bannerWidth,
      elapsedMs: t0,
      isRushHour: false,
      lowMotionEnabled: false,
    });

    const pose1 = computeStreetVehiclePose({
      track: scooterTrack,
      bannerWidth,
      elapsedMs: t1,
      isRushHour: false,
      lowMotionEnabled: false,
    });

    const pose2 = computeStreetVehiclePose({
      track: scooterTrack,
      bannerWidth,
      elapsedMs: t2,
      isRushHour: false,
      lowMotionEnabled: false,
    });

    // Translation must be strictly monotonic decreasing for RTL
    expect(pose1.translateX).toBeLessThan(pose0.translateX);
    expect(pose2.translateX).toBeLessThan(pose1.translateX);
  });

  test('4. Rush hour accelerates linear velocity by 1.5x', () => {
    const bannerWidth = 400;
    const autoTrack = STREET_VEHICLE_TRACKS.find((t) => t.id === 'autorickshaw')!;

    const normalPose = computeStreetVehiclePose({
      track: autoTrack,
      bannerWidth,
      elapsedMs: 2000,
      isRushHour: false,
      lowMotionEnabled: false,
    });

    const rushPose = computeStreetVehiclePose({
      track: autoTrack,
      bannerWidth,
      elapsedMs: 2000,
      isRushHour: true,
      lowMotionEnabled: false,
    });

    // Rush hour speedup means greater translation advance from starting origin
    expect(rushPose.translateX).toBeGreaterThan(normalPose.translateX);
  });

  test('5. Low motion parks all vehicles at fixed parkedRatio coordinates without jitter', () => {
    const bannerWidth = 360;
    for (const track of STREET_VEHICLE_TRACKS) {
      const poseA = computeStreetVehiclePose({
        track,
        bannerWidth,
        elapsedMs: 1000,
        isRushHour: false,
        lowMotionEnabled: true,
      });

      const poseB = computeStreetVehiclePose({
        track,
        bannerWidth,
        elapsedMs: 8500,
        isRushHour: true,
        lowMotionEnabled: true,
      });

      expect(poseA.translateX).toBe(Math.round(bannerWidth * track.parkedRatio));
      expect(poseA.translateX).toBe(poseB.translateX);
      expect(poseA.rotateDeg).toBe(0);
      expect(poseA.translateY).toBe(0);
    }
  });

  test('6. Micro stop-motion engine rumble preserves tilt bounds (-1.5deg to +1.5deg)', () => {
    const bannerWidth = 390;
    const busTrack = STREET_VEHICLE_TRACKS[0];

    for (let t = 0; t <= 1000; t += 70) {
      const pose = computeStreetVehiclePose({
        track: busTrack,
        bannerWidth,
        elapsedMs: t,
        isRushHour: false,
        lowMotionEnabled: false,
      });
      expect(pose.rotateDeg).toBeGreaterThanOrEqual(-1.5);
      expect(pose.rotateDeg).toBeLessThanOrEqual(1.5);
      expect(pose.translateY).toBeGreaterThanOrEqual(-2);
      expect(pose.translateY).toBeLessThanOrEqual(0);
    }
  });
});
