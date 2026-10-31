import { ImageSourcePropType } from 'react-native';
import {
  CustomerArchetypeId,
  IngredientId,
  RecipeId,
  UpgradeId,
} from '../../domain/value-objects';

/**
 * Deterministic Asset Manifest.
 * Decouples game rules from visual sprite/color representation so art can be replaced
 * without touching domain or application code.
 */
export interface SpriteAssetDescriptor {
  readonly id: string;
  readonly label: string;
  readonly intendedWidth: number;
  readonly intendedHeight: number;
  readonly primaryColorHex: string;
  readonly accentColorHex: string;
  readonly badgeGlyph: string;
  readonly spriteSource: ImageSourcePropType;
  readonly stopMotionFrames?: readonly [ImageSourcePropType, ImageSourcePropType];
  readonly femaleStopMotionFrames?: readonly [
    ImageSourcePropType,
    ImageSourcePropType,
  ];
}

export type StreetVehicleId =
  | 'autorickshaw'
  | 'city_bus'
  | 'scooter'
  | 'cycle_rickshaw';

export const SPRITE_ASSETS = {
  stallBackdrop: require('../../../assets/sprites/stall_backdrop.png') as ImageSourcePropType,
  streetBackdrop: require('../../../assets/sprites/street_backdrop.png') as ImageSourcePropType,
  vehicles: {
    autorickshaw: require('../../../assets/sprites/veh_autorickshaw.png') as ImageSourcePropType,
    city_bus: require('../../../assets/sprites/veh_city_bus.png') as ImageSourcePropType,
    scooter: require('../../../assets/sprites/veh_scooter.png') as ImageSourcePropType,
    cycle_rickshaw: require('../../../assets/sprites/veh_cycle_rickshaw.png') as ImageSourcePropType,
  } satisfies Record<StreetVehicleId, ImageSourcePropType>,
  customers: {
    office_worker: [
      require('../../../assets/sprites/cust_office_1.png') as ImageSourcePropType,
      require('../../../assets/sprites/cust_office_2.png') as ImageSourcePropType,
    ] as const,
    student: [
      require('../../../assets/sprites/cust_student_1.png') as ImageSourcePropType,
      require('../../../assets/sprites/cust_student_2.png') as ImageSourcePropType,
    ] as const,
    regular: [
      require('../../../assets/sprites/cust_regular_1.png') as ImageSourcePropType,
      require('../../../assets/sprites/cust_regular_2.png') as ImageSourcePropType,
    ] as const,
  },
  customersFemale: {
    office_worker: [
      require('../../../assets/sprites/cust_office_f_1.png') as ImageSourcePropType,
      require('../../../assets/sprites/cust_office_f_2.png') as ImageSourcePropType,
    ] as const,
    student: [
      require('../../../assets/sprites/cust_student_f_1.png') as ImageSourcePropType,
      require('../../../assets/sprites/cust_student_f_2.png') as ImageSourcePropType,
    ] as const,
    regular: [
      require('../../../assets/sprites/cust_regular_f_1.png') as ImageSourcePropType,
      require('../../../assets/sprites/cust_regular_f_2.png') as ImageSourcePropType,
    ] as const,
  },
  chaiwala: [
    require('../../../assets/sprites/chaiwala_1.png') as ImageSourcePropType,
    require('../../../assets/sprites/chaiwala_2.png') as ImageSourcePropType,
  ] as const,
  chhotu: [
    require('../../../assets/sprites/chhotu_1.png') as ImageSourcePropType,
    require('../../../assets/sprites/chhotu_2.png') as ImageSourcePropType,
  ] as const,
  props: {
    brassStove: require('../../../assets/sprites/prop_brass_stove.png') as ImageSourcePropType,
    copperTins: require('../../../assets/sprites/prop_copper_tins.png') as ImageSourcePropType,
    bambooStool: require('../../../assets/sprites/prop_bamboo_stool.png') as ImageSourcePropType,
    marigoldLantern: require('../../../assets/sprites/prop_marigold_lantern.png') as ImageSourcePropType,
  },
  recipes: {
    cutting: require('../../../assets/sprites/chai_cutting.png') as ImageSourcePropType,
    adrak: require('../../../assets/sprites/chai_adrak.png') as ImageSourcePropType,
    elaichi: require('../../../assets/sprites/chai_elaichi.png') as ImageSourcePropType,
    masala: require('../../../assets/sprites/chai_masala.png') as ImageSourcePropType,
  } satisfies Record<RecipeId, ImageSourcePropType>,
  kettles: {
    idle: require('../../../assets/sprites/kettle_idle.png') as ImageSourcePropType,
    brewing: [
      require('../../../assets/sprites/kettle_brewing_1.png') as ImageSourcePropType,
      require('../../../assets/sprites/kettle_brewing_2.png') as ImageSourcePropType,
    ] as const,
    ready: require('../../../assets/sprites/kettle_ready.png') as ImageSourcePropType,
  },
  ingredients: {
    tea: require('../../../assets/sprites/ing_tea.png') as ImageSourcePropType,
    milk: require('../../../assets/sprites/ing_milk.png') as ImageSourcePropType,
    sugar: require('../../../assets/sprites/ing_sugar.png') as ImageSourcePropType,
    ginger: require('../../../assets/sprites/ing_ginger.png') as ImageSourcePropType,
    cardamom: require('../../../assets/sprites/ing_cardamom.png') as ImageSourcePropType,
    spices: require('../../../assets/sprites/ing_spices.png') as ImageSourcePropType,
  } satisfies Record<IngredientId, ImageSourcePropType>,
} as const;

