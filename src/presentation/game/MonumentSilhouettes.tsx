import { Group, Path, Rect, RoundedRect } from '@shopify/react-native-skia';
import React from 'react';
import { MonumentConfig } from '../../content/themes';

interface MonumentSilhouetteProps {
  readonly monument: MonumentConfig;
  readonly centerX: number;
  readonly horizonY: number;
  readonly isRushHour: boolean;
}

/**
 * Procedural architectural silhouette renderer for the scenic landmark above the horizon line.
 * Implements crisp vector forms for:
 * 1. India Gate (Delhi)
 * 2. Gateway of India (Mumbai)
 * 3. Hawa Mahal (Jaipur)
 */
export const MonumentSilhouette: React.FC<MonumentSilhouetteProps> = ({
  monument,
  centerX,
  horizonY,
  isRushHour,
}) => {
  const fillColor = isRushHour
    ? monument.rushSilhouetteColor
    : monument.silhouetteColor;

  if (monument.monumentType === 'india_gate') {
    // Width: 120, Height: 76 sitting directly on horizon
    const w = 120;
    const h = 74;
    const left = Math.round(centerX - w / 2);
    const top = Math.round(horizonY - h);

    return (
      <Group opacity={0.88}>
        {/* Base Piers */}
        <Rect x={left} y={top + 20} width={w} height={h - 20} color={fillColor} />

        {/* Central Arch Cutout (Sky Show-Through) */}
        <RoundedRect
          x={left + 38}
          y={top + 34}
          width={44}
          height={h - 34}
          r={22}
          color="rgba(255, 255, 255, 0.35)"
        />

        {/* Stepped Attic Cornice */}
        <Rect x={left + 8} y={top + 10} width={w - 16} height={10} color={fillColor} />
        <Rect x={left + 22} y={top} width={w - 44} height={10} color={fillColor} />

        {/* Classical Crown Domelet */}
        <Path
          path={`M ${centerX - 10} ${top} Q ${centerX} ${top - 6} ${centerX + 10} ${top} Z`}
          color={fillColor}
        />
      </Group>
    );
  }

  if (monument.monumentType === 'gateway_of_india') {
    // Indo-Saracenic arch with central dome and 4 flanking minarets
    const w = 136;
    const h = 82;
    const left = Math.round(centerX - w / 2);
    const top = Math.round(horizonY - h);

    return (
      <Group opacity={0.88}>
        {/* Main Base Structure */}
        <Rect x={left + 16} y={top + 24} width={w - 32} height={h - 24} color={fillColor} />

        {/* Flanking Minaret Towers */}
        <Rect x={left} y={top + 12} width={16} height={h - 12} color={fillColor} />
        <Rect x={left + w - 16} y={top + 12} width={16} height={h - 12} color={fillColor} />

        {/* Minaret Domes */}
        <Path
          path={`M ${left} ${top + 12} Q ${left + 8} ${top + 4} ${left + 16} ${top + 12} Z`}
          color={fillColor}
        />
        <Path
          path={`M ${left + w - 16} ${top + 12} Q ${left + w - 8} ${top + 4} ${left + w} ${top + 12} Z`}
          color={fillColor}
        />

        {/* Grand Central Arch */}
        <RoundedRect
          x={left + 44}
          y={top + 38}
          width={48}
          height={h - 38}
          r={24}
          color="rgba(255, 255, 255, 0.35)"
        />

        {/* Central Dome */}
        <Path
          path={`M ${centerX - 24} ${top + 24} Q ${centerX} ${top} ${centerX + 24} ${top + 24} Z`}
          color={fillColor}
        />
        {/* Pinnacle */}
        <Rect x={centerX - 1.5} y={top - 4} width={3} height={8} color={fillColor} />
      </Group>
    );
  }

  // Hawa Mahal (Jaipur) — Pyramidal 5-story facade with rhythmic arched jharokhas
  const w = 126;
  const h = 86;
  const left = Math.round(centerX - w / 2);
  const top = Math.round(horizonY - h);

  return (
    <Group opacity={0.88}>
      {/* Tier 1 (Base) */}
      <Rect x={left} y={top + 60} width={w} height={h - 60} color={fillColor} />
      {/* Tier 2 */}
      <Rect x={left + 12} y={top + 42} width={w - 24} height={18} color={fillColor} />
      {/* Tier 3 */}
      <Rect x={left + 24} y={top + 26} width={w - 48} height={16} color={fillColor} />
      {/* Tier 4 */}
      <Rect x={left + 38} y={top + 12} width={w - 76} height={14} color={fillColor} />
      {/* Tier 5 (Peak Pavilion) */}
      <Rect x={left + 50} y={top + 4} width={w - 100} height={8} color={fillColor} />

      {/* Ornate Crown Dome */}
      <Path
        path={`M ${centerX - 12} ${top + 4} Q ${centerX} ${top - 6} ${centerX + 12} ${top + 4} Z`}
        color={fillColor}
      />

      {/* Intricate Jharokha Balcony Windows (Cutouts) */}
      {[-36, -18, 0, 18, 36].map((offset, i) => (
        <RoundedRect
          key={`w1_${i}`}
          x={centerX + offset - 5}
          y={top + 65}
          width={10}
          height={12}
          r={5}
          color="rgba(255, 255, 255, 0.35)"
        />
      ))}
      {[-24, 0, 24].map((offset, i) => (
        <RoundedRect
          key={`w2_${i}`}
          x={centerX + offset - 4}
          y={top + 46}
          width={8}
          height={10}
          r={4}
          color="rgba(255, 255, 255, 0.35)"
        />
      ))}
      {[-12, 12].map((offset, i) => (
        <RoundedRect
          key={`w3_${i}`}
          x={centerX + offset - 3.5}
          y={top + 29}
          width={7}
          height={8}
          r={3.5}
          color="rgba(255, 255, 255, 0.35)"
        />
      ))}
    </Group>
  );
};
