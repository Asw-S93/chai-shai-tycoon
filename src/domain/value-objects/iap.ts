/**
 * In-App Purchase Product Identifiers
 */
export type IapProductId =
  | 'cs_coins_pouch'
  | 'cs_coins_pot'
  | 'cs_coins_chest'
  | 'cs_bundle_starter';

export type IapProductType = 'consumable' | 'non_consumable';

export interface IapProduct {
  readonly id: IapProductId;
  readonly title: string;
  readonly description: string;
  readonly priceFormatted: string;
  readonly coinsReward: number;
  readonly permanentTipBonus: number;
  readonly type: IapProductType;
  readonly badgeLabel?: string;
  readonly glyph: string;
}

export interface IapPurchaseReceipt {
  readonly productId: IapProductId;
  readonly transactionId: string;
  readonly purchaseToken: string;
  readonly purchaseTimeMs: number;
}

export interface IapPurchaseResult {
  readonly success: boolean;
  readonly productId: IapProductId;
  readonly coinsAwarded: number;
  readonly error?: string;
}

export const IAP_CATALOG: readonly IapProduct[] = [
  {
    id: 'cs_coins_pouch',
    title: 'Pouch of Coins',
    description: '150 copper & brass coins for quick tea leaves and milk restocking.',
    priceFormatted: '₹29',
    coinsReward: 150,
    permanentTipBonus: 0,
    type: 'consumable',
    glyph: '💰',
  },
  {
    id: 'cs_coins_pot',
    title: 'Pot of Saffron Coins',
    description: '500 coins to unlock stoves and spices right away.',
    priceFormatted: '₹79',
    coinsReward: 500,
    permanentTipBonus: 0,
    type: 'consumable',
    badgeLabel: 'POPULAR',
    glyph: '🏺',
  },
  {
    id: 'cs_coins_chest',
    title: 'Royal Bazaar Chest',
    description: '1500 coins for massive empire upgrades and full pantry capacity.',
    priceFormatted: '₹199',
    coinsReward: 1500,
    permanentTipBonus: 0,
    type: 'consumable',
    badgeLabel: 'BEST VALUE',
    glyph: '👑',
  },
  {
    id: 'cs_bundle_starter',
    title: 'Chaiwala Starter Pack',
    description: '300 coins + Permanent +10% customer tip generosity boost!',
    priceFormatted: '₹99',
    coinsReward: 300,
    permanentTipBonus: 0.1,
    type: 'non_consumable',
    badgeLabel: 'SPECIAL',
    glyph: '✨',
  },
] as const;

export const IAP_PRODUCT_BY_ID: Record<IapProductId, IapProduct> = {
  cs_coins_pouch: IAP_CATALOG[0],
  cs_coins_pot: IAP_CATALOG[1],
  cs_coins_chest: IAP_CATALOG[2],
  cs_bundle_starter: IAP_CATALOG[3],
};
