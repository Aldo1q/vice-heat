// Vice Heat tuning: one fixed logical viewport over a much larger coastal
// city, a fixed 1/60 s simulation step, and the dusk neon palette the whole
// game is painted in. No rule below depends on the display size.

export const VIEW = { width: 1280, height: 720 };
export const WORLD = { width: 3840, height: 2160 };
export const STEP = 1 / 60;

/** Vertical road centre lines (x) and horizontal ones (y); roads are ROAD_W wide. */
export const V_ROADS = [360, 1060, 1760, 2460, 3020];
export const H_ROADS = [360, 1080, 1800];
export const ROAD_W = 190;
export const LANE = 46;

/** The beach: sand starts here, water starts at WATER_X, world edge is the sea. */
export const SAND_X = 3180;
export const WATER_X = 3500;

export const PLAYER = {
  walkSpeed: 215,
  radius: 13,
};

export const CAR = {
  length: 54,
  width: 27,
  accel: 340,
  brake: 620,
  reverseMax: 130,
  drag: 0.55,
  gripTurn: 2.6,
};

export const CAR_TYPES = [
  { name: 'Banshee', color: '#ff2e88', topSpeed: 520 },
  { name: 'Comet', color: '#22d3ee', topSpeed: 490 },
  { name: 'Sentinel', color: '#f5c542', topSpeed: 430 },
  { name: 'Rancher', color: '#7dd956', topSpeed: 400 },
  { name: 'Moonbeam', color: '#b388ff', topSpeed: 380 },
  { name: 'Admiral', color: '#ff7a45', topSpeed: 415 },
  { name: 'Faggio', color: '#eeeeee', topSpeed: 350 },
  { name: 'Infernus', color: '#ff3860', topSpeed: 545 },
];

export const BUILDING_NAMES = [
  'HOTEL', 'CLUB NEON', 'DINER', 'PALMS CASINO', 'VICE HOTEL', 'BAR',
  'OCEAN INN', 'CLUB MIRA', 'TACO RIO', 'HOTEL SOL', 'NEON GYM', 'LIQUOR',
  'PIZZA VICE', 'HOTEL LUNA', 'CLUB PULSE', 'SURF SHOP', 'BANCO', 'MOTEL',
  'CIGARS', 'HOTEL ROSA', 'DISCO 84', 'RAMEN', 'PALM COURT', 'ARCADE',
];

export const PALETTE = {
  backdrop: '#17102b',
  grass: '#352a5e',
  grassAlt: '#3d2f6a',
  sidewalk: '#4a3f78',
  sidewalkEdge: '#5d4f96',
  asphalt: '#241a45',
  asphaltAlt: '#2a1f52',
  lane: '#e8e3ff',
  crosswalk: '#cfc6f5',
  sand: '#e8a56b',
  sandDark: '#d18f52',
  water: '#123a6e',
  waterLight: '#1d5a9e',
  foam: '#bfe9ff',
  shadow: 'rgba(16,6,38,0.42)',
  neonPink: '#ff2e88',
  neonCyan: '#22d3ee',
  neonYellow: '#ffd93b',
  sunset: '#ff7a45',
  text: '#ffffff',
  muted: '#bdb3e8',
  cashGreen: '#5dff8f',
  gold: '#ffd93b',
  red: '#ff3b3b',
  blue: '#3b82ff',
};

export const FONT = '"Arial Narrow", "Helvetica Neue Condensed", Impact, system-ui, sans-serif';
export const FONT_BODY = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'vice-heat.best';
