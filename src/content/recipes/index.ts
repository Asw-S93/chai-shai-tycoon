import { RecipeDefinition } from '../../domain/entities';
import { IngredientId, RecipeId } from '../../domain/value-objects';

/**
 * Data-driven recipes matching Section 5 of the specification:
 * - cutting: Cutting Chai | tea 1, milk 1, sugar 1 | 4s | 10 coins | level 1
 * - adrak: Adrak Chai | tea 1, milk 1, ginger 1 | 6s | 15 coins | level 2
 * - elaichi: Elaichi Chai | tea 1, milk 1, cardamom 1 | 7s | 18 coins | level 3
 * - masala: Masala Chai | tea 1, milk 1, spices 1 | 9s | 24 coins | level 5
 */
export const RECIPES_CATALOG: readonly RecipeDefinition[] = [
  {
    id: 'cutting',
    name: 'Cutting Chai',
    description: 'Classic roadside half-glass strong tea with milk and sugar.',
    ingredients: { tea: 1, milk: 1, sugar: 1 },
    baseBrewTimeMs: 4000,
    baseCoins: 10,
    xpReward: 15,
    unlockLevel: 1,
  },
  {
    id: 'adrak',
    name: 'Adrak Chai',
    description: 'Zesty crushed ginger simmered in rich milky tea.',
    ingredients: { tea: 1, milk: 1, ginger: 1 },
    baseBrewTimeMs: 6000,
    baseCoins: 15,
    xpReward: 22,
    unlockLevel: 2,
  },
  {
    id: 'elaichi',
    name: 'Elaichi Chai',
    description: 'Fragrant green cardamom pods steeped for a royal aroma.',
    ingredients: { tea: 1, milk: 1, cardamom: 1 },
    baseBrewTimeMs: 7000,
    baseCoins: 18,
    xpReward: 28,
    unlockLevel: 3,
  },
  {
    id: 'masala',
    name: 'Masala Chai',
    description: 'Warming blend of secret bazaar spices, milk, and Assam leaf.',
    ingredients: { tea: 1, milk: 1, spices: 1 },
    baseBrewTimeMs: 9000,
    baseCoins: 24,
    xpReward: 38,
    unlockLevel: 5,
  },
] as const;

export const RECIPE_BY_ID: Record<RecipeId, RecipeDefinition> = {
  cutting: RECIPES_CATALOG[0],
  adrak: RECIPES_CATALOG[1],
  elaichi: RECIPES_CATALOG[2],
  masala: RECIPES_CATALOG[3],
};

export interface IngredientMetadata {
  readonly id: IngredientId;
  readonly name: string;
  readonly colorHex: string;
  readonly shortLabel: string;
}

export const INGREDIENT_METADATA: Record<IngredientId, IngredientMetadata> = {
  tea: { id: 'tea', name: 'Assam Tea Leaf', colorHex: '#4E2A14', shortLabel: 'Tea' },
  milk: { id: 'milk', name: 'Fresh Milk', colorHex: '#FFF8E7', shortLabel: 'Milk' },
  sugar: { id: 'sugar', name: 'Cane Sugar', colorHex: '#F3E5AB', shortLabel: 'Sugar' },
  ginger: { id: 'ginger', name: 'Fresh Ginger', colorHex: '#D99B26', shortLabel: 'Adrak' },
  cardamom: {
    id: 'cardamom',
    name: 'Green Cardamom',
    colorHex: '#4A7C59',
    shortLabel: 'Elaichi',
  },
  spices: {
    id: 'spices',
    name: 'Warm Bazaar Spices',
    colorHex: '#B84A27',
    shortLabel: 'Masala',
  },
};
