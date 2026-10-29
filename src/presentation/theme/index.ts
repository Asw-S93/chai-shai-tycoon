/**
 * Chai-Shai Tycoon Brand Theme
 * Palette per Section 4:
 * - Warm Saffron (#F4A236)
 * - Cardamom Green (#4A7C59)
 * - Cream (#FFF8E7)
 * - Terracotta (#C85A32)
 * - Deep Tea Brown (#3B1F11)
 */
export const COLORS = {
  saffron: '#F4A236',
  saffronLight: '#FFD180',
  saffronDark: '#D07A12',
  cardamom: '#4A7C59',
  cardamomLight: '#6DA37D',
  cardamomDark: '#2E5439',
  cream: '#FFF8E7',
  creamWarm: '#F7E7CE',
  terracotta: '#C85A32',
  terracottaDark: '#9A3D1C',
  teaBrown: '#3B1F11',
  teaBrownMid: '#5C331E',
  teaBrownLight: '#855236',
  milkWhite: '#FFFDF9',
  danger: '#D64545',
  warning: '#E69F00',
  success: '#3B8EA5',
  gold: '#F5B700',
  mutedText: '#7D5E4C',
  overlayBg: 'rgba(59, 31, 17, 0.72)',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const MIN_TOUCH_TARGET_DP = 48; // Exceeds 44dp minimum requirement
