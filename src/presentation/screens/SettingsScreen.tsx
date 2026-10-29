import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../state/useGameStore';
import { COLORS, MIN_TOUCH_TARGET_DP, RADIUS, SPACING } from '../theme';

export const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const settings = useGameStore((s) => s.snapshot.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const replayTutorial = useGameStore((s) => s.replayTutorial);
  const startSession = useGameStore((s) => s.startSession);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          testID="settings-back-btn"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Tapri Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.rowCard}>
          <View style={styles.rowTextWrap}>
            <Text style={styles.rowTitle}>Sound Effects 🔊</Text>
            <Text style={styles.rowDesc}>
              Brewing sizzles, bell chimes, and rush-hour alerts.
            </Text>
          </View>
          <Switch
            testID="toggle-sound"
            accessibilityLabel="Toggle Sound Effects"
            value={settings.soundEnabled}
            onValueChange={(val) => updateSettings({ soundEnabled: val })}
            trackColor={{ false: '#C7B8AA', true: COLORS.cardamom }}
          />
        </View>

        <View style={styles.rowCard}>
          <View style={styles.rowTextWrap}>
            <Text style={styles.rowTitle}>Tactile Haptics 📳</Text>
            <Text style={styles.rowDesc}>
              Gentle vibration feedback when brewing, serving, and upgrading.
            </Text>
          </View>
          <Switch
            testID="toggle-haptics"
            accessibilityLabel="Toggle Tactile Haptics"
            value={settings.hapticsEnabled}
            onValueChange={(val) => updateSettings({ hapticsEnabled: val })}
            trackColor={{ false: '#C7B8AA', true: COLORS.cardamom }}
          />
        </View>

        <View style={styles.rowCard}>
          <View style={styles.rowTextWrap}>
            <Text style={styles.rowTitle}>Low-Motion Mode 🌿</Text>
            <Text style={styles.rowDesc}>
              Reduces continuous steam/flame oscillation for comfort & battery.
            </Text>
          </View>
          <Switch
            testID="toggle-low-motion"
            accessibilityLabel="Toggle Low-Motion Mode"
            value={settings.lowMotionEnabled}
            onValueChange={(val) => updateSettings({ lowMotionEnabled: val })}
            trackColor={{ false: '#C7B8AA', true: COLORS.cardamom }}
          />
        </View>

        <Pressable
          testID="replay-tutorial-btn"
          accessibilityRole="button"
          onPress={() => {
            replayTutorial();
            startSession();
            router.replace('/gameplay');
          }}
          style={styles.replayBtn}
        >
          <Text style={styles.replayBtnText}>📖 Replay Interactive Tutorial</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.teaBrown,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backBtn: {
    minHeight: MIN_TOUCH_TARGET_DP,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  backBtnText: {
    color: COLORS.saffronLight,
    fontWeight: '800',
    fontSize: 15,
  },
  headerTitle: {
    color: COLORS.cream,
    fontWeight: '900',
    fontSize: 18,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.milkWhite,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.teaBrownMid,
    padding: SPACING.md,
  },
  rowTextWrap: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  rowTitle: {
    color: COLORS.teaBrown,
    fontWeight: '900',
    fontSize: 16,
  },
  rowDesc: {
    color: COLORS.mutedText,
    fontSize: 12,
    marginTop: 4,
  },
  replayBtn: {
    marginTop: SPACING.md,
    minHeight: Math.max(MIN_TOUCH_TARGET_DP, 52),
    backgroundColor: COLORS.saffron,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.teaBrown,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayBtnText: {
    color: COLORS.teaBrown,
    fontWeight: '900',
    fontSize: 15,
  },
});
