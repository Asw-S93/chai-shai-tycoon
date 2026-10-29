import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, MIN_TOUCH_TARGET_DP, RADIUS, SPACING } from '../theme';

interface TutorialOverlayProps {
  visible: boolean;
  onComplete: () => void;
}

const STEPS = [
  {
    title: 'Welcome to Chai-Shai Tycoon! ☕',
    body: 'Start from a cozy roadside tapri and serve steaming cups of authentic Indian chai before your customers lose patience.',
  },
  {
    title: '1. Select Recipe & Brew 🔥',
    body: 'Check what chai the customer at the top wants. Pick the matching recipe at the bottom, then tap an IDLE Kettle to start simmering!',
  },
  {
    title: '2. Serve & Restock 💰',
    body: 'When the kettle turns GREEN (READY), tap the customer who ordered it to collect coins + tips! Your first 3 orders have free ingredient restocks.',
  },
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  visible,
  onComplete,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  if (!visible) return null;

  const current = STEPS[stepIndex] ?? STEPS[0];
  const isLast = stepIndex >= STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      setStepIndex(0);
      onComplete();
    } else {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    setStepIndex(0);
    onComplete();
  };

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.stepIndicator}>
             Quick Guide ({stepIndex + 1}/{STEPS.length})
          </Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>

          <View style={styles.actionsRow}>
            <Pressable
              testID="tutorial-skip-btn"
              accessibilityRole="button"
              accessibilityLabel="Skip tutorial"
              onPress={handleSkip}
              style={styles.skipBtn}
            >
              <Text style={styles.skipBtnText}>Skip</Text>
            </Pressable>

            <Pressable
              testID="tutorial-next-btn"
              accessibilityRole="button"
              accessibilityLabel={isLast ? 'Start brewing' : 'Next tip'}
              onPress={handleNext}
              style={styles.nextBtn}
            >
              <Text style={styles.nextBtnText}>
                {isLast ? 'Start Brewing!' : 'Next →'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlayBg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.lg,
    borderWidth: 3,
    borderColor: COLORS.saffron,
    padding: SPACING.xl,
  },
  stepIndicator: {
    color: COLORS.terracotta,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  title: {
    color: COLORS.teaBrown,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: SPACING.sm,
  },
  body: {
    color: COLORS.teaBrownMid,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    minHeight: MIN_TOUCH_TARGET_DP,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  skipBtnText: {
    color: COLORS.mutedText,
    fontWeight: '700',
    fontSize: 14,
  },
  nextBtn: {
    minHeight: MIN_TOUCH_TARGET_DP,
    backgroundColor: COLORS.cardamom,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnText: {
    color: COLORS.cream,
    fontWeight: '800',
    fontSize: 15,
  },
});
