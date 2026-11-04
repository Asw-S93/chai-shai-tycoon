import {
  CITY_THEMES,
  getLevelTheme,
} from '../../src/content/themes';

describe('Level-Based Thematic Art & Monument Progression (tests/unit/levelThemes.test.ts)', () => {
  test('1. Levels 1 & 2 map to Old Delhi Heritage (India Gate)', () => {
    const themeL1 = getLevelTheme(1);
    const themeL2 = getLevelTheme(2);

    expect(themeL1.themeId).toBe('delhi');
    expect(themeL1.monument.id).toBe('india_gate');
    expect(themeL1.monument.monumentType).toBe('india_gate');
    expect(themeL1.birdType).toBe('pigeon');

    expect(themeL2.themeId).toBe('delhi');
    expect(themeL2.monument.name).toContain('India Gate');
  });

  test('2. Levels 3 & 4 map to Coastal Mumbai Bazaar (Gateway of India)', () => {
    const themeL3 = getLevelTheme(3);
    const themeL4 = getLevelTheme(4);

    expect(themeL3.themeId).toBe('mumbai');
    expect(themeL3.monument.id).toBe('gateway_of_india');
    expect(themeL3.monument.monumentType).toBe('gateway_of_india');
    expect(themeL3.birdType).toBe('seagull');

    expect(themeL4.themeId).toBe('mumbai');
  });

  test('3. Levels 5 & 6+ map to Royal Pink City (Hawa Mahal)', () => {
    const themeL5 = getLevelTheme(5);
    const themeL6 = getLevelTheme(6);
    const themeL10 = getLevelTheme(10);

    expect(themeL5.themeId).toBe('jaipur');
    expect(themeL5.monument.id).toBe('hawa_mahal');
    expect(themeL5.monument.monumentType).toBe('hawa_mahal');
    expect(themeL5.birdType).toBe('kite');

    expect(themeL6.themeId).toBe('jaipur');
    expect(themeL10.themeId).toBe('jaipur');
  });

  test('4. All city themes have complete sky palettes and road styling', () => {
    for (const theme of Object.values(CITY_THEMES)) {
      expect(theme.sky.skyTop).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.sky.skyBottom).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.sky.rushSkyTop).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.sky.rushSkyBottom).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.roadColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.curbColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.horizonRatio).toBeGreaterThan(0.2);
      expect(theme.horizonRatio).toBeLessThan(0.6);
    }
  });
});
