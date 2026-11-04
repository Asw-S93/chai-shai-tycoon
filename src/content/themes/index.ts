export type CityThemeId = 'delhi' | 'mumbai' | 'jaipur';

export interface SkyPalette {
  readonly skyTop: string;
  readonly skyBottom: string;
  readonly rushSkyTop: string;
  readonly rushSkyBottom: string;
  readonly hazeColor: string;
  readonly rushHazeColor: string;
}

export interface MonumentConfig {
  readonly id: string;
  readonly name: string;
  readonly monumentType: 'india_gate' | 'gateway_of_india' | 'hawa_mahal';
  readonly tagline: string;
  readonly silhouetteColor: string;
  readonly rushSilhouetteColor: string;
}

export interface LevelThemeConfig {
  readonly themeId: CityThemeId;
  readonly cityName: string;
  readonly levelRange: readonly [number, number];
  readonly monument: MonumentConfig;
  readonly sky: SkyPalette;
  readonly roadColor: string;
  readonly roadLineColor: string;
  readonly curbColor: string;
  readonly sidewalkColor: string;
  readonly horizonRatio: number;
  readonly birdType: 'pigeon' | 'seagull' | 'kite';
  readonly ambientPropLabels: readonly string[];
}

export const CITY_THEMES: Record<CityThemeId, LevelThemeConfig> = {
  delhi: {
    themeId: 'delhi',
    cityName: 'Old Delhi Heritage',
    levelRange: [1, 2],
    monument: {
      id: 'india_gate',
      name: 'India Gate & Rajpath',
      monumentType: 'india_gate',
      tagline: 'Historic sandstone arch under morning mist',
      silhouetteColor: '#93664A',
      rushSilhouetteColor: '#6B311E',
    },
    sky: {
      skyTop: '#DCEBF5',
      skyBottom: '#FDEBD0',
      rushSkyTop: '#A03A28',
      rushSkyBottom: '#F9A05C',
      hazeColor: 'rgba(253, 235, 208, 0.45)',
      rushHazeColor: 'rgba(249, 160, 92, 0.55)',
    },
    roadColor: '#444140',
    roadLineColor: '#F7D070',
    curbColor: '#8C827A',
    sidewalkColor: '#BAACA1',
    horizonRatio: 0.38,
    birdType: 'pigeon',
    ambientPropLabels: ['Banyan Leaves', 'Fairy Lights', 'Pigeons'],
  },
  mumbai: {
    themeId: 'mumbai',
    cityName: 'Coastal Mumbai Bazaar',
    levelRange: [3, 4],
    monument: {
      id: 'gateway_of_india',
      name: 'Gateway of India',
      monumentType: 'gateway_of_india',
      tagline: 'Grand basalt arch overlooking Arabian sea breezes',
      silhouetteColor: '#5C6F84',
      rushSilhouetteColor: '#423B5A',
    },
    sky: {
      skyTop: '#C8E6F5',
      skyBottom: '#FFF0D9',
      rushSkyTop: '#7E3B68',
      rushSkyBottom: '#F58F66',
      hazeColor: 'rgba(200, 230, 245, 0.40)',
      rushHazeColor: 'rgba(245, 143, 102, 0.50)',
    },
    roadColor: '#36383B',
    roadLineColor: '#FFFFFF',
    curbColor: '#7A8288',
    sidewalkColor: '#A5ACB0',
    horizonRatio: 0.38,
    birdType: 'seagull',
    ambientPropLabels: ['Marine Breeze', 'Seagulls', 'Cutting Glasses'],
  },
  jaipur: {
    themeId: 'jaipur',
    cityName: 'Royal Pink City Bazaar',
    levelRange: [5, 6],
    monument: {
      id: 'hawa_mahal',
      name: 'Hawa Mahal (Palace of Winds)',
      monumentType: 'hawa_mahal',
      tagline: 'Ornate pink honeycomb sandstone palace',
      silhouetteColor: '#B2533E',
      rushSilhouetteColor: '#6B1D2F',
    },
    sky: {
      skyTop: '#F8B195',
      skyBottom: '#FFF3CD',
      rushSkyTop: '#5B2C6F',
      rushSkyBottom: '#E74C3C',
      hazeColor: 'rgba(248, 177, 149, 0.45)',
      rushHazeColor: 'rgba(231, 76, 60, 0.55)',
    },
    roadColor: '#4A3B32',
    roadLineColor: '#FFD700',
    curbColor: '#9C6F5A',
    sidewalkColor: '#C49782',
    horizonRatio: 0.38,
    birdType: 'kite',
    ambientPropLabels: ['Fluttering Kites', 'Brass Lanterns', 'Marigold Garlands'],
  },
};

/**
 * Returns the corresponding city theme config based on the player's level:
 * - Levels 1-2: Old Delhi Heritage (India Gate)
 * - Levels 3-4: Coastal Mumbai Bazaar (Gateway of India)
 * - Levels 5+: Royal Pink City (Hawa Mahal)
 */
export function getLevelTheme(level: number): LevelThemeConfig {
  if (level <= 2) {
    return CITY_THEMES.delhi;
  }
  if (level <= 4) {
    return CITY_THEMES.mumbai;
  }
  return CITY_THEMES.jaipur;
}
