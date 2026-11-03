import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SPRITE_ASSETS, StreetVehicleId } from '../../infrastructure/assets';
import { COLORS, RADIUS } from '../theme';

export interface StreetVehicleTrackConfig {
  readonly id: StreetVehicleId;
  readonly width: number;
  readonly height: number;
  readonly laneBottomPx: number;
  readonly direction: 'ltr' | 'rtl';
  readonly cycleDurationMs: number;
  readonly phaseOffsetMs: number;
  readonly parkedRatio: number;
}

export interface StreetVehiclePose {
  readonly translateX: number;
  readonly translateY: number;
  readonly rotateDeg: number;
  readonly scaleX: number;
}

const CHUG_TILT_STEPS: readonly number[] = [-1.5, 0, 1.5, 0];
const CHUG_BOUNCE_STEPS: readonly number[] = [0, -2, 0, -1];

/**
 * Pure deterministic linear pose calculator for passing street vehicles.
 * Calculates smooth continuous linear translation (x(t) = x0 + v*t) for
 * buses, auto-rickshaws, and scooters across the street, accelerating during
 * Rush Hour and parking cleanly when `lowMotionEnabled` is enabled.
 */
export function computeStreetVehiclePose(params: {
  readonly track: StreetVehicleTrackConfig;
  readonly bannerWidth: number;
  readonly elapsedMs: number;
  readonly isRushHour: boolean;
  readonly lowMotionEnabled: boolean;
}): StreetVehiclePose {
  const { track, bannerWidth, elapsedMs, isRushHour, lowMotionEnabled } = params;
  const baseFlip = track.direction === 'rtl' ? -1 : 1;

  if (lowMotionEnabled || bannerWidth <= 0) {
    return {
      translateX: Math.round(bannerWidth * track.parkedRatio),
      translateY: 0,
      rotateDeg: 0,
      scaleX: baseFlip,
    };
  }

  // Linear, continuous motion driven directly by elapsed time
  const speedMultiplier = isRushHour ? 1.5 : 1.0;
  const effectiveMs = Math.max(0, elapsedMs) * speedMultiplier;
  const totalSpan = bannerWidth + track.width * 2.4;
  const cycleProgress =
    ((effectiveMs + track.phaseOffsetMs) % track.cycleDurationMs) /
    track.cycleDurationMs;

  const rawX =
    track.direction === 'ltr'
      ? -track.width * 1.2 + cycleProgress * totalSpan
      : bannerWidth + track.width * 0.2 - cycleProgress * totalSpan;

  // Subtle stop-motion engine rumble while moving linearly
  const stepIndex = Math.floor(Math.max(0, elapsedMs) / 140);
  const rotateDeg = CHUG_TILT_STEPS[stepIndex % CHUG_TILT_STEPS.length] ?? 0;
  const translateY = CHUG_BOUNCE_STEPS[stepIndex % CHUG_BOUNCE_STEPS.length] ?? 0;

  return {
    translateX: Math.round(rawX),
    translateY,
    rotateDeg,
    scaleX: baseFlip,
  };
}

export const STREET_VEHICLE_TRACKS: readonly StreetVehicleTrackConfig[] = [
  {
    id: 'city_bus',
    width: 96,
    height: 64,
    laneBottomPx: 8,
    direction: 'ltr',
    cycleDurationMs: 14_000,
    phaseOffsetMs: 1_500,
    parkedRatio: 0.08,
  },
  {
    id: 'autorickshaw',
    width: 74,
    height: 54,
    laneBottomPx: 2,
    direction: 'ltr',
    cycleDurationMs: 9_500,
    phaseOffsetMs: 4_800,
    parkedRatio: 0.42,
  },
  {
    id: 'scooter',
    width: 60,
    height: 48,
    laneBottomPx: 0,
    direction: 'rtl',
    cycleDurationMs: 7_500,
    phaseOffsetMs: 1_800,
    parkedRatio: 0.82,
  },
] as const;

export interface StreetTrafficBannerProps {
  readonly width: number;
  readonly height?: number;
  readonly elapsedMs: number;
  readonly isRushHour: boolean;
  readonly lowMotionEnabled: boolean;
  readonly testID?: string;
}

/**
 * Dynamic Indian Street-Art & Moving Traffic Diorama rendered above the Chai Stall.
 * Shows hand-painted peacock/floral street murals, overhanging banyan/gulmohar trees
 * with fairy lights, and two lanes of stop-motion buses, auto-rickshaws, scooters,
 * and cycle rickshaws passing by.
 */
export const StreetTrafficBanner: React.FC<StreetTrafficBannerProps> = ({
  width,
  height = 84,
  elapsedMs,
  isRushHour,
  lowMotionEnabled,
  testID = 'street-traffic-banner',
}) => {
  return (
    <View
      testID={testID}
      style={[styles.container, { width, height }]}
      pointerEvents="none"
    >
      {/* Street Art Mural Wall, Trees, Fairy Lights & Curb Road */}
      <Image
        source={SPRITE_ASSETS.streetBackdrop}
        style={[styles.backdrop, { width, height }]}
        resizeMode="cover"
      />

      {/* Rush Hour Sunset Glaze */}
      {isRushHour && <View style={styles.rushSunsetGlaze} />}

      {/* Moving Stop-Motion Street Vehicles (Bus, Cycle Rickshaw, Auto-Rickshaw, Scooter) */}
      {STREET_VEHICLE_TRACKS.map((track) => {
        const pose = computeStreetVehiclePose({
          track,
          bannerWidth: width,
          elapsedMs,
          isRushHour,
          lowMotionEnabled,
        });

        return (
          <View
            key={track.id}
            testID={`street-vehicle-${track.id}`}
            style={[
              styles.vehicleWrap,
              {
                width: track.width,
                height: track.height,
                bottom: track.laneBottomPx,
                transform: [
                  { translateX: pose.translateX },
                  { translateY: pose.translateY },
                  { rotate: `${pose.rotateDeg}deg` },
                  { scaleX: pose.scaleX },
                ],
              },
            ]}
          >
            <Image
              source={SPRITE_ASSETS.vehicles[track.id]}
              style={{ width: track.width, height: track.height }}
              resizeMode="contain"
            />
          </View>
        );
      })}

      {/* Subtle Location / Rush Traffic Pill */}
      <View style={styles.streetBadge}>
        <Text style={styles.streetBadgeText}>
          {isRushHour ? '🛺 Bazaar Rush Traffic • Honk! 📯' : '🎨 Chowk Street Art & Bazaar Road'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#A9C8B2',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.teaBrown,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  rushSunsetGlaze: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(244, 130, 36, 0.22)',
  },
  vehicleWrap: {
    position: 'absolute',
    left: 0,
  },
  streetBadge: {
    position: 'absolute',
    top: 4,
    left: 8,
    backgroundColor: 'rgba(59, 31, 17, 0.72)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  streetBadgeText: {
    color: COLORS.cream,
    fontSize: 9,
    fontWeight: '800',
  },
});
