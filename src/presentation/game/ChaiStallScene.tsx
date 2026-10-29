import {
  Canvas,
  Circle,
  Group,
  Path,
  Rect,
  RoundedRect,
  Skia,
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { OrderViewModel, StationViewModel } from '../../application/dto';
import { StationId } from '../../domain/value-objects';
import {
  CUSTOMER_VISUAL_MANIFEST,
  RECIPE_VISUAL_MANIFEST,
} from '../../infrastructure/assets';
import { COLORS, MIN_TOUCH_TARGET_DP, RADIUS, SPACING } from '../theme';

interface ChaiStallSceneProps {
  orders: readonly OrderViewModel[];
  stations: readonly StationViewModel[];
  selectedReadyStationId: StationId | null;
  isRushHour: boolean;
  lowMotionEnabled: boolean;
  decorLevel: number;
  helperLevel: number;
  sessionElapsedMs: number;
  onTapCustomerOrder: (orderId: string) => void;
  onTapStation: (stationId: StationId) => void;
  onDiscardReadyCup: (stationId: StationId) => void;
}

/**
 * Interactive 2D Chai Stall Scene powered by @shopify/react-native-skia
 * with coordinated accessible touch targets (>= 48dp) for customers and kettles.
 */
export const ChaiStallScene: React.FC<ChaiStallSceneProps> = ({
  orders,
  stations,
  selectedReadyStationId,
  isRushHour,
  lowMotionEnabled,
  decorLevel,
  helperLevel,
  sessionElapsedMs,
  onTapCustomerOrder,
  onTapStation,
  onDiscardReadyCup,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const canvasWidth = Math.max(320, Math.min(windowWidth, 600));
  const canvasHeight = 320;

  // Pre-build canopy awning stripes
  const stripeCount = 7;
  const stripeWidth = canvasWidth / stripeCount;

  // Animated steam offset (disabled when lowMotionEnabled is true)
  const animPhase = lowMotionEnabled
    ? 0
    : ((sessionElapsedMs % 2000) / 2000) * Math.PI * 2;

  // Pre-cached SVG path string for festive marigold garland when decor upgrade is owned
  const garlandPath = useMemo(() => {
    const segments = 6;
    const segW = canvasWidth / segments;
    let d = `M 0 34`;
    for (let i = 0; i < segments; i++) {
      const startX = i * segW;
      d += ` Q ${Math.round(startX + segW / 2)} 54 ${Math.round(startX + segW)} 34`;
    }
    return Skia.Path.MakeFromSVGString(d) ?? d;
  }, [canvasWidth]);

  return (
    <View style={[styles.container, { width: canvasWidth, height: canvasHeight }]}>
      {/* Layer 1: Skia 2D Illustrated Chai Shop World */}
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Warm Bazaar Sky / Wall Background */}
        <Rect
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
          color={isRushHour ? '#FDE2B8' : '#FFF3DC'}
        />

        {/* Distant Bazaar Arch Silhouette */}
        <RoundedRect
          x={canvasWidth * 0.08}
          y={36}
          width={canvasWidth * 0.84}
          height={130}
          r={24}
          color="#F5DFBB"
        />

        {/* Stall Canopy Awning */}
        {Array.from({ length: stripeCount }).map((_, idx) => (
          <Rect
            key={`stripe_${idx}`}
            x={idx * stripeWidth}
            y={0}
            width={stripeWidth + 1}
            height={34}
            color={idx % 2 === 0 ? COLORS.terracotta : COLORS.cream}
          />
        ))}
        <Rect x={0} y={32} width={canvasWidth} height={4} color={COLORS.teaBrown} />

        {/* Rising Shop Decor: Marigold Garland & Lanterns when decorLevel > 0 */}
        {decorLevel > 0 && (
          <Group>
            <Path
              path={garlandPath}
              color={COLORS.saffron}
              style="stroke"
              strokeWidth={4}
            />
            <Circle cx={canvasWidth * 0.25} cy={46} r={7} color={COLORS.gold} />
            <Circle cx={canvasWidth * 0.5} cy={46} r={7} color={COLORS.terracotta} />
            <Circle cx={canvasWidth * 0.75} cy={46} r={7} color={COLORS.gold} />
          </Group>
        )}

        {/* Chhotu Helper Silhouette behind counter when helperLevel > 0 */}
        {helperLevel > 0 && (
          <Group>
            <Circle cx={canvasWidth - 46} cy={145} r={14} color={COLORS.teaBrownMid} />
            <RoundedRect
              x={canvasWidth - 62}
              y={160}
              width={32}
              height={28}
              r={8}
              color={COLORS.cardamom}
            />
          </Group>
        )}

        {/* Customer Queue Counter Shelf */}
        <Rect
          x={0}
          y={156}
          width={canvasWidth}
          height={14}
          color={COLORS.teaBrownMid}
        />

        {/* Lower Wooden Tapri Brewing Counter */}
        <Rect
          x={0}
          y={170}
          width={canvasWidth}
          height={150}
          color={COLORS.teaBrown}
        />
        <RoundedRect
          x={12}
          y={178}
          width={canvasWidth - 24}
          height={134}
          r={14}
          color="#4E2A17"
        />

        {/* Skia Illustrated Burners & Kettles */}
        {stations.map((st, idx) => {
          const cx =
            idx === 0 ? canvasWidth * 0.28 : canvasWidth * 0.72;
          const cy = 246;
          const isBrewing = st.state === 'Brewing';
          const isReady = st.state === 'Ready';
          const isLocked = st.state === 'Locked';
          const isSelectedReady = selectedReadyStationId === st.id && isReady;

          const recipeVis = st.activeRecipeId
            ? RECIPE_VISUAL_MANIFEST[st.activeRecipeId]
            : null;

          return (
            <Group key={st.id}>
              {/* Selection Halo for Ready Cup */}
              {isSelectedReady && (
                <Circle
                  cx={cx}
                  cy={cy}
                  r={54}
                  color="rgba(244, 162, 54, 0.32)"
                />
              )}

              {/* Brass Burner Base */}
              <Circle
                cx={cx}
                cy={cy + 14}
                r={42}
                color={isLocked ? '#3A2316' : '#2A160C'}
              />

              {/* Active Stove Flame Ring */}
              {isBrewing && (
                <Circle
                  cx={cx}
                  cy={cy + 14}
                  r={36 + Math.sin(animPhase * 2) * 2}
                  color={COLORS.saffron}
                />
              )}

              {/* Kettle / Tapeli Vessel */}
              <RoundedRect
                x={cx - 32}
                y={cy - 22}
                width={64}
                height={52}
                r={14}
                color={
                  isLocked
                    ? '#5A463B'
                    : isReady
                    ? COLORS.cardamom
                    : '#C87D55'
                }
              />

              {/* Tea Liquid Color Progress inside Kettle */}
              {(isBrewing || isReady) && recipeVis && (
                <RoundedRect
                  x={cx - 26}
                  y={cy - 14 + (1 - st.progressRatio) * 24}
                  width={52}
                  height={Math.max(8, st.progressRatio * 34)}
                  r={8}
                  color={recipeVis.primaryColorHex}
                />
              )}

              {/* Rising Steam Particles when Brewing or Ready */}
              {(isBrewing || isReady) && (
                <Group>
                  <Circle
                    cx={cx - 10 + Math.sin(animPhase) * 4}
                    cy={cy - 34 - ((sessionElapsedMs % 1000) / 1000) * 14}
                    r={5}
                    color="rgba(255, 248, 231, 0.65)"
                  />
                  <Circle
                    cx={cx + 10 - Math.sin(animPhase) * 4}
                    cy={cy - 42 - (((sessionElapsedMs + 500) % 1000) / 1000) * 14}
                    r={6}
                    color="rgba(255, 248, 231, 0.5)"
                  />
                </Group>
              )}
            </Group>
          );
        })}
      </Canvas>

      {/* Layer 2: Accessible Interactive Customer Queue Overlay (Top Half) */}
      <View style={styles.customerQueueRow} pointerEvents="box-none">
        {orders.length === 0 ? (
          <View style={styles.waitingBanner}>
            <Text style={styles.waitingBannerText}>
              Warming the kettle... customers arriving soon!
            </Text>
          </View>
        ) : (
          orders.slice(0, 4).map((order) => {
            const custVis = CUSTOMER_VISUAL_MANIFEST[order.archetypeId];
            const recipeVis = RECIPE_VISUAL_MANIFEST[order.recipeId];
            const patiencePct = Math.round(order.patienceRatio * 100);
            const moodGlyph =
              order.patienceRatio > 0.6
                ? '😊'
                : order.patienceRatio > 0.3
                ? '😐'
                : '😤';
            const barColor =
              order.patienceRatio > 0.55
                ? COLORS.cardamom
                : order.patienceRatio > 0.25
                ? COLORS.saffron
                : COLORS.danger;

            return (
              <Pressable
                key={order.id}
                testID={`customer-order-${order.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Customer ${order.customerName} wants ${order.recipeName}, patience ${patiencePct} percent. Tap to serve.`}
                onPress={() => onTapCustomerOrder(order.id)}
                style={({ pressed }) => [
                  styles.customerCard,
                  { borderColor: custVis.primaryColorHex },
                  pressed && styles.pressedScale,
                ]}
              >
                {/* Order Speech Bubble */}
                <View style={styles.orderBubble}>
                  <Text style={styles.orderEmoji}>{recipeVis.badgeGlyph}</Text>
                  <Text style={styles.orderRecipeText} numberOfLines={1}>
                    {order.recipeName.replace(' Chai', '')}
                  </Text>
                </View>

                {/* Customer Avatar Silhouette + Mood */}
                <View
                  style={[
                    styles.customerAvatar,
                    { backgroundColor: custVis.primaryColorHex },
                  ]}
                >
                  <Text style={styles.customerGlyph}>{custVis.badgeGlyph}</Text>
                  <Text style={styles.moodBadge}>{moodGlyph}</Text>
                </View>

                <Text style={styles.customerNameText} numberOfLines={1}>
                  {order.customerName}
                </Text>

                {/* Patience Bar + Numeric Seconds (Visually redundant for accessibility) */}
                <View style={styles.patienceTrack}>
                  <View
                    style={[
                      styles.patienceFill,
                      {
                        width: `${Math.max(5, patiencePct)}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.patienceSecText}>
                  {Math.ceil(order.remainingPatienceMs / 1000)}s
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      {/* Layer 3: Accessible Interactive Brewing Station Hitboxes (Bottom Half) */}
      <View style={styles.stationsRow} pointerEvents="box-none">
        {stations.map((st) => {
          const isReady = st.state === 'Ready';
          const isBrewing = st.state === 'Brewing';
          const isLocked = st.state === 'Locked';
          const isSelected = selectedReadyStationId === st.id && isReady;

          return (
            <View key={st.id} style={styles.stationSlot}>
              <Pressable
                testID={`station-hitbox-${st.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${st.label}, status ${st.state}${
                  st.activeRecipeName ? `, ${st.activeRecipeName}` : ''
                }`}
                onPress={() => onTapStation(st.id)}
                style={({ pressed }) => [
                  styles.stationHitbox,
                  isSelected && styles.stationHitboxSelected,
                  isLocked && styles.stationHitboxLocked,
                  pressed && styles.pressedScale,
                ]}
              >
                <Text style={styles.stationTitle}>{st.label}</Text>

                {st.state === 'Idle' && (
                  <View style={styles.stationBadgeIdle}>
                    <Text style={styles.stationActionText}>TAP TO BREW</Text>
                  </View>
                )}

                {isBrewing && (
                  <View style={styles.stationBadgeBrewing}>
                    <Text style={styles.stationRecipeLabel}>
                      {st.activeRecipeName}
                    </Text>
                    <Text style={styles.stationTimerText}>
                      {st.remainingSeconds.toFixed(1)}s ({Math.round(st.progressRatio * 100)}%)
                    </Text>
                  </View>
                )}

                {isReady && (
                  <View style={styles.stationBadgeReady}>
                    <Text style={styles.stationReadyTitle}>
                      ☕ {st.activeRecipeName} READY!
                    </Text>
                    <Text style={styles.stationActionText}>
                      {isSelected ? 'TAP CUSTOMER ABOVE ↑' : 'TAP TO SELECT CUP'}
                    </Text>
                  </View>
                )}

                {isLocked && (
                  <View style={styles.stationBadgeLocked}>
                    <Text style={styles.stationLockedText}>🔒 Locked Burner</Text>
                  </View>
                )}
              </Pressable>

              {/* Small Discard Button when a cup is Ready in case player brewed wrong chai */}
              {isReady && (
                <Pressable
                  testID={`discard-cup-${st.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Empty ${st.label}`}
                  onPress={() => onDiscardReadyCup(st.id)}
                  style={styles.discardBtn}
                >
                  <Text style={styles.discardBtnText}>Empty ✕</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.teaBrown,
    backgroundColor: COLORS.cream,
  },
  customerQueueRow: {
    position: 'absolute',
    top: 38,
    left: 6,
    right: 6,
    height: 122,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  waitingBanner: {
    backgroundColor: 'rgba(255, 248, 231, 0.92)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.saffron,
  },
  waitingBannerText: {
    color: COLORS.teaBrown,
    fontWeight: '700',
    fontSize: 13,
  },
  customerCard: {
    width: 82,
    minHeight: 112,
    backgroundColor: COLORS.milkWhite,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
  },
  orderBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.creamWarm,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.saffron,
  },
  orderEmoji: {
    fontSize: 12,
    marginRight: 2,
  },
  orderRecipeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.teaBrown,
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  customerGlyph: {
    fontSize: 18,
  },
  moodBadge: {
    position: 'absolute',
    bottom: -4,
    right: -6,
    fontSize: 13,
  },
  customerNameText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.teaBrown,
  },
  patienceTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5D4C0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  patienceFill: {
    height: '100%',
  },
  patienceSecText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.mutedText,
  },
  stationsRow: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    height: 132,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stationSlot: {
    width: '46%',
    alignItems: 'center',
  },
  stationHitbox: {
    width: '100%',
    minHeight: Math.max(MIN_TOUCH_TARGET_DP, 96),
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 248, 231, 0.45)',
    backgroundColor: 'rgba(59, 31, 17, 0.55)',
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stationHitboxSelected: {
    borderColor: COLORS.gold,
    borderWidth: 3,
    backgroundColor: 'rgba(74, 124, 89, 0.78)',
  },
  stationHitboxLocked: {
    borderColor: '#6D5447',
    backgroundColor: 'rgba(40, 24, 15, 0.72)',
  },
  stationTitle: {
    color: COLORS.cream,
    fontSize: 12,
    fontWeight: '800',
  },
  stationBadgeIdle: {
    backgroundColor: COLORS.saffron,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  stationBadgeBrewing: {
    alignItems: 'center',
    backgroundColor: 'rgba(244, 162, 54, 0.25)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  stationBadgeReady: {
    alignItems: 'center',
    backgroundColor: COLORS.cardamom,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  stationBadgeLocked: {
    paddingVertical: 6,
  },
  stationRecipeLabel: {
    color: COLORS.cream,
    fontSize: 11,
    fontWeight: '700',
  },
  stationTimerText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '900',
  },
  stationReadyTitle: {
    color: COLORS.cream,
    fontSize: 11,
    fontWeight: '900',
  },
  stationActionText: {
    color: COLORS.teaBrown,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  stationLockedText: {
    color: '#B89F91',
    fontSize: 11,
    fontWeight: '700',
  },
  discardBtn: {
    marginTop: 4,
    backgroundColor: COLORS.terracottaDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  discardBtnText: {
    color: COLORS.cream,
    fontSize: 10,
    fontWeight: '700',
  },
  pressedScale: {
    transform: [{ scale: 0.96 }],
  },
});
