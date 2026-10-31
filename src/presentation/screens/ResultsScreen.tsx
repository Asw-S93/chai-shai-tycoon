import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPRITE_ASSETS } from '../../infrastructure/assets';
import { StopMotionSprite } from '../game/StopMotionSprite';
import { useGameStore } from '../state/useGameStore';
import { COLORS, MIN_TOUCH_TARGET_DP, RADIUS, SPACING } from '../theme';

export const ResultsScreen: React.FC = () => {
  const router = useRouter();
  const snapshot = useGameStore((s) => s.snapshot);
  const startSession = useGameStore((s) => s.startSession);
  const [animMs, setAnimMs] = useState(0);

  useEffect(() => {
    if (snapshot.settings.lowMotionEnabled) {
      return;
    }
    const timer = setInterval(() => {
      setAnimMs((prev) => (prev + 200) % 60000);
    }, 200);
    return () => clearInterval(timer);
  }, [snapshot.settings.lowMotionEnabled]);

  const summary = snapshot.lastSessionSummary ?? {
    sessionId: 'summary',
    ordersServed: 0,
    ordersExpired: 0,
    coinsEarned: 0,
    tipsEarned: 0,
    xpEarned: 0,
    averageSatisfactionPercent: 0,
    newLevelReached: snapshot.level,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.kicker}>SHIFT SCORECARD</Text>
          <Text style={styles.title}>Tapri Shift Complete! ☕</Text>

          {/* Celebratory Stop-Motion Ustad Chaiwala High-Pour & Bua Ji */}
          <View style={styles.celebrationRow}>
            <StopMotionSprite
              frames={SPRITE_ASSETS.customersFemale.regular}
              width={66}
              height={66}
              elapsedMs={animMs}
              stepIntervalMs={240}
              lowMotionEnabled={snapshot.settings.lowMotionEnabled}
            />
            <StopMotionSprite
              frames={SPRITE_ASSETS.chaiwala}
              width={82}
              height={82}
              elapsedMs={animMs}
              phaseOffsetMs={100}
              stepIntervalMs={200}
              lowMotionEnabled={snapshot.settings.lowMotionEnabled}
            />
            <StopMotionSprite
              frames={SPRITE_ASSETS.customersFemale.student}
              width={66}
              height={66}
              elapsedMs={animMs}
              phaseOffsetMs={160}
              stepIntervalMs={240}
              lowMotionEnabled={snapshot.settings.lowMotionEnabled}
            />
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Chai Served</Text>
              <Text testID="results-served-text" style={styles.statValue}>
                ☕ {summary.ordersServed}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Missed Orders</Text>
              <Text testID="results-missed-text" style={styles.statValue}>
                😤 {summary.ordersExpired}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Satisfaction</Text>
              <Text style={styles.statValue}>
                😊 {summary.averageSatisfactionPercent}%
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Coins Earned</Text>
              <Text testID="results-coins-text" style={styles.statValueGold}>
                +{summary.coinsEarned} 🪙
              </Text>
              <Text style={styles.statSub}>
                (Includes +{summary.tipsEarned} tips)
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>XP Gained</Text>
              <Text style={styles.statValue}>+{summary.xpEarned} ⭐</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Wallet</Text>
              <Text style={styles.statValue}>🪙 {snapshot.coins}</Text>
            </View>
          </View>

          <View style={styles.actionsStack}>
            <Pressable
              testID="results-next-shift-btn"
              accessibilityRole="button"
              onPress={() => {
                startSession();
                router.replace('/gameplay');
              }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>▶ Brew Next Shift</Text>
            </Pressable>

            <Pressable
              testID="results-upgrades-btn"
              accessibilityRole="button"
              onPress={() => router.push('/upgrades')}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>🛠️ Spend Coins in Shop</Text>
            </Pressable>

            <Pressable
              testID="results-home-btn"
              accessibilityRole="button"
              onPress={() => router.replace('/')}
              style={styles.tertiaryBtn}
            >
              <Text style={styles.tertiaryBtnText}>🏠 Return to Home</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  container: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.milkWhite,
    borderRadius: RADIUS.lg,
    borderWidth: 3,
    borderColor: COLORS.teaBrown,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  kicker: {
    color: COLORS.terracotta,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  title: {
    color: COLORS.teaBrown,
    fontWeight: '900',
    fontSize: 24,
    marginTop: 4,
    marginBottom: SPACING.sm,
  },
  celebrationRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.creamWarm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.saffron,
  },
  statsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  statBox: {
    width: '48%',
    backgroundColor: COLORS.creamWarm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.saffron,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statLabel: {
    color: COLORS.mutedText,
    fontWeight: '800',
    fontSize: 12,
  },
  statValue: {
    color: COLORS.teaBrown,
    fontWeight: '900',
    fontSize: 20,
    marginTop: 4,
  },
  statValueGold: {
    color: COLORS.cardamomDark,
    fontWeight: '900',
    fontSize: 20,
    marginTop: 4,
  },
  statSub: {
    color: COLORS.mutedText,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  actionsStack: {
    width: '100%',
    gap: SPACING.md,
  },
  primaryBtn: {
    minHeight: Math.max(MIN_TOUCH_TARGET_DP, 54),
    backgroundColor: COLORS.terracotta,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.cream,
    fontWeight: '900',
    fontSize: 17,
  },
  secondaryBtn: {
    minHeight: Math.max(MIN_TOUCH_TARGET_DP, 50),
    backgroundColor: COLORS.cardamom,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: COLORS.cream,
    fontWeight: '800',
    fontSize: 15,
  },
  tertiaryBtn: {
    minHeight: MIN_TOUCH_TARGET_DP,
    backgroundColor: COLORS.creamWarm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.teaBrownMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryBtnText: {
    color: COLORS.teaBrown,
    fontWeight: '800',
    fontSize: 14,
  },
});
