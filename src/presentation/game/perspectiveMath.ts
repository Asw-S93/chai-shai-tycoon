/**
 * Mathematical formulations for the One-Point Perspective Background System.
 * Calculates vanishing point convergence, depth-scaling for distant objects,
 * and positions of atmospheric monuments and animated props.
 */

export interface VanishingPoint {
  readonly x: number;
  readonly y: number;
}

export function computeVanishingPoint(
  width: number,
  height: number,
  horizonRatio = 0.38,
): VanishingPoint {
  return {
    x: Math.round(width / 2),
    y: Math.round(height * Math.max(0.2, Math.min(0.6, horizonRatio))),
  };
}

/**
 * Calculates depth scaling factor based on vertical distance from horizon line:
 * S(y) = minScale + (maxScale - minScale) * ((y - y_horizon) / (totalHeight - y_horizon))
 */
export function computeDepthScale(
  y: number,
  horizonY: number,
  totalHeight: number,
  minScale = 0.45,
  maxScale = 1.0,
): number {
  if (totalHeight <= horizonY) return maxScale;
  const clampedY = Math.max(horizonY, Math.min(totalHeight, y));
  const ratio = (clampedY - horizonY) / (totalHeight - horizonY);
  return Number((minScale + (maxScale - minScale) * ratio).toFixed(3));
}

export interface PerspectiveRoadGeometry {
  readonly vanishingPoint: VanishingPoint;
  readonly leftCurbStart: { x: number; y: number };
  readonly leftCurbEnd: { x: number; y: number };
  readonly rightCurbStart: { x: number; y: number };
  readonly rightCurbEnd: { x: number; y: number };
  readonly roadPolygonPath: string;
}

export function computePerspectiveRoadGeometry(
  width: number,
  height: number,
  horizonY: number,
): PerspectiveRoadGeometry {
  const vp = computeVanishingPoint(width, height, horizonY / height);
  const roadTopWidth = Math.max(24, Math.round(width * 0.12));
  const roadBottomWidth = Math.round(width * 0.88);

  const leftCurbStart = { x: Math.round(vp.x - roadTopWidth / 2), y: horizonY };
  const leftCurbEnd = { x: Math.round((width - roadBottomWidth) / 2), y: height };

  const rightCurbStart = { x: Math.round(vp.x + roadTopWidth / 2), y: horizonY };
  const rightCurbEnd = { x: Math.round((width + roadBottomWidth) / 2), y: height };

  const roadPolygonPath = `M ${leftCurbStart.x} ${leftCurbStart.y} L ${rightCurbStart.x} ${rightCurbStart.y} L ${rightCurbEnd.x} ${rightCurbEnd.y} L ${leftCurbEnd.x} ${leftCurbEnd.y} Z`;

  return {
    vanishingPoint: vp,
    leftCurbStart,
    leftCurbEnd,
    rightCurbStart,
    rightCurbEnd,
    roadPolygonPath,
  };
}

export interface AnimatedSkyPropPose {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotateDeg: number;
  readonly opacity: number;
}

/**
 * Calculates smooth gliding motion for birds / kites circling above the horizon line.
 */
export function computeSkyPropPose(params: {
  readonly index: number;
  readonly elapsedMs: number;
  readonly width: number;
  readonly horizonY: number;
  readonly propType: 'pigeon' | 'seagull' | 'kite';
  readonly lowMotionEnabled: boolean;
}): AnimatedSkyPropPose {
  const { index, elapsedMs, width, horizonY, propType, lowMotionEnabled } = params;

  if (lowMotionEnabled || width <= 0) {
    const defaultX = Math.round(width * (0.25 + index * 0.25));
    const defaultY = Math.round(horizonY * 0.35 + index * 12);
    return {
      x: defaultX,
      y: defaultY,
      scale: 1.0,
      rotateDeg: propType === 'kite' ? 12 : 0,
      opacity: 0.85,
    };
  }

  const speedMs = propType === 'kite' ? 12_000 : 8_000;
  const phase = ((elapsedMs + index * 2_800) % speedMs) / speedMs;

  let x = 0;
  let y = 0;
  let rotateDeg = 0;
  const scale = 0.75 + (index % 2) * 0.25;

  if (propType === 'kite') {
    // Fluttering kite tethered to a gentle figure-8 sway
    const centerX = width * 0.75 - index * 60;
    const centerY = horizonY * 0.45;
    x = Math.round(centerX + Math.sin(phase * Math.PI * 4) * 28);
    y = Math.round(centerY + Math.cos(phase * Math.PI * 2) * 16);
    rotateDeg = Math.round(Math.sin(phase * Math.PI * 4) * 14 + 10);
  } else if (propType === 'seagull') {
    // Coastal soaring gliding from sea horizon across the sky
    const totalSpan = width + 80;
    x = Math.round(-40 + phase * totalSpan);
    y = Math.round(horizonY * 0.35 + Math.sin(phase * Math.PI * 6) * 12);
    rotateDeg = Math.round(Math.cos(phase * Math.PI * 6) * 8);
  } else {
    // Pigeons circling above India Gate arch in an elliptical orbit
    const orbitCenterX = width * 0.5 + (index === 0 ? -40 : 40);
    const orbitCenterY = horizonY * 0.4;
    const radiusX = 55 + index * 18;
    const radiusY = 22 + index * 8;
    const angle = phase * Math.PI * 2 * (index === 0 ? 1 : -1);

    x = Math.round(orbitCenterX + Math.cos(angle) * radiusX);
    y = Math.round(orbitCenterY + Math.sin(angle) * radiusY);
    rotateDeg = Math.round(Math.sin(angle) * 16);
  }

  return {
    x,
    y: Math.max(8, Math.min(horizonY - 8, y)),
    scale,
    rotateDeg,
    opacity: 0.9,
  };
}
