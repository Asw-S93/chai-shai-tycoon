import { z } from 'zod';
import { PlayerSaveSnapshot } from '../../domain/ports';

export const InventorySchema = z.object({
  tea: z.number().int().min(0).catch(10),
  milk: z.number().int().min(0).catch(10),
  sugar: z.number().int().min(0).catch(10),
  ginger: z.number().int().min(0).catch(6),
  cardamom: z.number().int().min(0).catch(6),
  spices: z.number().int().min(0).catch(6),
});

export const UpgradesSchema = z.object({
  faster_brewing: z.number().int().min(0).max(4).catch(0),
  second_burner: z.number().int().min(0).max(1).catch(0),
  larger_queue: z.number().int().min(0).max(3).catch(0),
  better_tips: z.number().int().min(0).max(4).catch(0),
  larger_storage: z.number().int().min(0).max(4).catch(0),
  additional_patience: z.number().int().min(0).max(4).catch(0),
});

export const SettingsSchema = z.object({
  soundEnabled: z.boolean().catch(true),
  hapticsEnabled: z.boolean().catch(true),
  lowMotionEnabled: z.boolean().catch(false),
});

export const PlayerSaveSnapshotSchema = z.object({
  coins: z.number().int().min(0).catch(100),
  xp: z.number().int().min(0).catch(0),
  level: z.number().int().min(1).catch(1),
  lifetimeOrdersServed: z.number().int().min(0).catch(0),
  tutorialCompleted: z.boolean().catch(false),
  inventory: InventorySchema,
  upgrades: UpgradesSchema,
  settings: SettingsSchema,
  processedTransactionIds: z.array(z.string()).catch([]),
});

export function createSeededSaveSnapshot(): PlayerSaveSnapshot {
  return {
    coins: 100,
    xp: 0,
    level: 1,
    lifetimeOrdersServed: 0,
    tutorialCompleted: false,
    inventory: {
      tea: 10,
      milk: 10,
      sugar: 10,
      ginger: 6,
      cardamom: 6,
      spices: 6,
    },
    upgrades: {
      faster_brewing: 0,
      second_burner: 0,
      larger_queue: 0,
      better_tips: 0,
      larger_storage: 0,
      additional_patience: 0,
    },
    settings: {
      soundEnabled: true,
      hapticsEnabled: true,
      lowMotionEnabled: false,
    },
    processedTransactionIds: [],
  };
}
