// Sports configuration data - defines all supported sports and their options

export type SportType =
  | 'flag_football'
  | 'basketball'
  | 'tackle_football'
  | 'soccer'
  | 'baseball_softball'
  | 'volleyball'
  | 'tennis'
  | 'lacrosse'
  | 'hockey'
  | 'field_hockey';

export interface SportConfig {
  id: SportType;
  name: string;
  icon: string; // Lucide icon name
  description: string;
  isAvailable: boolean; // Whether it's available for selection
  
  // Standard data points
  hasTeamNames: boolean;
  hasScore: boolean;
  hasClock: boolean;
  hasTimeouts: boolean;
  
  // Period/inning structure
  periodType: 'half' | 'quarter' | 'period' | 'inning' | 'set' | 'game';
  defaultPeriodCount: number;
  periodOptions?: number[]; // e.g., [2, 4] for halves vs quarters
  
  // Clock settings
  defaultClockMinutes: number;
  clockOptions?: number[];
  defaultClockDirection: 'up' | 'down';
  clockDirectionOptions?: ('up' | 'down')[];
  
  // Sport-specific features
  features: {
    // Flag football
    hasBlitzes?: boolean;
    
    // Basketball
    hasShotClock?: boolean;
    
    // Tackle football
    hasDownDistance?: boolean;
    hasPlayClock?: boolean;
    hasYardLine?: boolean;
    hasSimplifiedMode?: boolean;
    
    // Soccer
    hasStoppageTime?: boolean;
    hasShootout?: boolean;
    
    // Baseball/Softball
    hasBallsStrikes?: boolean;
    hasOuts?: boolean;
    hasInningHalf?: boolean; // top/bottom
    hasPitchCount?: boolean;
    hasBaseRunners?: boolean;
    hasTimerMode?: boolean; // timer-based vs inning-based
    
    // Volleyball
    hasSetsWon?: boolean;
    hasBestOf?: boolean; // best of 3 vs 5
    hasMatchPoint?: boolean;
    
    // Tennis
    hasGamePoints?: boolean;
    hasGamesInSet?: boolean;
    hasTiebreak?: boolean;
    hasNoAdScoring?: boolean;
    hasSuperTiebreak?: boolean;
    
    // Lacrosse/Hockey/Field Hockey
    hasPenaltyTimer?: boolean;
    hasOvertime?: boolean;
    hasShootoutMode?: boolean;
  };
  
  // Default template config
  defaultTemplate: SportTemplateConfig;
}

export interface SportTemplateConfig {
  game_length_minutes: number;
  clock_direction: 'up' | 'down';
  period_count: number;
  period_label: string;
  timeouts_per_period: number;
  
  // Flag football specific
  blitzes_per_period?: number;
  track_blitzes?: boolean;
  
  // Basketball specific
  shot_clock_enabled?: boolean;
  shot_clock_seconds?: number;
  running_clock?: boolean;
  
  // Tackle football specific
  track_down_distance?: boolean;
  track_yard_line?: boolean;
  play_clock_enabled?: boolean;
  play_clock_seconds?: number;
  simplified_mode?: boolean;
  
  // Soccer specific
  track_stoppage_time?: boolean;
  shootout_enabled?: boolean;
  
  // Baseball/Softball specific
  track_pitch_count?: boolean;
  show_base_runners?: boolean;
  timer_based_game?: boolean;
  
  // Volleyball specific
  best_of?: 3 | 5;
  show_match_point?: boolean;
  
  // Tennis specific
  singles_mode?: boolean;
  best_of_sets?: 1 | 3;
  tiebreak_enabled?: boolean;
  no_ad_scoring?: boolean;
  super_tiebreak?: boolean;
  
  // Lacrosse/Hockey specific
  penalty_timer_enabled?: boolean;
  overtime_mode?: boolean;
  shootout_mode?: boolean;
}

