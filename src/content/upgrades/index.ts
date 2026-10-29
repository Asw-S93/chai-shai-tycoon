import { UpgradeDefinition } from '../../domain/entities';
import { UpgradeId } from '../../domain/value-objects';

/**
 * Six upgrades required by Section 5:
 * 1. faster_brewing (equipment)
 * 2. second_burner (equipment)
 * 3. larger_queue (decor)
 * 4. better_tips (decor)
 * 5. larger_storage (equipment)
 * 6. additional_patience (staff)
 */
export const UPGRADES_CATALOG: readonly UpgradeDefinition[] = [
  {
    id: 'faster_brewing',
    name: 'High-Flame Brass Stove',
    description: 'Reduces chai brewing time by 12% per level.',
    category: 'equipment',
    maxLevel: 4,
    baseCost: 45,
    costMultiplier: 1.6,
    effectPerLevel: 0.12,
  },
  {
    id: 'second_burner',
    name: 'Twin Tapri Burner',
    description: 'Unlocks a second kettle station to brew two cups simultaneously.',
    category: 'equipment',
    maxLevel: 1,
    baseCost: 80,
    costMultiplier: 1.0,
    effectPerLevel: 1,
  },
  {
    id: 'larger_storage',
    name: 'Spiced Copper Tins',
    description: 'Increases max storage per ingredient by +5 units per level.',
    category: 'equipment',
    maxLevel: 4,
    baseCost: 35,
    costMultiplier: 1.5,
    effectPerLevel: 5,
  },
  {
    id: 'additional_patience',
    name: 'Friendly Chhotu Helper',
    description: 'Warm banter keeps customers waiting +4 seconds longer per level.',
    category: 'staff',
    maxLevel: 4,
    baseCost: 40,
    costMultiplier: 1.55,
    effectPerLevel: 4,
  },
  {
    id: 'larger_queue',
    name: 'Bazaar Bamboo Stools',
    description: 'Adds +1 waiting spot to your stall queue per level.',
    category: 'decor',
    maxLevel: 3,
    baseCost: 55,
    costMultiplier: 1.75,
    effectPerLevel: 1,
  },
  {
    id: 'better_tips',
    name: 'Marigold & Lantern Decor',
    description: 'Boosts customer tip generosity by +15% per level (up to the 30% cap).',
    category: 'decor',
    maxLevel: 4,
    baseCost: 50,
    costMultiplier: 1.6,
    effectPerLevel: 0.15,
  },
] as const;

export const UPGRADE_BY_ID: Record<UpgradeId, UpgradeDefinition> = {
  faster_brewing: UPGRADES_CATALOG[0],
  second_burner: UPGRADES_CATALOG[1],
  larger_storage: UPGRADES_CATALOG[2],
  additional_patience: UPGRADES_CATALOG[3],
  larger_queue: UPGRADES_CATALOG[4],
  better_tips: UPGRADES_CATALOG[5],
};