export const FEMALE_CUSTOMER_NAMES: ReadonlySet<string> = new Set([
  'Priya',
  'Neha',
  'Kavita',
  'Diya',
  'Ananya',
  'Meera',
  'Bua Ji',
  'Dadi',
]);

/**
 * Returns the gender-matched 2-frame stop-motion sprite array for a customer order
 * so female customers (Priya, Neha, Kavita, Diya, Ananya, Meera, Bua Ji, Dadi)
 * always use their dedicated female character art.
 */
export function getCustomerStopMotionFrames(
  archetypeId: CustomerArchetypeId,
  customerName: string,
): readonly [ImageSourcePropType, ImageSourcePropType] {
  const normalized = customerName.trim();
  if (FEMALE_CUSTOMER_NAMES.has(normalized)) {
    return SPRITE_ASSETS.customersFemale[archetypeId];
  }
  return SPRITE_ASSETS.customers[archetypeId];
}

export const UPGRADE_VISUAL_MANIFEST: Record<UpgradeId, ImageSourcePropType> = {
  faster_brewing: SPRITE_ASSETS.props.brassStove,
  second_burner: SPRITE_ASSETS.kettles.brewing[0],
  larger_storage: SPRITE_ASSETS.props.copperTins,
  additional_patience: SPRITE_ASSETS.chhotu[0],
  larger_queue: SPRITE_ASSETS.props.bambooStool,
  better_tips: SPRITE_ASSETS.props.marigoldLantern,
};

export const RECIPE_VISUAL_MANIFEST: Record<RecipeId, SpriteAssetDescriptor> = {
  cutting: {
    id: 'spr_chai_cutting',
    label: 'Cutting Chai Glass',
    intendedWidth: 96,
    intendedHeight: 96,
    primaryColorHex: '#C67D3B',
    accentColorHex: '#F7E7CE',
    badgeGlyph: '☕',
    spriteSource: SPRITE_ASSETS.recipes.cutting,
  },
  adrak: {
    id: 'spr_chai_adrak',
    label: 'Adrak Ginger Chai',
    intendedWidth: 96,
    intendedHeight: 96,
    primaryColorHex: '#D98A2B',
    accentColorHex: '#FFE4B5',
    badgeGlyph: '🫚',
    spriteSource: SPRITE_ASSETS.recipes.adrak,
  },
  elaichi: {
    id: 'spr_chai_elaichi',
    label: 'Elaichi Cardamom Chai',
    intendedWidth: 96,
    intendedHeight: 96,
    primaryColorHex: '#B87333',
    accentColorHex: '#4A7C59',
    badgeGlyph: '🌿',
    spriteSource: SPRITE_ASSETS.recipes.elaichi,
  },
  masala: {
    id: 'spr_chai_masala',
    label: 'Royal Masala Chai',
    intendedWidth: 96,
    intendedHeight: 96,
    primaryColorHex: '#8B3A1E',
    accentColorHex: '#F4A236',
    badgeGlyph: '✨',
    spriteSource: SPRITE_ASSETS.recipes.masala,
  },
};

export const CUSTOMER_VISUAL_MANIFEST: Record<
  CustomerArchetypeId,
  SpriteAssetDescriptor
> = {
  office_worker: {
    id: 'spr_cust_office_worker',
    label: 'Office Commuter',
    intendedWidth: 120,
    intendedHeight: 150,
    primaryColorHex: '#2C5E8A',
    accentColorHex: '#F4A236',
    badgeGlyph: '💼',
    spriteSource: SPRITE_ASSETS.customers.office_worker[0],
    stopMotionFrames: SPRITE_ASSETS.customers.office_worker,
    femaleStopMotionFrames: SPRITE_ASSETS.customersFemale.office_worker,
  },
  student: {
    id: 'spr_cust_student',
    label: 'College Student',
    intendedWidth: 120,
    intendedHeight: 150,
    primaryColorHex: '#4A7C59',
    accentColorHex: '#FFD166',
    badgeGlyph: '🎒',
    spriteSource: SPRITE_ASSETS.customers.student[0],
    stopMotionFrames: SPRITE_ASSETS.customers.student,
    femaleStopMotionFrames: SPRITE_ASSETS.customersFemale.student,
  },
  regular: {
    id: 'spr_cust_regular',
    label: 'Mohalla Regular',
    intendedWidth: 120,
    intendedHeight: 150,
    primaryColorHex: '#C85A32',
    accentColorHex: '#FFF8E7',
    badgeGlyph: '🧣',
    spriteSource: SPRITE_ASSETS.customers.regular[0],
    stopMotionFrames: SPRITE_ASSETS.customers.regular,
    femaleStopMotionFrames: SPRITE_ASSETS.customersFemale.regular,
  },
};
