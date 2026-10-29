import * as Haptics from 'expo-haptics';
import {
  ClockPort,
  FeedbackPort,
  HapticFeedbackType,
  RandomPort,
  SoundEffectId,
} from '../../domain/ports';

export class SystemClockAdapter implements ClockPort {
  public nowMs(): number {
    return Date.now();
  }
}

export class SeededRandomAdapter implements RandomPort {
  private seed: number;
  private counter: number = 0;

  constructor(initialSeed: number = Date.now() % 2147483647) {
    this.seed = initialSeed <= 0 ? 1234567 : initialSeed;
  }

  public nextFloat(): number {
    // Mulberry32 deterministic PRNG
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextId(prefix: string = 'id'): string {
    this.counter += 1;
    const randHex = Math.floor(this.nextFloat() * 0xffffff)
      .toString(16)
      .padStart(6, '0');
    return `${prefix}_${this.counter}_${randHex}`;
  }
}

/**
 * Feedback adapter using expo-haptics and WebAudio / expo-audio synthesized cues.
 * Respects user mute & haptics toggles and fails gracefully on unsupported runtimes.
 */
export class ExpoFeedbackAdapter implements FeedbackPort {
  private soundEnabled: boolean = true;
  private hapticsEnabled: boolean = true;

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  public setHapticsEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled;
  }

  public async playSound(soundId: SoundEffectId): Promise<void> {
    if (!this.soundEnabled) return;
    // Synthesize lightweight tone when Web AudioContext is available (web/preview),
    // and pair with subtle haptic accompaniment on native Android.
    try {
      const g = globalThis as unknown as {
        AudioContext?: new () => {
          createOscillator(): {
            type: string;
            frequency: { setValueAtTime(v: number, t: number): void };
            connect(dest: unknown): void;
            start(): void;
            stop(t: number): void;
          };
          createGain(): {
            gain: { setValueAtTime(v: number, t: number): void };
            connect(dest: unknown): void;
          };
          currentTime: number;
          destination: unknown;
        };
      };
      if (typeof g.AudioContext === 'function') {
        const ctx = new g.AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const freqMap: Record<SoundEffectId, number> = {
          tap: 440,
          brew_start: 330,
          brew_ready: 660,
          serve_success: 880,
          serve_wrong: 190,
          order_expired: 160,
          rush_hour: 587,
          upgrade_buy: 784,
          restock: 523,
        };
        osc.type = soundId === 'serve_wrong' || soundId === 'order_expired' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freqMap[soundId] ?? 440, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      }
    } catch {
      // Ignore audio errors in headless/native environments without WebAudio
    }
  }

  public async triggerHaptic(type: HapticFeedbackType): Promise<void> {
    if (!this.hapticsEnabled) return;
    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch {
      // Safe fallback when running in simulator/test environment
    }
  }
}
