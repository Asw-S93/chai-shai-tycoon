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
  Image,
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
  getCustomerStopMotionFrames,
  RECIPE_VISUAL_MANIFEST,
  SPRITE_ASSETS,
} from '../../infrastructure/assets';
import { COLORS, MIN_TOUCH_TARGET_DP, RADIUS, SPACING } from '../theme';
import { StopMotionSprite } from './StopMotionSprite';
import { StreetTrafficBanner } from './StreetTrafficBanner';

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

const CALM_TILT_STEPS = [-2, 0, 2, 0] as const;
const FRANTIC_TILT_STEPS = [-5, 3, -4, 5] as const;
const KETTLE_BOIL_TILT_STEPS = [-3.5, 3.5, -2.5, 2.5] as const;
const KETTLE_BOIL_BOUNCE_STEPS = [0, -3, -1, -2] as const;

/**
 * Interactive 2D Chai Stall Scene with an upper Dynamic Indian Street-Art &
 * Moving Traffic Diorama (`StreetTrafficBanner`) and lower Tapri Stall powered by
 * `@shopify/react-native-skia` and custom stop-motion character/kettle/prop sprites.
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const canvasWidth = Math.max(320, Math.min(windowWidth, 600));

  // The background section (street diorama + stall scene) covers 40% of the screen height
  const totalBackgroundHeight = Math.max(
    280,
    Math.min(420, Math.round(windowHeight * 0.40)),
  );
  const streetBannerHeight = Math.round(totalBackgroundHeight * 0.28);
  const stallHeight = totalBackgroundHeight - streetBannerHeight;

  // Relative coordinates inside the stall
  const shelfY = Math.round(stallHeight * 0.48);
  const counterY = shelfY + 12;
  const counterHeight = stallHeight - counterY;
  const burnerCy = Math.round(stallHeight * 0.74);

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
    const gY = Math.max(26, Math.round(stallHeight * 0.10));
    const dipY = gY + 16;
    let d = `M 0 ${gY}`;
    for (let i = 0; i < segments; i++) {
      const startX = i * segW;
      d += ` Q ${Math.round(startX + segW / 2)} ${dipY} ${Math.round(startX + segW)} ${gY}`;
    }
    return Skia.Path.MakeFromSVGString(d) ?? d;
  }, [canvasWidth, stallHeight]);

  return (
    <View
      style={[
        styles.container,
        { width: canvasWidth, height: totalBackgroundHeight },
      ]}
    >
      {/* Upper Section: Dynamic Street-Art Wall & Moving Traffic (Bus, Auto-Rickshaw, Scooter) */}
      <StreetTrafficBanner
        width={canvasWidth}
        height={streetBannerHeight}
        elapsedMs={sessionElapsedMs}
        isRushHour={isRushHour}
        lowMotionEnabled={lowMotionEnabled}
      />

      {/* Lower Section: Interactive Chai Stall Scene */}
      <View style={[styles.stallSection, { width: canvasWidth, height: stallHeight }]}>
        {/* Layer 0: Illustrated Indian Bazaar & Tapri Backdrop Art */}
        <Image
          source={SPRITE_ASSETS.stallBackdrop}
          style={[
            styles.backdropImage,
            { width: canvasWidth, height: stallHeight },
          ]}
          resizeMode="cover"
        />

        {/* Layer 1: Skia 2D Atmospheric Lighting, Canopy, Counter & Steam */}
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Warm translucent glaze so backdrop blends with foreground UI */}
          <Rect
            x={0}
            y={0}
            width={canvasWidth}
            height={stallHeight}
            color={
              isRushHour
                ? 'rgba(253, 210, 145, 0.28)'
                : 'rgba(255, 243, 220, 0.22)'
            }
          />

          {/* Stall Canopy Awning */}
          {Array.from({ length: stripeCount }).map((_, idx) => (
            <Rect
              key={`stripe_${idx}`}
              x={idx * stripeWidth}
              y={0}
              width={stripeWidth + 1}
              height={Math.round(stallHeight * 0.09)}
              color={idx % 2 === 0 ? COLORS.terracotta : COLORS.cream}
            />
          ))}
          <Rect
            x={0}
            y={Math.round(stallHeight * 0.09) - 2}
            width={canvasWidth}
            height={4}
            color={COLORS.teaBrown}
          />

          {/* Rising Shop Decor: Marigold Garland & Lanterns when decorLevel > 0 */}
          {decorLevel > 0 && (
            <Group>
              <Path
                path={garlandPath}
                color={COLORS.saffron}
                style="stroke"
                strokeWidth={4}
              />
              <Circle
                cx={canvasWidth * 0.25}
                cy={Math.round(stallHeight * 0.13)}
                r={6}
                color={COLORS.gold}
              />
              <Circle
                cx={canvasWidth * 0.5}
                cy={Math.round(stallHeight * 0.13)}
                r={6}
                color={COLORS.terracotta}
              />
              <Circle
                cx={canvasWidth * 0.75}
                cy={Math.round(stallHeight * 0.13)}
                r={6}
                color={COLORS.gold}
              />
            </Group>
          )}

          {/* Customer Queue Counter Shelf */}
          <Rect
            x={0}
            y={shelfY}
            width={canvasWidth}
            height={12}
            color={COLORS.teaBrownMid}
          />

          {/* Lower Wooden Tapri Brewing Counter */}
          <Rect
            x={0}
            y={counterY}
            width={canvasWidth}
            height={counterHeight}
            color="rgba(59, 31, 17, 0.88)"
          />
          <RoundedRect
            x={8}
            y={counterY + 4}
            width={canvasWidth - 16}
            height={counterHeight - 8}
            r={12}
            color="rgba(78, 42, 23, 0.9)"
          />

          {/* Skia Burner Rings, Halos & Rising Steam Particles */}
          {stations.map((st, idx) => {
            const cx =
              idx === 0 ? canvasWidth * 0.27 : canvasWidth * 0.73;
            const cy = burnerCy;
            const isBrewing = st.state === 'Brewing';
            const isReady = st.state === 'Ready';
            const isSelectedReady = selectedReadyStationId === st.id && isReady;

            return (
              <Group key={st.id}>
                {/* Selection Halo for Ready Cup */}
                {isSelectedReady && (
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={54}
                    color="rgba(244, 162, 54, 0.35)"
                  />
                )}

                {/* Active Stove Flame Ring */}
                {isBrewing && (
                  <Circle
                    cx={cx}
                    cy={cy + 16}
                    r={34 + Math.sin(animPhase * 2) * 2.5}
                    color="rgba(244, 162, 54, 0.55)"
                  />
                )}

                {/* Rising Steam Particles when Brewing or Ready */}
                {(isBrewing || isReady) && (
                  <Group>
                    <Circle
                      cx={cx - 12 + Math.sin(animPhase) * 4}
                      cy={cy - 34 - ((sessionElapsedMs % 1000) / 1000) * 16}
                      r={5}
                      color="rgba(255, 248, 231, 0.75)"
                    />
                    <Circle
                      cx={cx + 12 - Math.sin(animPhase) * 4}
                      cy={cy - 42 - (((sessionElapsedMs + 500) % 1000) / 1000) * 16}
                      r={6}
                      color="rgba(255, 248, 231, 0.58)"
                    />
                  </Group>
                )}
              </Group>
            );
          })}
        </Canvas>

        {/* Layer 1.25: Illustrated Counter & Decor Props (Copper Tins, Bamboo Stools, Marigold Lanterns) */}
        <View style={styles.propsOverlay} pointerEvents="none">
          {/* Spiced Copper Tins on Left Counter Ledge */}
          <Image
            source={SPRITE_ASSETS.props.copperTins}
            style={[styles.copperTinsProp, { top: shelfY - 24 }]}
            resizeMode="contain"
          />

          {/* Handwoven Bamboo Stool at Counter Front */}
          <Image
            source={SPRITE_ASSETS.props.bambooStool}
            style={styles.bambooStoolProp}
            resizeMode="contain"
          />

          {/* Hanging Marigold Toran & Brass Lanterns when decorLevel > 0 */}
          {decorLevel > 0 && (
            <>
              <Image
                source={SPRITE_ASSETS.props.marigoldLantern}
                style={styles.lanternPropLeft}
                resizeMode="contain"
              />
              <Image
                source={SPRITE_ASSETS.props.marigoldLantern}
                style={styles.lanternPropRight}
                resizeMode="contain"
              />
            </>
          )}
        </View>

        {/* Layer 1.5: Stop-Motion Chhotu Helper behind Counter when helperLevel > 0 */}
        {helperLevel > 0 && (
          <View
            style={[styles.chhotuWrap, { top: shelfY - 44 }]}
            pointerEvents="none"
            testID="chhotu-helper-sprite"
          >
            <StopMotionSprite
              frames={SPRITE_ASSETS.chhotu}
              width={50}
              height={50}
              elapsedMs={sessionElapsedMs}
              stepIntervalMs={isRushHour ? 150 : 240}
              lowMotionEnabled={lowMotionEnabled}
              tiltStepsDeg={CALM_TILT_STEPS}
            />
            <View style={styles.chhotuTag}>
              <Text style={styles.chhotuTagText}>Chhotu Lv.{helperLevel}</Text>
            </View>
          </View>
        )}

        {/* Layer 2: Accessible Interactive Customer Queue Overlay (Top Half) */}
        <View style={styles.customerQueueRow} pointerEvents="box-none">
          {orders.length === 0 ? (
            <View style={styles.waitingBanner}>
              <Text style={styles.waitingBannerText}>
                Warming the kettle... customers arriving soon!
              </Text>
            </View>
          ) : (
            orders.slice(0, 4).map((order, idx) => {
              const custVis = CUSTOMER_VISUAL_MANIFEST[order.archetypeId];
              const recipeVis = RECIPE_VISUAL_MANIFEST[order.recipeId];
              const patiencePct = Math.round(order.patienceRatio * 100);
              const isImpatient = order.patienceRatio <= 0.35;
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

              // Gender-matched 2-frame stop-motion character art (e.g. Priya uses female office worker)
              const customerFrames = getCustomerStopMotionFrames(
                order.archetypeId,
                order.customerName,
              );

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
                  {/* Order Speech Bubble with Illustrated Chai Glass Icon */}
                  <View style={styles.orderBubble}>
                    <Image
                      source={recipeVis.spriteSource}
                      style={styles.orderRecipeIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.orderRecipeText} numberOfLines={1}>
                      {order.recipeName.replace(' Chai', '')}
                    </Text>
                  </View>

                  {/* Stop-Motion Character Puppet + Mood Badge */}
                  <View style={styles.customerSpriteBox}>
                    <StopMotionSprite
                      frames={customerFrames}
                      width={50}
                      height={50}
                      elapsedMs={sessionElapsedMs}
                      phaseOffsetMs={idx * 95}
                      stepIntervalMs={
                        isImpatient || isRushHour ? 125 : 240
                      }
                      lowMotionEnabled={lowMotionEnabled}
                      tiltStepsDeg={
                        isImpatient ? FRANTIC_TILT_STEPS : CALM_TILT_STEPS
                      }
                    />
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

        {/* Layer 3: Accessible Interactive Brewing Station Hitboxes with Stop-Motion Kettles & Brass Stove */}
        <View style={styles.stationsRow} pointerEvents="box-none">
          {stations.map((st, idx) => {
            const isReady = st.state === 'Ready';
            const isBrewing = st.state === 'Brewing';
            const isLocked = st.state === 'Locked';
            const isSelected = selectedReadyStationId === st.id && isReady;

            const activeRecipeVis = st.activeRecipeId
              ? RECIPE_VISUAL_MANIFEST[st.activeRecipeId]
              : null;

            const kettleFrames = isBrewing
              ? SPRITE_ASSETS.kettles.brewing
              : isReady
              ? [SPRITE_ASSETS.kettles.ready]
              : [SPRITE_ASSETS.kettles.idle];

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
                  <View style={styles.stationTopRow}>
                    <Text style={styles.stationTitle}>{st.label}</Text>
                    {activeRecipeVis && (isBrewing || isReady) && (
                      <Image
                        source={activeRecipeVis.spriteSource}
                        style={styles.stationMiniCup}
                        resizeMode="contain"
                      />
                    )}
                  </View>

                  {/* Stop-Motion Brass Kettle & High-Flame Brass Stove */}
                  <View
                    style={[
                      styles.kettleVisualRow,
                      isLocked && styles.kettleLockedDim,
                    ]}
                  >
                    <View style={styles.kettleWithStoveStack}>
                      <Image
                        source={SPRITE_ASSETS.props.brassStove}
                        style={styles.stoveBaseProp}
                        resizeMode="contain"
                      />
                      <StopMotionSprite
                        frames={kettleFrames}
                        width={50}
                        height={50}
                        elapsedMs={sessionElapsedMs}
                        phaseOffsetMs={idx * 110}
                        stepIntervalMs={isBrewing ? 120 : 280}
                        lowMotionEnabled={lowMotionEnabled || !isBrewing}
                        tiltStepsDeg={KETTLE_BOIL_TILT_STEPS}
                        bounceStepsPx={KETTLE_BOIL_BOUNCE_STEPS}
                      />
                    </View>

                    <View style={styles.stationStateColumn}>
                      {st.state === 'Idle' && (
                        <View style={styles.stationBadgeIdle}>
                          <Text style={styles.stationActionText}>TAP TO BREW</Text>
                        </View>
                      )}

                      {isBrewing && (
                        <View style={styles.stationBadgeBrewing}>
                          <Text
                            style={styles.stationRecipeLabel}
                            numberOfLines={1}
                          >
                            {st.activeRecipeName}
                          </Text>
                          <Text style={styles.stationTimerText}>
                            {st.remainingSeconds.toFixed(1)}s (
                            {Math.round(st.progressRatio * 100)}%)
                          </Text>
                        </View>
                      )}

                      {isReady && (
                        <View style={styles.stationBadgeReady}>
                          <Text
                            style={styles.stationReadyTitle}
                            numberOfLines={1}
                          >
                            {st.activeRecipeName} READY!
                          </Text>
                          <Text style={styles.stationActionText}>
                            {isSelected ? 'TAP CUSTOMER ↑' : 'SELECT CUP'}
                          </Text>
                        </View>
                      )}

                      {isLocked && (
                        <View style={styles.stationBadgeLocked}>
                          <Text style={styles.stationLockedText}>
                            🔒 Locked Burner
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
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
  stallSection: {
    position: 'relative',
    overflow: 'hidden',
  },
  backdropImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.9,
  },
  propsOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  copperTinsProp: {
    position: 'absolute',
    left: 8,
    top: 128,
    width: 40,
    height: 40,
  },
  bambooStoolProp: {
    position: 'absolute',
    left: '44%',
    bottom: 6,
    width: 38,
    height: 38,
    opacity: 0.92,
  },
  lanternPropLeft: {
    position: 'absolute',
    left: 10,
    top: 24,
    width: 42,
    height: 42,
  },
  lanternPropRight: {
    position: 'absolute',
    right: 10,
    top: 24,
    width: 42,
    height: 42,
  },
  chhotuWrap: {
    position: 'absolute',
    right: 8,
    top: 108,
    alignItems: 'center',
  },
  chhotuTag: {
    backgroundColor: COLORS.cardamom,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: -4,
  },
  chhotuTagText: {
    color: COLORS.cream,
    fontSize: 8,
    fontWeight: '800',
  },
  customerQueueRow: {
    position: 'absolute',
    top: 26,
    left: 4,
    right: 4,
    height: 116,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  waitingBanner: {
    backgroundColor: 'rgba(255, 248, 231, 0.94)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.saffron,
  },
  waitingBannerText: {
    color: COLORS.teaBrown,
    fontWeight: '800',
    fontSize: 13,
  },
  customerCard: {
    width: 78,
    minHeight: 110,
    backgroundColor: 'rgba(255, 253, 249, 0.94)',
    borderRadius: RADIUS.md,
    borderWidth: 2,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
  },
  orderBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.creamWarm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.saffron,
    gap: 2,
  },
  orderRecipeIcon: {
    width: 18,
    height: 18,
  },
  orderRecipeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.teaBrown,
    maxWidth: 48,
  },
  customerSpriteBox: {
    width: 54,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 12,
  },
  customerNameText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.teaBrown,
  },
  patienceTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5D4C0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 1,
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
    bottom: 4,
    left: 8,
    right: 8,
    height: 104,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stationSlot: {
    width: '48%',
    alignItems: 'center',
  },
  stationHitbox: {
    width: '100%',
    minHeight: Math.max(MIN_TOUCH_TARGET_DP, 84),
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 248, 231, 0.5)',
    backgroundColor: 'rgba(46, 23, 12, 0.72)',
    paddingHorizontal: 5,
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  stationHitboxSelected: {
    borderColor: COLORS.gold,
    borderWidth: 3,
    backgroundColor: 'rgba(74, 124, 89, 0.85)',
  },
  stationHitboxLocked: {
    borderColor: '#6D5447',
    backgroundColor: 'rgba(32, 18, 11, 0.8)',
  },
  stationTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stationTitle: {
    color: COLORS.cream,
    fontSize: 11,
    fontWeight: '800',
  },
  stationMiniCup: {
    width: 20,
    height: 20,
  },
  kettleVisualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: 4,
  },
  kettleWithStoveStack: {
    width: 54,
    height: 56,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  stoveBaseProp: {
    position: 'absolute',
    bottom: -4,
    width: 44,
    height: 28,
    opacity: 0.9,
  },
  kettleLockedDim: {
    opacity: 0.45,
  },
  stationStateColumn: {
    flex: 1,
    alignItems: 'center',
  },
  stationBadgeIdle: {
    backgroundColor: COLORS.saffron,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  stationBadgeBrewing: {
    alignItems: 'center',
    backgroundColor: 'rgba(244, 162, 54, 0.25)',
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    width: '100%',
  },
  stationBadgeReady: {
    alignItems: 'center',
    backgroundColor: COLORS.cardamom,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    width: '100%',
  },
  stationBadgeLocked: {
    paddingVertical: 4,
  },
  stationRecipeLabel: {
    color: COLORS.cream,
    fontSize: 10,
    fontWeight: '700',
  },
  stationTimerText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '900',
  },
  stationReadyTitle: {
    color: COLORS.cream,
    fontSize: 10,
    fontWeight: '900',
  },
  stationActionText: {
    color: COLORS.teaBrown,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },
  stationLockedText: {
    color: '#B89F91',
    fontSize: 10,
    fontWeight: '700',
  },
  discardBtn: {
    marginTop: 4,
    backgroundColor: COLORS.terracottaDark,
    paddingHorizontal: 10,
    paddingVertical: 3,
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
