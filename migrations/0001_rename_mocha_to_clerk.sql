-- Full schema for ScoreLink Live.
-- Uses clerk_user_id (not mocha_user_id) since this is created post-Clerk migration.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clerk_user_id TEXT UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  subscription_tier TEXT,
  organization_name TEXT,
  subscription_start_date TEXT,
  subscription_end_date TEXT,
  fields_allowed INTEGER,
  sport_type TEXT,
  template_config TEXT,
  is_onboarded INTEGER DEFAULT 0,
  first_name TEXT,
  last_name TEXT,
  contact_email TEXT,
  phone_number TEXT,
  street_1 TEXT,
  street_2 TEXT,
  city TEXT,
  state_province TEXT,
  country TEXT,
  zip_code TEXT,
  coordinator_id INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sport_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  sport_type TEXT NOT NULL,
  organization_name TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'basic',
  subscription_start_date TEXT,
  subscription_end_date TEXT,
  fields_allowed INTEGER NOT NULL DEFAULT 1,
  billing_period TEXT DEFAULT 'monthly',
  template_config TEXT,
  is_onboarded INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scoreboard_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sport_type TEXT NOT NULL,
  description TEXT,
  default_time INTEGER NOT NULL DEFAULT 1200,
  time_format TEXT NOT NULL DEFAULT 'mm:ss',
  has_halves INTEGER NOT NULL DEFAULT 0,
  has_quarters INTEGER NOT NULL DEFAULT 0,
  has_periods INTEGER NOT NULL DEFAULT 0,
  period_count INTEGER NOT NULL DEFAULT 2,
  period_label TEXT NOT NULL DEFAULT 'Half',
  has_timeouts INTEGER NOT NULL DEFAULT 0,
  timeouts_per_period INTEGER NOT NULL DEFAULT 3,
  has_blitzes INTEGER NOT NULL DEFAULT 0,
  blitzes_per_period INTEGER NOT NULL DEFAULT 3,
  has_flag_football_downs INTEGER NOT NULL DEFAULT 0,
  has_fouls INTEGER NOT NULL DEFAULT 0,
  fouls_limit INTEGER NOT NULL DEFAULT 5,
  has_possession INTEGER NOT NULL DEFAULT 0,
  has_innings INTEGER NOT NULL DEFAULT 0,
  has_balls_strikes INTEGER NOT NULL DEFAULT 0,
  has_outs INTEGER NOT NULL DEFAULT 0,
  has_pitch_count INTEGER NOT NULL DEFAULT 0,
  has_downs INTEGER NOT NULL DEFAULT 0,
  has_yards INTEGER NOT NULL DEFAULT 0,
  has_penalties INTEGER NOT NULL DEFAULT 0,
  has_penalty_time INTEGER NOT NULL DEFAULT 0,
  has_shots_on_goal INTEGER NOT NULL DEFAULT 0,
  has_games_sets INTEGER NOT NULL DEFAULT 0,
  custom_fields TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branding (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#f59e0b',
  secondary_color TEXT NOT NULL DEFAULT '#0ea5e9',
  background_color TEXT NOT NULL DEFAULT '#0f172a',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  accent_color TEXT NOT NULL DEFAULT '#fbbf24',
  coordinator_user_id INTEGER REFERENCES users(id),
  created_by_user_id TEXT,
  sport_account_id INTEGER REFERENCES sport_accounts(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sponsors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  additional_text TEXT,
  coordinator_user_id INTEGER REFERENCES users(id),
  sport_account_id INTEGER REFERENCES sport_accounts(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT,
  coordinator_user_id INTEGER REFERENCES users(id),
  sport_account_id INTEGER REFERENCES sport_accounts(id),
  status TEXT NOT NULL DEFAULT 'pending',
  activated_at TEXT,
  expires_at TEXT,
  branding_id INTEGER REFERENCES branding(id),
  sponsor_id INTEGER REFERENCES sponsors(id),
  template_id INTEGER REFERENCES scoreboard_templates(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS referees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  coordinator_user_id INTEGER REFERENCES users(id),
  sport_account_id INTEGER REFERENCES sport_accounts(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_code TEXT NOT NULL UNIQUE,
  sport_type TEXT NOT NULL DEFAULT 'flag_football',
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  time_remaining INTEGER NOT NULL DEFAULT 1200,
  half INTEGER NOT NULL DEFAULT 1,
  home_timeouts INTEGER NOT NULL DEFAULT 2,
  away_timeouts INTEGER NOT NULL DEFAULT 2,
  home_blitzes INTEGER NOT NULL DEFAULT 2,
  away_blitzes INTEGER NOT NULL DEFAULT 2,
  is_running INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  clock_mode TEXT,
  clock_direction TEXT,
  clock_started_at TEXT,
  time_at_start INTEGER,
  created_by_user_id TEXT,
  assigned_referee_id INTEGER REFERENCES referees(id),
  scheduled_date TEXT,
  scheduled_time TEXT,
  field_location TEXT,
  field_id INTEGER REFERENCES fields(id),
  template_id INTEGER REFERENCES scoreboard_templates(id),
  sport_account_id INTEGER REFERENCES sport_accounts(id),
  coordinator_user_id INTEGER REFERENCES users(id),
  branding_id INTEGER REFERENCES branding(id),
  display_mode TEXT,
  division TEXT,
  -- Baseball
  inning INTEGER DEFAULT 1,
  balls INTEGER DEFAULT 0,
  strikes INTEGER DEFAULT 0,
  outs INTEGER DEFAULT 0,
  pitch_count INTEGER DEFAULT 0,
  -- Basketball
  home_fouls INTEGER DEFAULT 0,
  away_fouls INTEGER DEFAULT 0,
  bonus_situation TEXT,
  -- Tackle Football
  down INTEGER DEFAULT 1,
  yards_to_go INTEGER DEFAULT 10,
  ball_on INTEGER DEFAULT 20,
  -- Hockey
  home_penalties INTEGER DEFAULT 0,
  away_penalties INTEGER DEFAULT 0,
  penalty_time_remaining INTEGER DEFAULT 0,
  period INTEGER DEFAULT 1,
  home_shots_on_goal INTEGER DEFAULT 0,
  away_shots_on_goal INTEGER DEFAULT 0,
  -- Tennis
  home_games_won INTEGER DEFAULT 0,
  away_games_won INTEGER DEFAULT 0,
  home_sets_won INTEGER DEFAULT 0,
  away_sets_won INTEGER DEFAULT 0,
  current_server TEXT,
  -- Soccer / Field Hockey / Lacrosse
  home_shots INTEGER DEFAULT 0,
  away_shots INTEGER DEFAULT 0,
  home_yellow_cards INTEGER DEFAULT 0,
  away_yellow_cards INTEGER DEFAULT 0,
  home_red_cards INTEGER DEFAULT 0,
  away_red_cards INTEGER DEFAULT 0,
  stoppage_time INTEGER DEFAULT 0,
  is_stoppage_time INTEGER DEFAULT 0,
  is_shootout_mode INTEGER DEFAULT 0,
  home_penalty_kicks INTEGER DEFAULT 0,
  away_penalty_kicks INTEGER DEFAULT 0,
  -- Field Hockey
  home_green_cards INTEGER DEFAULT 0,
  away_green_cards INTEGER DEFAULT 0,
  home_penalty_corners INTEGER DEFAULT 0,
  away_penalty_corners INTEGER DEFAULT 0,
  -- Lacrosse
  home_faceoffs INTEGER DEFAULT 0,
  away_faceoffs INTEGER DEFAULT 0,
  home_ground_balls INTEGER DEFAULT 0,
  away_ground_balls INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_referees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  referee_id INTEGER NOT NULL REFERENCES referees(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_sponsors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  sponsor_id INTEGER NOT NULL REFERENCES sponsors(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_field_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  field_id INTEGER NOT NULL REFERENCES fields(id),
  assigned_by_user_id INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS field_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  field_location TEXT NOT NULL,
  coordinator_user_id INTEGER REFERENCES users(id),
  sport_account_id INTEGER REFERENCES sport_accounts(id),
  activated_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
