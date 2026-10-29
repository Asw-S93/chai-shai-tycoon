import {
  Canvas,
  Circle,
  Rect,
  RoundedRect,
} from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../state/useGameStore';
import { COLORS, MIN_TOUCH_TARGET_DP, RADIUS, SPACING } from '../theme';

export const HomeScreen: React.FC = () => {
  const router = useRouter();
  const isInitialized = useGameStore((s) => s.isInitialized);
  const initializeApp = useGameStore((s) => s.initializeApp);
  const startSession = useGameStore((s) => s.startSession);
  const snapshot = useGameStore((s) => s.snapshot);

  useEffect(() => {
    void initializeApp();
  }, [initializeApp]);

  const handlePlayShift = () => {
    startSession();
    router.push('/gameplay');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandBanner}>
          <Text style={styles.kickerText}>ROADSIDE TAPRI TO TEA EMPIRE</Text>
          <Text style={styles.titleText}>Chai-Shai Tycoon</Text>
          <Text style={styles.subtitleText}>{snapshot.levelTitle}</Text>
        </View>

        {/* Illustrated Skia Chai Stall Hero Card */}
        <View style={styles.heroIllustrationWrap}>
          <Canvas style={styles.heroCanvas}>
            <Rect x={0} y={0} width={320} height={160} color="#FDE7C2" />
            {/* Awning */}
            <Rect x={0} y={0} width={64} height={26} color={COLORS.terracotta} />
            <Rect x={64} y={0} width={64} height={26} color={COLORS.cream} />
            <Rect x={128} y={0} width={64} height={26} color={COLORS.terracotta} />
            <Rect x={192} y={0} width={64} height={26} color={COLORS.cream} />
            <Rect x={256} y={0} width={64} height={26} color={COLORS.terracotta} />

            {/* Sun / Halo */}
            <Circle cx={260} cy={62} r={22} color={COLORS.saffronLight} />

            {/* Counter */}
            <Rect x={0} y={108} width={320} height={52} color={COLORS.teaBrown} />
            <RoundedRect
              x={110}
              y={64}
              width={64}
              height={46}
              r={12}
              color="#C87D55"
            />
            {/* Steam */}
            <Circle cx={132} cy={48} r={6} color="rgba(255,255,255,0.7)" />
            <Circle cx={150} cy={40} r={8} color="rgba(255,255,255,0.55)" />

            {/* Cutting Chai Glasses */}
            <RoundedRect
              x={64}
              y={84}
              width={20}
              height={24}
              r={4}
              color={COLORS.saffron}
            />
            <RoundedRect
              x={205}
              y={84}
              width={20}
              height={24}
              r={4}
              color={COLORS.cardamom}
            />
          </Canvas>
          <View style={styles.heroStatsOverlay}>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>COINS</Text>
              <Text testID="home-coins-text" style={styles.statValue}>
                🪙 {snapshot.coins}
              </Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>LEVEL {snapshot.level}</Text>
              <Text style={styles.statValue}>⭐ {snapshot.xp} XP</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>SERVED</Text>
              <Text style={styles.statValue}>☕ {snapshot.lifetimeOrdersServed}</Text>
            </View>
          </View>
        </View>

        {/* Primary Navigation CTAs */}
        <View style={styles.menuStack}>
          <Pressable
            testID="home-play-btn"
            accessibilityRole="button"
            accessibilityLabel={
              snapshot.lifetimeOrdersServed > 0
                ? 'Continue and start next chai shift'
                : 'Play first chai shift'
            }
            onPress={handlePlayShift}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonTitle}>
              {snapshot.lifetimeOrdersServed > 0
                ? '☕ Continue — Open Stall'
                : '☕ Play First Shift'}
            </Text>
            <Text style={styles.primaryButtonSub}>
              3-Minute Shift • Brew & Serve Fresh Chai
            </Text>
          </Pressable>

          <Pressable
            testID="home-upgrades-btn"
            accessibilityRole="button"
            accessibilityLabel="Open Upgrade Shop"
            onPress={() => router.push('/upgrades')}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              🛠️ Tapri Upgrades & Restock
            </Text>
          </Pressable>

          <Pressable
            testID="home-settings-btn"
            accessibilityRole="button"
            accessibilityLabel="Open Settings"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.tertiaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.tertiaryButtonText}>
              ⚙️ Settings & Tutorial
            </Text>
          </Pressable>
        </View>

        {!isInitialized && (
          <Text style={styles.loadingNote}>Loading tapri ledger...</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  scrollContent: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  brandBanner: {
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  kickerText: {
    color: COLORS.terracotta,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  titleText: {
    color: COLORS.teaBrown,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },
  subtitleText: {
    color: COLORS.cardamom,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  heroIllustrationWrap: {
    width: 320,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.teaBrown,
    backgroundColor: COLORS.creamWarm,
    marginBottom: SPACING.xl,
  },
  heroCanvas: {
    width: 320,
    height: 160,
  },
  heroStatsOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.teaBrown,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  statPill: {
    alignItems: 'center',
  },
  statLabel: {
    color: COLORS.saffronLight,
    fontSize: 10,
    fontWeight: '800',
  },
  statValue: {
    color: COLORS.cream,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  menuStack: {
    width: '100%',
    maxWidth: 360,
    gap: SPACING.md,
  },
  primaryButton: {
    minHeight: 68,
    backgroundColor: COLORS.terracotta,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.teaBrown,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    elevation: 4,
  },
  primaryButtonTitle: {
    color: COLORS.cream,
    fontSize: 20,
    fontWeight: '900',
  },
  primaryButtonSub: {
    color: COLORS.saffronLight,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  secondaryButton: {
    minHeight: Math.max(MIN_TOUCH_TARGET_DP, 54),
    backgroundColor: COLORS.cardamom,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.teaBrown,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  secondaryButtonText: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  tertiaryButton: {
    minHeight: Math.max(MIN_TOUCH_TARGET_DP, 50),
    backgroundColor: COLORS.creamWarm,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.teaBrownMid,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  tertiaryButtonText: {
    color: COLORS.teaBrown,
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  loadingNote: {
    marginTop: SPACING.md,
    color: COLORS.mutedText,
    fontSize: 12,
  },
});
