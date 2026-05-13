import z from "zod";

export const GameSchema = z.object({
  id: z.number(),
  game_code: z.string(),
  sport_type: z.string(),
  home_team: z.string(),
  away_team: z.string(),
  home_score: z.number(),
  away_score: z.number(),
  time_remaining: z.number(),
  half: z.number(),
  home_timeouts: z.number(),
  away_timeouts: z.number(),
  home_blitzes: z.number(),
  away_blitzes: z.number(),
  is_running: z.number(), // SQLite stores booleans as 0/1
  status: z.string(),
  clock_mode: z.string().optional(), // "running", "stop", "manual"
  clock_direction: z.string().optional(), // "up", "down"
  clock_started_at: z.string().optional().nullable(), // ISO timestamp when clock was last started
  time_at_start: z.number().optional().nullable(), // time_remaining when clock was started
  created_at: z.string(),
  updated_at: z.string(),
  created_by_user_id: z.string().optional().nullable(),
  assigned_referee_id: z.number().optional().nullable(),
  scheduled_date: z.string().optional().nullable(),
  scheduled_time: z.string().optional().nullable(),
  field_location: z.string().optional().nullable(),
  field_id: z.number().optional().nullable(),
  template_id: z.number().optional().nullable(),
  // Baseball
  inning: z.number().optional(),
  balls: z.number().optional(),
  strikes: z.number().optional(),
  outs: z.number().optional(),
  pitch_count: z.number().optional(),
  // Basketball
  home_fouls: z.number().optional(),
  away_fouls: z.number().optional(),
  bonus_situation: z.string().optional().nullable(),
  // Tackle Football
  down: z.number().optional(),
  yards_to_go: z.number().optional(),
  ball_on: z.number().optional(),
  // Hockey
  home_penalties: z.number().optional(),
  away_penalties: z.number().optional(),
  penalty_time_remaining: z.number().optional(),
  period: z.number().optional(),
  home_shots_on_goal: z.number().optional(),
  away_shots_on_goal: z.number().optional(),
  // Tennis
  home_games_won: z.number().optional(),
  away_games_won: z.number().optional(),
  home_sets_won: z.number().optional(),
  away_sets_won: z.number().optional(),
  current_server: z.string().optional().nullable(),
  // Soccer / Field Hockey / Lacrosse
  home_shots: z.number().optional(),
  away_shots: z.number().optional(),
  home_yellow_cards: z.number().optional(),
  away_yellow_cards: z.number().optional(),
  home_red_cards: z.number().optional(),
  away_red_cards: z.number().optional(),
  stoppage_time: z.number().optional(),
  is_stoppage_time: z.number().optional(),
  is_shootout_mode: z.number().optional(),
  home_penalty_kicks: z.number().optional(),
  away_penalty_kicks: z.number().optional(),
  // Field Hockey specific
  home_green_cards: z.number().optional(),
  away_green_cards: z.number().optional(),
  home_penalty_corners: z.number().optional(),
  away_penalty_corners: z.number().optional(),
  // Lacrosse specific
  home_faceoffs: z.number().optional(),
  away_faceoffs: z.number().optional(),
  home_ground_balls: z.number().optional(),
  away_ground_balls: z.number().optional(),
  branding_id: z.number().optional().nullable(),
  display_mode: z.string().optional().nullable(),
  division: z.string().optional().nullable(),
  coordinator_user_id: z.number().optional().nullable(),
});

export type Game = z.infer<typeof GameSchema>;

export const UpdateGameStateSchema = z.object({
  home_score: z.number().optional(),
  away_score: z.number().optional(),
  time_remaining: z.number().optional(),
  half: z.number().optional(),
  home_timeouts: z.number().optional(),
  away_timeouts: z.number().optional(),
  home_blitzes: z.number().optional(),
  away_blitzes: z.number().optional(),
  is_running: z.number().optional(),
  clock_mode: z.string().optional(),
  clock_direction: z.string().optional(),
  clock_started_at: z.string().nullable().optional(),
  time_at_start: z.number().nullable().optional(),
  // Baseball
  inning: z.number().optional(),
  balls: z.number().optional(),
  strikes: z.number().optional(),
  outs: z.number().optional(),
  pitch_count: z.number().optional(),
  // Basketball
  home_fouls: z.number().optional(),
  away_fouls: z.number().optional(),
  bonus_situation: z.string().optional(),
  // Tackle Football
  down: z.number().optional(),
  yards_to_go: z.number().optional(),
  ball_on: z.number().optional(),
  // Hockey
  home_penalties: z.number().optional(),
  away_penalties: z.number().optional(),
  penalty_time_remaining: z.number().optional(),
  period: z.number().optional(),
  home_shots_on_goal: z.number().optional(),
  away_shots_on_goal: z.number().optional(),
  // Tennis
  home_games_won: z.number().optional(),
  away_games_won: z.number().optional(),
  home_sets_won: z.number().optional(),
  away_sets_won: z.number().optional(),
  current_server: z.string().optional(),
  // Soccer / Field Hockey / Lacrosse
  home_shots: z.number().optional(),
  away_shots: z.number().optional(),
  home_yellow_cards: z.number().optional(),
  away_yellow_cards: z.number().optional(),
  home_red_cards: z.number().optional(),
  away_red_cards: z.number().optional(),
  stoppage_time: z.number().optional(),
  is_stoppage_time: z.number().optional(),
  is_shootout_mode: z.number().optional(),
  home_penalty_kicks: z.number().optional(),
  away_penalty_kicks: z.number().optional(),
  // Field Hockey specific
  home_green_cards: z.number().optional(),
  away_green_cards: z.number().optional(),
  home_penalty_corners: z.number().optional(),
  away_penalty_corners: z.number().optional(),
  // Lacrosse specific
  home_faceoffs: z.number().optional(),
  away_faceoffs: z.number().optional(),
  home_ground_balls: z.number().optional(),
  away_ground_balls: z.number().optional(),
});

