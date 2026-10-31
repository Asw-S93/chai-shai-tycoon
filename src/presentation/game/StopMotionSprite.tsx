import React from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

export interface StopMotionCalcInput {
  readonly elapsedMs: number;
  readonly frameCount: number;
  readonly stepIntervalMs: number;
  readonly lowMotionEnabled: boolean;
  readonly phaseOffsetMs?: number;
  readonly tiltStepsDeg?: readonly number[];
  readonly bounceStepsPx?: readonly number[];
  readonly scaleSteps?: readonly (readonly [number, number])[];
}

export interface StopMotionFrameState {
  readonly stepIndex: number;
  readonly frameIndex: number;
  readonly rotateDeg: number;
  readonly translateY: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

const DEFAULT_TILT_STEPS: readonly number[] = [-2.5, 0, 2.5, 0];
const DEFAULT_BOUNCE_STEPS: readonly number[] = [0, -2, 0, -1];
const DEFAULT_SCALE_STEPS: readonly (readonly [number, number])[] = [
  [1, 1],
  [1.03, 0.97],
  [1, 1],
  [0.98, 1.02],
];

/**
 * Pure deterministic stop-motion frame & transform calculator.
 * Steps at discrete intervals (e.g. 4-8 FPS) to produce a handcrafted
 * claymation / paper-cutout stop-motion feel, and freezes at frame 0 when
 * `lowMotionEnabled` is true.
 */
export function computeStopMotionFrameState(
  input: StopMotionCalcInput,
): StopMotionFrameState {
  const safeFrameCount = Math.max(1, input.frameCount);
  if (input.lowMotionEnabled || input.stepIntervalMs <= 0) {
    return {
      stepIndex: 0,
      frameIndex: 0,
      rotateDeg: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
    };
  }

  const effectiveElapsed = Math.max(
    0,
    input.elapsedMs + (input.phaseOffsetMs ?? 0),
  );
  const stepIndex = Math.floor(effectiveElapsed / input.stepIntervalMs);
  const frameIndex = stepIndex % safeFrameCount;

  const tilts =
    input.tiltStepsDeg && input.tiltStepsDeg.length > 0
      ? input.tiltStepsDeg
      : DEFAULT_TILT_STEPS;
  const bounces =
    input.bounceStepsPx && input.bounceStepsPx.length > 0
      ? input.bounceStepsPx
      : DEFAULT_BOUNCE_STEPS;
  const scales =
    input.scaleSteps && input.scaleSteps.length > 0
      ? input.scaleSteps
      : DEFAULT_SCALE_STEPS;

  const rotateDeg = tilts[stepIndex % tilts.length] ?? 0;
  const translateY = bounces[stepIndex % bounces.length] ?? 0;
  const scalePair = scales[stepIndex % scales.length] ?? [1, 1];

  return {
    stepIndex,
    frameIndex,
    rotateDeg,
    translateY,
    scaleX: scalePair[0],
    scaleY: scalePair[1],
  };
}

export interface StopMotionSpriteProps {
  readonly frames: readonly ImageSourcePropType[];
  readonly width: number;
  readonly height: number;
  readonly elapsedMs: number;
  readonly stepIntervalMs?: number;
  readonly lowMotionEnabled?: boolean;
  readonly phaseOffsetMs?: number;
  readonly tiltStepsDeg?: readonly number[];
  readonly bounceStepsPx?: readonly number[];
  readonly scaleSteps?: readonly (readonly [number, number])[];
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

/**
 * Renders a 2D stop-motion character or prop sprite that alternates between
 * discrete keyframes and quantized paper-cutout transforms.
 */
export const StopMotionSprite: React.FC<StopMotionSpriteProps> = ({
  frames,
  width,
  height,
  elapsedMs,
  stepIntervalMs = 220,
  lowMotionEnabled = false,
  phaseOffsetMs = 0,
  tiltStepsDeg,
  bounceStepsPx,
  scaleSteps,
  style,
  testID,
}) => {
  const frameState = computeStopMotionFrameState({
    elapsedMs,
    frameCount: frames.length,
    stepIntervalMs,
    lowMotionEnabled,
    phaseOffsetMs,
    tiltStepsDeg,
    bounceStepsPx,
    scaleSteps,
  });

  const activeSource = frames[frameState.frameIndex] ?? frames[0];

  return (
    <View
      testID={testID}
      style={[
        styles.wrapper,
        {
          width,
          height,
          transform: [
            { translateY: frameState.translateY },
            { rotate: `${frameState.rotateDeg}deg` },
            { scaleX: frameState.scaleX },
            { scaleY: frameState.scaleY },
          ],
        },
        style,
      ]}
    >
      <Image
        source={activeSource}
        style={{ width, height }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