export const SPORTS: SportConfig[] = [
  {
    id: 'flag_football',
    name: 'Flag Football',
    icon: 'FlagTriangleRight',
    description: 'Youth and recreational flag football',
    isAvailable: true,
    hasTeamNames: true,
    hasScore: true,
    hasClock: true,
    hasTimeouts: true,
    periodType: 'half',
    defaultPeriodCount: 2,
    periodOptions: [2, 4],
    defaultClockMinutes: 20,
    clockOptions: [10, 15, 20, 25, 30],
    defaultClockDirection: 'down',
    clockDirectionOptions: ['up', 'down'],
    features: {
      hasBlitzes: true,
    },
    defaultTemplate: {
      game_length_minutes: 20,
      clock_direction: 'down',
      period_count: 2,
      period_label: 'Half',
      timeouts_per_period: 2,
      blitzes_per_period: 2,
      track_blitzes: true,
    },
  },
  {
    id: 'basketball',
    name: 'Basketball',
    icon: 'Dribbble',
    description: 'Basketball with optional shot clock',
    isAvailable: true,
    hasTeamNames: true,
    hasScore: true,
    hasClock: true,
    hasTimeouts: true,
    periodType: 'quarter',
    defaultPeriodCount: 4,
    periodOptions: [2, 4],
    defaultClockMinutes: 8,
    clockOptions: [6, 8, 10, 12],
    defaultClockDirection: 'down',
    clockDirectionOptions: ['down'],
    features: {
      hasShotClock: true,
    },
    defaultTemplate: {
      game_length_minutes: 8,
      clock_direction: 'down',
      period_count: 4,
      period_label: 'Quarter',
      timeouts_per_period: 2,
      shot_clock_enabled: false,
      shot_clock_seconds: 24,
      running_clock: false,
    },
  },
  {
    id: 'tackle_football',
    name: 'Football',
    icon: 'Shield',
    description: 'American football with down and distance tracking',
    isAvailable: true,
    hasTeamNames: true,
    hasScore: true,
    hasClock: true,
    hasTimeouts: true,
    periodType: 'quarter',
    defaultPeriodCount: 4,
    periodOptions: [4],
    defaultClockMinutes: 12,
    clockOptions: [8, 10, 12],
    defaultClockDirection: 'down',
    clockDirectionOptions: ['down'],
    features: {
      hasDownDistance: true,
      hasPlayClock: true,
      hasYardLine: true,
      hasSimplifiedMode: true,
    },
    defaultTemplate: {
      game_length_minutes: 12,
      clock_direction: 'down',
      period_count: 4,
      period_label: 'Quarter',
      timeouts_per_period: 3,
      track_down_distance: true,
      track_yard_line: true,
      play_clock_enabled: true,
      play_clock_seconds: 40,
      simplified_mode: false,
    },
  },
  {
    id: 'soccer',
    name: 'Soccer',
    icon: 'Globe',
    description: 'Soccer/Football with stoppage time support',
    isAvailable: true,
    hasTeamNames: true,
    hasScore: true,
    hasClock: true,
    hasTimeouts: false,
    periodType: 'half',
    defaultPeriodCount: 2,
    periodOptions: [2, 4],
    defaultClockMinutes: 45,
    clockOptions: [20, 25, 30, 35, 40, 45],
    defaultClockDirection: 'up',
    clockDirectionOptions: ['up', 'down'],
    features: {
      hasStoppageTime: true,
      hasShootout: true,
    },
    defaultTemplate: {
      game_length_minutes: 45,
      clock_direction: 'up',
      period_count: 2,
      period_label: 'Half',
      timeouts_per_period: 0,
      track_stoppage_time: true,
      shootout_enabled: false,
    },
  },
  {
    id: 'baseball_softball',
    name: 'Baseball / Softball',
    icon: 'CircleDot',
    description: 'Baseball and softball with balls, strikes, and outs',
    isAvailable: true,
    hasTeamNames: true,
    hasScore: true,
    hasClock: false,
    hasTimeouts: false,
    periodType: 'inning',
    defaultPeriodCount: 9,
    periodOptions: [5, 6, 7, 9],
    defaultClockMinutes: 0,
    clockOptions: [],
    defaultClockDirection: 'down',
    features: {
      hasBallsStrikes: true,
      hasOuts: true,
      hasInningHalf: true,
      hasPitchCount: true,
      hasBaseRunners: true,
      hasTimerMode: true,
    },
    defaultTemplate: {
      game_length_minutes: 0,
      clock_direction: 'down',
      period_count: 7,
      period_label: 'Inning',
      timeouts_per_period: 0,
      track_pitch_count: false,
      show_base_runners: false,
      timer_based_game: false,
    },
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    icon: 'Hexagon',
    description: 'Volleyball with set tracking',
    isAvailable: true,
    hasTeamNames: true,
    hasScore: true,
    hasClock: false,
    hasTimeouts: true,
    periodType: 'set',
    defaultPeriodCount: 3,
    periodOptions: [3, 5],
    defaultClockMinutes: 0,
    clockOptions: [],
    defaultClockDirection: 'down',
    features: {
      hasSetsWon: true,
      hasBestOf: true,
      hasMatchPoint: true,
    },
    defaultTemplate: {
      game_length_minutes: 0,
      clock_direction: 'down',
      period_count: 3,
      period_label: 'Set',
      timeouts_per_period: 2,
      best_of: 3,
      show_match_point: true,
    },
  },
  {
    id: 'tennis',
    name: 'Tennis',
    icon: 'Crosshair',
    description: 'Tennis with game, set, and match scoring',
    isAvailable: true,
    hasTeamNames: true,
    hasScore: true,
    hasClock: false,
    hasTimeouts: false,
    periodType: 'set',
    defaultPeriodCount: 3,
    periodOptions: [1, 3],
    defaultClockMinutes: 0,
    clockOptions: [],
    defaultClockDirection: 'down',
    features: {
      hasGamePoints: true,
      hasGamesInSet: true,
      hasTiebreak: true,
      hasNoAdScoring: true,
      hasSuperTiebreak: true,
    },
    defaultTemplate: {
      game_length_minutes: 0,
      clock_direction: 'down',
      period_count: 3,
      period_label: 'Set',
      timeouts_per_period: 0,
      singles_mode: true,
      best_of_sets: 3,
      tiebreak_enabled: true,
      no_ad_scoring: false,
      super_tiebreak: false,
    },
  },
  {
    id: 'lacrosse',
    name: 'Lacrosse',
    icon: 'Target',
    description: 'Lacrosse with optional shot clock and penalty timer',
    isAvailable: true,
    hasTeamNames: true,
    hasScore: true,
    hasClock: true,
    hasTimeouts: true,
    periodType: 'quarter',
    defaultPeriodCount: 4,
    periodOptions: [2, 4],
    defaultClockMinutes: 12,
    clockOptions: [8, 10, 12, 15],
    defaultClockDirection: 'down',
    clockDirectionOptions: ['up', 'down'],
    features: {
      hasShotClock: true,
      hasPenaltyTimer: true,
    },
    defaultTemplate: {
      game_length_minutes: 12,
      clock_direction: 'down',
      period_count: 4,
      period_label: 'Quarter',
      timeouts_per_period: 2,
      shot_clock_enabled: false,
      penalty_timer_enabled: false,
    },
  },
  {
    id: 'hockey',
    name: 'Hockey',
    icon: 'Slash',
    description: 'Ice hockey with penalty timer and shootout support',
    isAvailable: true,
    hasTeamNames: true,
    hasScore: true,
    hasClock: true,
    hasTimeouts: true,
    periodType: 'period',
    defaultPeriodCount: 3,
    periodOptions: [3],
    defaultClockMinutes: 15,
    clockOptions: [12, 15, 20],
    defaultClockDirection: 'down',
    clockDirectionOptions: ['down'],
    features: {
      hasPenaltyTimer: true,
      hasOvertime: true,
      hasShootoutMode: true,
    },
    defaultTemplate: {
      game_length_minutes: 15,
      clock_direction: 'down',
      period_count: 3,
      period_label: 'Period',
      timeouts_per_period: 1,
      penalty_timer_enabled: true,
      overtime_mode: false,
      shootout_mode: false,
    },
  },
  {
    id: 'field_hockey',
    name: 'Field Hockey',
    icon: 'Grip',
    description: 'Field hockey with period options and penalty support',
    isAvailable: true,
    hasTeamNames: true,
    hasScore: true,
    hasClock: true,
    hasTimeouts: true,
    periodType: 'quarter',
    defaultPeriodCount: 4,
    periodOptions: [2, 4],
    defaultClockMinutes: 15,
    clockOptions: [12, 15, 17, 20],
    defaultClockDirection: 'down',
    clockDirectionOptions: ['up', 'down'],
    features: {
      hasPenaltyTimer: true,
      hasShootoutMode: true,
    },
    defaultTemplate: {
      game_length_minutes: 15,
      clock_direction: 'down',
      period_count: 4,
      period_label: 'Quarter',
      timeouts_per_period: 1,
      penalty_timer_enabled: false,
      shootout_mode: false,
    },
  },
];

