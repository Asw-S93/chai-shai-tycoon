import { CustomerArchetypeId, RecipeId } from '../../domain/value-objects';

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
}

export const RECIPE_VISUAL_MANIFEST: Record<RecipeId, SpriteAssetDescriptor> = {
  cutting: {
    id: 'spr_chai_cutting',
    label: 'Cutting Chai Glass',
    intendedWidth: 96,
    intendedHeight: 96,
    primaryColorHex: '#C67D3B',
    accentColorHex: '#F7E7CE',
    badgeGlyph: '☕',
  },
  adrak: {
    id: 'spr_chai_adrak',
    label: 'Adrak Ginger Chai',
    intendedWidth: 96,
    intendedHeight: 96,
    primaryColorHex: '#D98A2B',
    accentColorHex: '#FFE4B5',
    badgeGlyph: '🫚',
  },
  elaichi: {
    id: 'spr_chai_elaichi',
    label: 'Elaichi Cardamom Chai',
    intendedWidth: 96,
    intendedHeight: 96,
    primaryColorHex: '#B87333',
    accentColorHex: '#4A7C59',
    badgeGlyph: '🌿',
  },
  masala: {
    id: 'spr_chai_masala',
    label: 'Royal Masala Chai',
    intendedWidth: 96,
    intendedHeight: 96,
    primaryColorHex: '#8B3A1E',
    accentColorHex: '#F4A236',
    badgeGlyph: '✨',
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
  },
  student: {
    id: 'spr_cust_student',
    label: 'College Student',
    intendedWidth: 120,
    intendedHeight: 150,
    primaryColorHex: '#4A7C59',
    accentColorHex: '#FFD166',
    badgeGlyph: '🎒',
  },
  regular: {
    id: 'spr_cust_regular',
    label: 'Mohalla Regular',
    intendedWidth: 120,
    intendedHeight: 150,
    primaryColorHex: '#C85A32',
    accentColorHex: '#FFF8E7',
    badgeGlyph: '🧣',
  },
};