export type UpdateGameState = z.infer<typeof UpdateGameStateSchema>;

export const ScoreboardTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  sport_type: z.string(),
  description: z.string().nullable(),
  default_time: z.number(),
  time_format: z.string(),
  has_halves: z.number(),
  has_quarters: z.number(),
  has_periods: z.number(),
  period_count: z.number(),
  period_label: z.string(),
  has_timeouts: z.number(),
  timeouts_per_period: z.number(),
  has_blitzes: z.number(),
  blitzes_per_period: z.number(),
  has_flag_football_downs: z.number().optional(),
  has_fouls: z.number(),
  fouls_limit: z.number(),
  has_possession: z.number(),
  custom_fields: z.string().nullable(),
  is_active: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  // Baseball
  has_innings: z.number().optional(),
  has_balls_strikes: z.number().optional(),
  has_outs: z.number().optional(),
  has_pitch_count: z.number().optional(),
  // Tackle Football
  has_downs: z.number().optional(),
  has_yards: z.number().optional(),
  // Hockey
  has_penalties: z.number().optional(),
  has_penalty_time: z.number().optional(),
  has_shots_on_goal: z.number().optional(),
  // Tennis
  has_games_sets: z.number().optional(),
});

export type ScoreboardTemplate = z.infer<typeof ScoreboardTemplateSchema>;

export const BrandingSchema = z.object({
  id: z.number(),
  organization_name: z.string(),
  logo_url: z.string().nullable(),
  primary_color: z.string(),
  secondary_color: z.string(),
  background_color: z.string(),
  text_color: z.string(),
  accent_color: z.string(),
  is_active: z.number(),
  created_by_user_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Branding = z.infer<typeof BrandingSchema>;

// User roles: admin (site owner), coordinator (paying customer), referee, viewer
export const UserRoles = ["admin", "coordinator", "referee", "viewer"] as const;
export type UserRole = (typeof UserRoles)[number];

// Subscription tiers for coordinators
export const SubscriptionTiers = ["basic", "standard", "premium"] as const;
export type SubscriptionTier = (typeof SubscriptionTiers)[number];

export const UserSchema = z.object({
  id: z.number(),
  mocha_user_id: z.string(),
  email: z.string(),
  role: z.enum(UserRoles),
  subscription_tier: z.enum(SubscriptionTiers).nullable().optional(),
  organization_name: z.string().nullable().optional(),
  subscription_start_date: z.string().nullable().optional(),
  subscription_end_date: z.string().nullable().optional(),
  fields_allowed: z.number().nullable().optional(),
  coordinator_id: z.number().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const SponsorSchema = z.object({
  id: z.number(),
  name: z.string(),
  logo_url: z.string().nullable(),
  website_url: z.string().nullable(),
  additional_text: z.string().nullable(),
  is_active: z.number(),
  coordinator_user_id: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Sponsor = z.infer<typeof SponsorSchema>;

// Feature access by tier
export const TierFeatures = {
  basic: [
    "live_scoreboard",
    "realtime_updates",
    "qr_codes",
    "mobile_viewing",
  ],
  standard: [
    "live_scoreboard",
    "realtime_updates",
    "qr_codes",
    "mobile_viewing",
    "multi_field_view",
    "bulk_scheduling",
    "custom_branding",
  ],
  premium: [
    "live_scoreboard",
    "realtime_updates",
    "qr_codes",
    "mobile_viewing",
    "multi_field_view",
    "bulk_scheduling",
    "custom_branding",
    "sponsorship",
    "referee_management",
    "large_display_mode",
    "premium_layouts",
  ],
} as const;