// Helper functions
export function getSportById(id: SportType): SportConfig | undefined {
  return SPORTS.find(sport => sport.id === id);
}

export function getAvailableSports(): SportConfig[] {
  return SPORTS.filter(sport => sport.isAvailable);
}

export function getSportPeriodLabel(sportId: SportType, count: number): string {
  const sport = getSportById(sportId);
  if (!sport) return 'Period';
  
  if (count === 2 && sport.periodOptions?.includes(2)) {
    return 'Half';
  } else if (count === 4 && sport.periodOptions?.includes(4)) {
    return sport.periodType === 'quarter' ? 'Quarter' : 'Period';
  } else if (sport.periodType === 'inning') {
    return 'Inning';
  } else if (sport.periodType === 'set') {
    return 'Set';
  } else if (sport.periodType === 'period') {
    return 'Period';
  }
  
  return sport.defaultTemplate.period_label;
}

// Tennis scoring helpers
export const TENNIS_POINTS = ['0', '15', '30', '40', 'AD'];

export function formatTennisScore(points: number, opponentPoints: number): string {
  if (points >= 3 && opponentPoints >= 3) {
    if (points === opponentPoints) return '40';
    if (points > opponentPoints) return 'AD';
    return '40';
  }
  return TENNIS_POINTS[Math.min(points, 3)] || '0';
}
