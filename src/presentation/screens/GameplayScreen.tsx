import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  AppState,
  AppStateStatus,
  BackHandler,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { INGREDIENT_METADATA, RECIPES_CATALOG } from '../../content/recipes';
import { ALL_INGREDIENT_IDS, IngredientId } from '../../domain/value-objects';
import {
  RECIPE_VISUAL_MANIFEST,
  SPRITE_ASSETS,
} from '../../infrastructure/assets';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { ChaiStallScene } from '../game/ChaiStallScene';
import { useGameStore } from '../state/useGameStore';
import { COLORS, MIN_TOUCH_TARGET_DP, RADIUS, SPACING } from '../theme';

export const GameplayScreen: React.FC = () => {
  const router = useRouter();
  const engine = useGameStore((s) => s.engine);
  const snapshot = useGameStore((s) => s.snapshot);
  const startSession = useGameStore((s) => s.startSession);
  const pauseSession = useGameStore((s) => s.pauseSession);
  const resumeSession = useGameStore((s) => s.resumeSession);
  const endSessionEarly = useGameStore((s) => s.endSessionEarly);
  const selectRecipe = useGameStore((s) => s.selectRecipe);
  const tapStation = useGameStore((s) => s.tapStation);
  const discardReadyCup = useGameStore((s) => s.discardReadyCup);
  const tapCustomerOrder = useGameStore((s) => s.tapCustomerOrder);
  const restockIngredient = useGameStore((s) => s.restockIngredient);
  const restockAll = useGameStore((s) => s.restockAll);
  const completeTutorial = useGameStore((s) => s.completeTutorial);

  // Start session if navigated directly and not active
  useEffect(() => {
    if (!snapshot.sessionActive && !snapshot.lastSessionSummary) {
      startSession();
    }
  }, [snapshot.sessionActive, snapshot.lastSessionSummary, startSession]);

  // Fixed-timestep loop driver while session is active and not paused
  useEffect(() => {
    if (!snapshot.sessionActive || snapshot.isPaused) {
      return;
    }
    const timer = setInterval(() => {
      engine.updateFromWallClock();
    }, 50);
    return () => clearInterval(timer);
  }, [engine, snapshot.sessionActive, snapshot.isPaused]);

  // Pause automatically when app goes to background/inactive so timers never expire while suspended
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState !== 'active') {
        pauseSession();
      }
    });
    return () => sub.remove();
  }, [pauseSession]);

  // Android hardware back button pauses the game instead of abruptly losing session
  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (snapshot.sessionActive && !snapshot.isPaused) {
        pauseSession();
        return true;
      }
      return false;
    });
    return () => backSub.remove();
  }, [snapshot.sessionActive, snapshot.isPaused, pauseSession]);

  // Navigate to Results screen when session finishes
  useEffect(() => {
    if (!snapshot.sessionActive && snapshot.lastSessionSummary) {
      router.replace('/results');
    }
  }, [snapshot.sessionActive, snapshot.lastSessionSummary, router]);

  const remainingTotalSec = Math.ceil(snapshot.sessionRemainingMs / 1000);
  const mins = Math.floor(remainingTotalSec / 60);
  const secs = remainingTotalSec % 60;
  const formattedClock = `${mins}:${secs.toString().padStart(2, '0')}`;

  const decorUpgrade = snapshot.upgrades.find((u) => u.id === 'better_tips');
  const helperUpgrade = snapshot.upgrades.find((u) => u.id === 'additional_patience');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top HUD Bar */}
      <View style={styles.hudBar}>
        <View style={styles.hudMetricsGroup}>
          <View style={styles.metricBadge}>
            <Text testID="hud-coins-text" style={styles.metricText}>
              🪙 {snapshot.coins}
            </Text>
          </View>
          <View style={styles.metricBadge}>
            <Text style={styles.metricText}>
              ⭐ Lv.{snapshot.level} ({snapshot.xp} XP)
            </Text>
          </View>
          <View
            style={[
              styles.metricBadge,
              snapshot.isRushHour && styles.rushClockBadge,
            ]}
          >
            <Text style={styles.metricText}>⏱️ {formattedClock}</Text>
          </View>
        </View>

        <Pressable
          testID="hud-pause-btn"
          accessibilityRole="button"
          accessibilityLabel="Pause game"
          onPress={pauseSession}
          style={styles.pauseBtn}
        >
          <Text style={styles.pauseBtnText}>⏸ Pause</Text>
        </Pressable>
      </View>

      {/* Rush Hour Alert Banner */}
      {snapshot.isRushHour && (
        <View style={styles.rushBanner}>
          <Text style={styles.rushBannerText}>
            🔥 RUSH HOUR! 2x Customer Speed — Fast Tips! 🔥
          </Text>
        </View>
      )}

      {/* Floating Feedback Toasts (Coin flyout / Mismatch / Restock notifications) */}
      <View style={styles.feedbackRow} pointerEvents="none">
        {snapshot.feedbackItems.slice(-2).map((fb) => (
          <View
            key={fb.id}
            style={[
              styles.feedbackPill,
              fb.kind === 'coin' && styles.feedbackCoin,
              fb.kind === 'error' && styles.feedbackError,
              fb.kind === 'rush' && styles.feedbackRush,
            ]}
          >
            <Text style={styles.feedbackText}>{fb.text}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Interactive Skia & Stop-Motion Chai Stall Scene */}
        <ChaiStallScene
          orders={snapshot.activeOrders}
          stations={snapshot.stations}
          selectedReadyStationId={snapshot.selectedReadyStationId}
          isRushHour={snapshot.isRushHour}
          lowMotionEnabled={snapshot.settings.lowMotionEnabled}
          decorLevel={decorUpgrade?.currentLevel ?? 0}
          helperLevel={helperUpgrade?.currentLevel ?? 0}
          sessionElapsedMs={snapshot.sessionElapsedMs}
          onTapCustomerOrder={(orderId) => tapCustomerOrder(orderId)}
          onTapStation={(stationId) => tapStation(stationId)}
          onDiscardReadyCup={(stationId) => discardReadyCup(stationId)}
        />

        {/* Ingredient Pantry & Quick Restock Strip */}
        <View style={styles.pantryCard}>
          <View style={styles.pantryHeaderRow}>
            <Text style={styles.sectionTitle}>
              Pantry Stock (Max {snapshot.maxStorageCapacity})
              {snapshot.isTutorialFreePeriod ? ' • FREE Tutorial Restock' : ''}
            </Text>
            <Pressable
              testID="restock-all-btn"
              accessibilityRole="button"
              accessibilityLabel="Restock all ingredients"
              onPress={restockAll}
              style={styles.restockAllBtn}
            >
              <Text style={styles.restockAllBtnText}>
                {snapshot.isTutorialFreePeriod ? '+ Restock Free' : '+ Restock All'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.ingredientsGrid}>
            {ALL_INGREDIENT_IDS.map((ingId: IngredientId) => {
              const meta = INGREDIENT_METADATA[ingId];
              const count = snapshot.inventory[ingId];
              const isLow = count <= 2;

              return (
                <Pressable
                  key={ingId}
                  testID={`restock-ing-${ingId}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${meta.shortLabel} stock ${count}. Tap to restock.`}
                  onPress={() => restockIngredient(ingId)}
                  style={[
                    styles.ingredientChip,
                    isLow && styles.ingredientChipLow,
                  ]}
                >
                  <Image
                    source={SPRITE_ASSETS.ingredients[ingId]}
                    style={styles.ingredientIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.ingredientName}>{meta.shortLabel}</Text>
                  <Text
                    style={[
                      styles.ingredientCount,
                      isLow && styles.ingredientCountLow,
                    ]}
                  >
                    {count}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Bottom Recipe Selection Tray */}
        <View style={styles.recipeTrayCard}>
          <Text style={styles.sectionTitleLight}>
            Select Chai Recipe → Then Tap Idle Kettle
          </Text>
          <View style={styles.recipeGrid}>
            {RECIPES_CATALOG.map((rec) => {
              const isUnlocked = snapshot.unlockedRecipes.includes(rec.id);
              const isSelected = snapshot.selectedRecipeId === rec.id;
              const vis = RECIPE_VISUAL_MANIFEST[rec.id];

              const ingSummary = Object.entries(rec.ingredients)
                .map(([k, v]) => `${INGREDIENT_METADATA[k as IngredientId].shortLabel}:${v}`)
                .join(' ');

              return (
                <Pressable
                  key={rec.id}
                  testID={`recipe-btn-${rec.id}`}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: isSelected,
                    disabled: !isUnlocked,
                  }}
                  accessibilityLabel={`${rec.name}, ${rec.baseCoins} coins, ${
                    rec.baseBrewTimeMs / 1000
                  } seconds${!isUnlocked ? `, unlocks at level ${rec.unlockLevel}` : ''}`}
                  onPress={() => selectRecipe(rec.id)}
                  style={[
                    styles.recipeButton,
                    isSelected && styles.recipeButtonSelected,
                    !isUnlocked && styles.recipeButtonLocked,
                  ]}
                >
                  <View style={styles.recipeCardInner}>
                    <Image
                      source={vis.spriteSource}
                      style={styles.recipeSpriteIcon}
                      resizeMode="contain"
                    />
                    <View style={styles.recipeInfoCol}>
                      <View style={styles.recipeTopRow}>
                        <Text style={styles.recipeTitle} numberOfLines={1}>
                          {rec.name}
                        </Text>
                        <Text style={styles.recipeCoins}>+{rec.baseCoins}🪙</Text>
                      </View>
                      {isUnlocked ? (
                        <Text style={styles.recipeSub} numberOfLines={1}>
                          {rec.baseBrewTimeMs / 1000}s • {ingSummary}
                        </Text>
                      ) : (
                        <Text style={styles.recipeLockedLabel}>
                          🔒 Unlocks Lv.{rec.unlockLevel}
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* First-Launch Guided Tutorial Overlay */}
      <TutorialOverlay
        visible={!snapshot.tutorialCompleted}
        onComplete={completeTutorial}
      />

      {/* Pause Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={snapshot.isPaused}
        onRequestClose={resumeSession}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pauseCard}>
            <Text style={styles.pauseTitle}>Stall Paused ☕</Text>
            <Text style={styles.pauseSub}>
              All brew timers and customer patience are safely paused.
            </Text>

            <Pressable
              testID="pause-resume-btn"
              accessibilityRole="button"
              onPress={resumeSession}
              style={styles.resumeBtn}
            >
              <Text style={styles.resumeBtnText}>▶ Resume Shift</Text>
            </Pressable>

            <Pressable
              testID="pause-shop-btn"
              accessibilityRole="button"
              onPress={() => {
                router.push('/upgrades');
              }}
              style={styles.shopModalBtn}
            >
              <Text style={styles.shopModalBtnText}>🛠️ Open Upgrade Shop</Text>
            </Pressable>

            <Pressable
              testID="pause-end-btn"
              accessibilityRole="button"
              onPress={() => {
                endSessionEarly();
                router.replace('/results');
              }}
              style={styles.endShiftBtn}
            >
              <Text style={styles.endShiftBtnText}>Finish Shift & See Scorecard</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  hudBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.teaBrown,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  hudMetricsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  metricBadge: {
    backgroundColor: COLORS.teaBrownMid,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  rushClockBadge: {
    backgroundColor: COLORS.terracotta,
  },
  metricText: {
    color: COLORS.cream,
    fontWeight: '800',
    fontSize: 13,
  },
  pauseBtn: {
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.saffron,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseBtnText: {
    color: COLORS.teaBrown,
    fontWeight: '900',
    fontSize: 13,
  },
  rushBanner: {
    backgroundColor: COLORS.terracotta,
    paddingVertical: 5,
    alignItems: 'center',
  },
  rushBannerText: {
    color: COLORS.cream,
    fontWeight: '900',
    fontSize: 12,
  },
  feedbackRow: {
    minHeight: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: 2,
  },
  feedbackPill: {
    backgroundColor: COLORS.teaBrownMid,
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  feedbackCoin: {
    backgroundColor: COLORS.cardamom,
  },
  feedbackError: {
    backgroundColor: COLORS.danger,
  },
  feedbackRush: {
    backgroundColor: COLORS.terracotta,
  },
  feedbackText: {
    color: COLORS.cream,
    fontWeight: '800',
    fontSize: 12,
  },
  mainContent: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  pantryCard: {
    backgroundColor: COLORS.creamWarm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.teaBrownMid,
    padding: SPACING.sm,
  },
  pantryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    color: COLORS.teaBrown,
    fontWeight: '800',
    fontSize: 12,
  },
  sectionTitleLight: {
    color: COLORS.cream,
    fontWeight: '800',
    fontSize: 12,
  },
  restockAllBtn: {
    backgroundColor: COLORS.cardamom,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  restockAllBtnText: {
    color: COLORS.cream,
    fontWeight: '800',
    fontSize: 11,
  },
  ingredientsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  ingredientChip: {
    flex: 1,
    minHeight: 54,
    backgroundColor: COLORS.milkWhite,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.teaBrownLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  ingredientChipLow: {
    borderColor: COLORS.danger,
    backgroundColor: '#FFEAEA',
  },
  ingredientIcon: {
    width: 22,
    height: 22,
    marginBottom: 1,
  },
  ingredientName: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.teaBrownMid,
  },
  ingredientCount: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.teaBrown,
  },
  ingredientCountLow: {
    color: COLORS.danger,
  },
  recipeTrayCard: {
    backgroundColor: COLORS.teaBrown,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  recipeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 6,
  },
  recipeButton: {
    width: '48.5%',
    minHeight: Math.max(MIN_TOUCH_TARGET_DP, 60),
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.teaBrownMid,
    padding: 6,
    justifyContent: 'center',
  },
  recipeButtonSelected: {
    borderColor: COLORS.saffron,
    borderWidth: 3,
    backgroundColor: '#FFF2D6',
  },
  recipeButtonLocked: {
    backgroundColor: '#D7C8B8',
    opacity: 0.75,
  },
  recipeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recipeSpriteIcon: {
    width: 36,
    height: 36,
  },
  recipeInfoCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  recipeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipeCoins: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.cardamomDark,
  },
  recipeTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.teaBrown,
    flex: 1,
    marginRight: 2,
  },
  recipeSub: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.mutedText,
    marginTop: 2,
  },
  recipeLockedLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.terracottaDark,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlayBg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  pauseCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.lg,
    borderWidth: 3,
    borderColor: COLORS.saffron,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  pauseTitle: {
    color: COLORS.teaBrown,
    fontSize: 22,
    fontWeight: '900',
  },
  pauseSub: {
    color: COLORS.mutedText,
    fontSize: 13,
    textAlign: 'center',
  },
  resumeBtn: {
    width: '100%',
    minHeight: MIN_TOUCH_TARGET_DP,
    backgroundColor: COLORS.cardamom,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeBtnText: {
    color: COLORS.cream,
    fontWeight: '900',
    fontSize: 16,
  },
  shopModalBtn: {
    width: '100%',
    minHeight: MIN_TOUCH_TARGET_DP,
    backgroundColor: COLORS.saffron,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopModalBtnText: {
    color: COLORS.teaBrown,
    fontWeight: '900',
    fontSize: 15,
  },
  endShiftBtn: {
    width: '100%',
    minHeight: MIN_TOUCH_TARGET_DP,
    backgroundColor: COLORS.terracotta,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endShiftBtnText: {
    color: COLORS.cream,
    fontWeight: '800',
    fontSize: 14,
  },
});
