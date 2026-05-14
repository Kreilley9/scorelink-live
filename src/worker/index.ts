import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie } from "hono/cookie";
import { Game, UpdateGameStateSchema, ScoreboardTemplate, Branding, TierFeatures } from "@/shared/types";
import { createClerkClient } from "@clerk/backend";
import twilio from "twilio";
import Stripe from "stripe";
import OpenAI from "openai";
import { ScoreLinkToAiOpsClient } from "./scorelinkToAiOpsClient";

interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  RESEND_API_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  OPENAI_API_KEY: string;
  OPS_ADMIN_EMAIL?: string;
  AI_OPS_BASE_URL: string;
  AI_OPS_CONNECTOR_SECRET: string;
}

const app = new Hono<{ Bindings: Env; Variables: { clerkUserId: string } }>();

app.use("/*", cors());

async function sendEmail(apiKey: string, opts: {
  from?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
}): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: opts.from ?? "ScoreLink <noreply@scorelinksports.com>",
        to: [opts.to],
        subject: opts.subject,
        ...(opts.html ? { html: opts.html } : {}),
        ...(opts.text ? { text: opts.text } : {}),
        ...(opts.reply_to ? { reply_to: opts.reply_to } : {}),
      }),
    });
    if (!res.ok) {
      const err = await res.json<{ message?: string }>().catch(() => ({}));
      return { success: false, error: err.message ?? `HTTP ${res.status}` };
    }
    const data = await res.json<{ id: string }>();
    return { success: true, message_id: data.id };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Unknown error" };
  }
}

async function clerkAuthMiddleware(c: any, next: any) {
  const token =
    c.req.header("Authorization")?.replace("Bearer ", "") ??
    getCookie(c, "__session");

  if (!token) return c.json({ error: "Not authenticated" }, 401);

  try {
    const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY });
    const payload = await clerk.verifyToken(token);
    c.set("clerkUserId", payload.sub);
    await next();
  } catch {
    return c.json({ error: "Not authenticated" }, 401);
  }
}

app.get("/api/users/me", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  // Get or create user with role
  let user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{
      id: number;
      clerk_user_id: string;
      email: string;
      role: string;
      subscription_tier: string | null;
      organization_name: string | null;
      subscription_start_date: string | null;
      subscription_end_date: string | null;
      fields_allowed: number | null;
      sport_type: string | null;
      template_config: string | null;
      is_onboarded: number | null;
    }>();

  if (!user) {
    // Create new user with default "viewer" role
    // First user becomes admin with premium tier, otherwise viewer
    const userCount = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users")
      .first<{ count: number }>();

    const role = userCount && userCount.count === 0 ? "admin" : "viewer";
    const tier = userCount && userCount.count === 0 ? "premium" : null;
    const fieldsAllowed = userCount && userCount.count === 0 ? 999999 : null;

    const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY });
    const clerkUser = await clerk.users.getUser(clerkUserId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress ?? "";

    await c.env.DB.prepare(
      "INSERT INTO users (clerk_user_id, email, role, subscription_tier, fields_allowed) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(clerkUserId, userEmail, role, tier, fieldsAllowed)
      .run();

    user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE clerk_user_id = ?"
    )
      .bind(clerkUserId)
      .first();
  } else if (user.role === "admin" && (!user.subscription_tier || !user.fields_allowed)) {
    // Auto-upgrade existing admin accounts that don't have tier/fields set
    await c.env.DB.prepare(
      "UPDATE users SET subscription_tier = ?, fields_allowed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
      .bind("premium", 999999, user.id)
      .run();
    
    // Refresh user data
    user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE clerk_user_id = ?"
    )
      .bind(clerkUserId)
      .first();
  }

  // Calculate features available based on role and tier
  let features: string[] = [];
  if (user?.role === "admin") {
    // Admin has all features
    features = [...TierFeatures.premium];
  } else if (user?.role === "coordinator" && user.subscription_tier) {
    features = [...TierFeatures[user.subscription_tier as keyof typeof TierFeatures]];
  } else if (user?.role === "referee") {
    // Referees get basic features for controlling games
    features = ["live_scoreboard", "realtime_updates"];
  }

  return c.json({
    id: user?.id,
    clerk_user_id: clerkUserId,
    email: user?.email,
    role: user?.role,
    subscription_tier: user?.subscription_tier,
    organization_name: user?.organization_name,
    subscription_start_date: user?.subscription_start_date,
    subscription_end_date: user?.subscription_end_date,
    fields_allowed: user?.fields_allowed,
    sport_type: user?.sport_type || "flag_football",
    template_config: user?.template_config ? JSON.parse(user.template_config) : null,
    is_onboarded: user?.is_onboarded === 1,
    features,
  });
});

// Onboarding endpoint - save user's organization and template
app.post("/api/users/onboarding", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const body = await c.req.json();
  const { organization_name, sport_type, template_config, first_name, last_name, email, phone_number, street_1, street_2, city, state_province, country, zip_code } = body;

  if (!sport_type || !template_config) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  // Update user with onboarding info and set role to coordinator
  await c.env.DB.prepare(`
    UPDATE users 
    SET organization_name = ?, 
        sport_type = ?, 
        template_config = ?,
        first_name = ?,
        last_name = ?,
        contact_email = ?,
        phone_number = ?,
        street_1 = ?,
        street_2 = ?,
        city = ?,
        state_province = ?,
        country = ?,
        zip_code = ?,
        role = CASE WHEN role = 'viewer' THEN 'coordinator' ELSE role END,
        is_onboarded = 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE clerk_user_id = ?
  `)
    .bind(
      organization_name || null,
      sport_type,
      JSON.stringify(template_config),
      first_name || null,
      last_name || null,
      email || null,
      phone_number || null,
      street_1 || null,
      street_2 || null,
      city || null,
      state_province || null,
      country || null,
      zip_code || null,
      clerkUserId
    )
    .run();

  // Send customer update to AI Ops (non-blocking)
  try {
    const dbUser = await c.env.DB.prepare("SELECT email FROM users WHERE clerk_user_id = ?")
      .bind(clerkUserId).first<{ email: string }>();
    const fallbackEmail = dbUser?.email ?? "";
    const client = new ScoreLinkToAiOpsClient(c.env);
    await client.sendCustomerUpdate({
      externalCustomerId: clerkUserId,
      name: `${first_name || ''} ${last_name || ''}`.trim() || fallbackEmail,
      email: email || fallbackEmail,
      companyName: organization_name || undefined,
      planKey: 'free',
      status: 'active',
      billingEmail: email || fallbackEmail
    });
  } catch (error) {
    console.error('Failed to send customer update to AI Ops:', error);
  }

  return c.json({ success: true });
});

// Update user's template settings
app.patch("/api/users/template", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const body = await c.req.json();
  const { template_config } = body;

  if (!template_config) {
    return c.json({ error: "Missing template_config" }, 400);
  }

  await c.env.DB.prepare(`
    UPDATE users 
    SET template_config = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE clerk_user_id = ?
  `)
    .bind(
      JSON.stringify(template_config),
      clerkUserId
    )
    .run();

  return c.json({ success: true });
});

app.get("/api/logout", async (c) => {
  return c.json({ success: true }, 200);
});

// ==================== SPORT ACCOUNTS ====================

// Get all sport accounts for the current user
app.get("/api/sport-accounts", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  // Get the user's internal ID
  const user = await c.env.DB.prepare(
    "SELECT id FROM users WHERE clerk_user_id = ?"
  ).bind(clerkUserId).first<{ id: number }>();

  if (!user) {
    return c.json([], 200);
  }

  const accounts = await c.env.DB.prepare(
    `SELECT * FROM sport_accounts WHERE user_id = ? AND is_active = 1 ORDER BY created_at ASC`
  ).bind(user.id).all();

  return c.json(accounts.results || [], 200);
});

// Create a new sport account
app.post("/api/sport-accounts", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const user = await c.env.DB.prepare(
    "SELECT id FROM users WHERE clerk_user_id = ?"
  ).bind(clerkUserId).first<{ id: number }>();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const body = await c.req.json();
  const { sport_type, organization_name, subscription_tier, fields_allowed, template_config } = body;

  if (!sport_type) {
    return c.json({ error: "sport_type is required" }, 400);
  }

  // Check if user already has an account for this sport
  const existing = await c.env.DB.prepare(
    "SELECT id FROM sport_accounts WHERE user_id = ? AND sport_type = ? AND is_active = 1"
  ).bind(user.id, sport_type).first();

  if (existing) {
    return c.json({ error: "You already have an account for this sport" }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO sport_accounts (user_id, sport_type, organization_name, subscription_tier, fields_allowed, template_config, is_onboarded, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
  ).bind(
    user.id,
    sport_type,
    organization_name || null,
    subscription_tier || 'basic',
    fields_allowed || 1,
    template_config || null
  ).run();

  const newAccount = await c.env.DB.prepare(
    "SELECT * FROM sport_accounts WHERE id = ?"
  ).bind(result.meta.last_row_id).first();

  return c.json(newAccount, 201);
});

// Update a sport account
app.patch("/api/sport-accounts/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const accountId = parseInt(c.req.param("id"));
  const body = await c.req.json();

  // Get user
  const user = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  ).bind(clerkUserId).first<{ id: number; role: string }>();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  // Check ownership (or admin)
  const account = await c.env.DB.prepare(
    "SELECT * FROM sport_accounts WHERE id = ?"
  ).bind(accountId).first();

  if (!account) {
    return c.json({ error: "Sport account not found" }, 404);
  }

  if (account.user_id !== user.id && user.role !== 'admin') {
    return c.json({ error: "Not authorized" }, 403);
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (body.organization_name !== undefined) {
    updates.push("organization_name = ?");
    values.push(body.organization_name);
  }
  if (body.subscription_tier !== undefined) {
    updates.push("subscription_tier = ?");
    values.push(body.subscription_tier);
  }
  if (body.subscription_start_date !== undefined) {
    updates.push("subscription_start_date = ?");
    values.push(body.subscription_start_date);
  }
  if (body.subscription_end_date !== undefined) {
    updates.push("subscription_end_date = ?");
    values.push(body.subscription_end_date);
  }
  if (body.fields_allowed !== undefined) {
    updates.push("fields_allowed = ?");
    values.push(body.fields_allowed);
  }
  if (body.template_config !== undefined) {
    updates.push("template_config = ?");
    values.push(body.template_config);
  }
  if (body.is_onboarded !== undefined) {
    updates.push("is_onboarded = ?");
    values.push(body.is_onboarded ? 1 : 0);
  }

  if (updates.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  updates.push("updated_at = datetime('now')");
  values.push(accountId);

  await c.env.DB.prepare(
    `UPDATE sport_accounts SET ${updates.join(", ")} WHERE id = ?`
  ).bind(...values).run();

  const updatedAccount = await c.env.DB.prepare(
    "SELECT * FROM sport_accounts WHERE id = ?"
  ).bind(accountId).first();

  return c.json(updatedAccount, 200);
});

// Delete (deactivate) a sport account
app.delete("/api/sport-accounts/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const accountId = parseInt(c.req.param("id"));

  const user = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  ).bind(clerkUserId).first<{ id: number; role: string }>();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const account = await c.env.DB.prepare(
    "SELECT * FROM sport_accounts WHERE id = ?"
  ).bind(accountId).first();

  if (!account) {
    return c.json({ error: "Sport account not found" }, 404);
  }

  if (account.user_id !== user.id && user.role !== 'admin') {
    return c.json({ error: "Not authorized" }, 403);
  }

  // Soft delete
  await c.env.DB.prepare(
    "UPDATE sport_accounts SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
  ).bind(accountId).run();

  return c.json({ success: true }, 200);
});

// ==================== END SPORT ACCOUNTS ====================

// Get active games (public endpoint for multi-field view)
app.get("/api/games/active", async (c) => {
  const coordinatorId = c.req.query("coordinator");
  
  let query = `SELECT id, game_code, home_team, away_team, home_score, away_score, 
               time_remaining, half, period, is_running, status, sport_type, field_location 
               FROM games WHERE status = 'active' OR status = 'live'`;
  const params: any[] = [];
  
  if (coordinatorId) {
    query += " AND created_by_user_id = ?";
    params.push(coordinatorId);
  }
  
  query += " ORDER BY field_location ASC, created_at DESC";
  
  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  return c.json(results || []);
});

// Get all games (must come before /api/games/:code to avoid route conflict)
app.get("/api/games/all", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator", "referee"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  // Get sport_account_id from query params
  const sportAccountId = c.req.query("sport_account_id");

  let query = "SELECT * FROM games";
  let params: any[] = [];
  let conditions: string[] = [];
  
  // Coordinators only see their own games
  if (currentUser.role === "coordinator") {
    conditions.push("created_by_user_id = ?");
    params.push(clerkUserId);
  }
  
  // Filter by sport_account_id if provided
  if (sportAccountId) {
    conditions.push("sport_account_id = ?");
    params.push(parseInt(sportAccountId));
  }
  
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  
  query += " ORDER BY scheduled_date DESC, scheduled_time DESC, created_at DESC";

  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  // Fetch referee assignments for all games
  const gamesWithReferees = await Promise.all(
    (results || []).map(async (game: any) => {
      const referees = await c.env.DB.prepare(
        `SELECT r.id, r.name, r.phone_number FROM referees r
         JOIN game_referees gr ON r.id = gr.referee_id
         WHERE gr.game_id = ?`
      )
        .bind(game.id)
        .all();
      
      return {
        ...game,
        referees: referees.results || []
      };
    })
  );

  return c.json(gamesWithReferees);
});

// Get game by code
app.get("/api/games/:code", async (c) => {
  const code = c.req.param("code");
  
  const game = await c.env.DB.prepare(
    `SELECT g.*, 
            COALESCE(gb.id, fb.id) as branding_id,
            COALESCE(gb.organization_name, fb.organization_name) as branding_org_name,
            COALESCE(gb.primary_color, fb.primary_color) as branding_primary_color,
            COALESCE(gb.secondary_color, fb.secondary_color) as branding_secondary_color,
            COALESCE(gb.background_color, fb.background_color) as branding_background_color,
            COALESCE(gb.text_color, fb.text_color) as branding_text_color,
            COALESCE(gb.accent_color, fb.accent_color) as branding_accent_color,
            COALESCE(gb.logo_url, fb.logo_url) as branding_logo_url
     FROM games g
     LEFT JOIN fields f ON g.field_id = f.id
     LEFT JOIN branding gb ON g.branding_id = gb.id
     LEFT JOIN branding fb ON f.branding_id = fb.id
     WHERE g.game_code = ?`
  )
    .bind(code)
    .first<Game>();

  if (!game) {
    return c.json({ error: "Game not found" }, 404);
  }

  return c.json(game);
});

// Update game state
app.patch("/api/games/:code", async (c) => {
  const code = c.req.param("code");
  const body = await c.req.json();
  
  // Extract client timestamp for conflict resolution
  const clientTimestamp = body.client_timestamp;
  delete body.client_timestamp; // Remove before validation
  
  const validated = UpdateGameStateSchema.safeParse(body);
  if (!validated.success) {
    return c.json({ error: "Invalid input", details: validated.error }, 400);
  }

  const updates = validated.data;
  const fields = Object.keys(updates);
  
  if (fields.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  // Conflict resolution: check if client update is stale
  if (clientTimestamp) {
    const currentGame = await c.env.DB.prepare(
      "SELECT updated_at FROM games WHERE game_code = ?"
    )
      .bind(code)
      .first<{ updated_at: string }>();

    if (currentGame) {
      const serverTimestamp = new Date(currentGame.updated_at).getTime();
      
      // If server was updated after client created this update, reject (client is stale)
      // Allow a 2-second grace period for clock sync issues
      if (serverTimestamp > clientTimestamp + 2000) {
        console.log(`Rejecting stale update: server=${serverTimestamp}, client=${clientTimestamp}`);
        
        // Return current state without updating
        const game = await c.env.DB.prepare(
          "SELECT * FROM games WHERE game_code = ?"
        )
          .bind(code)
          .first<Game>();
        
        return c.json(game);
      }
    }
  }

  const setClause = fields.map(f => `${f} = ?`).join(", ");
  const values = fields.map(f => updates[f as keyof typeof updates]);

  await c.env.DB.prepare(
    `UPDATE games SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE game_code = ?`
  )
    .bind(...values, code)
    .run();

  // Activate field when game clock starts for the first time
  if (updates.is_running === 1) {
    const gameWithField = await c.env.DB.prepare(
      "SELECT field_id FROM games WHERE game_code = ?"
    )
      .bind(code)
      .first<{ field_id: number | null }>();
    
    if (gameWithField?.field_id) {
      await c.env.DB.prepare(
        `UPDATE fields SET 
          status = 'active', 
          activated_at = CURRENT_TIMESTAMP,
          expires_at = datetime('now', '+24 hours'),
          updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND status = 'pending'`
      )
        .bind(gameWithField.field_id)
        .run();
    }
  }

  const game = await c.env.DB.prepare(
    "SELECT * FROM games WHERE game_code = ?"
  )
    .bind(code)
    .first<Game>();

  return c.json(game);
});

// Create a new game (requires referee or admin role)
app.post("/api/games", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  // Check user role
  const user = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!user || !["admin", "coordinator", "referee"].includes(user.role)) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }
  const body = await c.req.json();
  
  const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  await c.env.DB.prepare(
    `INSERT INTO games (
      game_code, sport_type, home_team, away_team, 
      home_score, away_score, time_remaining, half,
      home_timeouts, away_timeouts, home_blitzes, away_blitzes,
      is_running, status, created_by_user_id, sport_account_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      gameCode,
      body.sport_type || "flag_football",
      body.home_team,
      body.away_team,
      0, // home_score
      0, // away_score
      body.time_remaining || 1200, // 20 minutes in seconds
      1, // half
      2, // home_timeouts
      2, // away_timeouts
      2, // home_blitzes
      2, // away_blitzes
      0, // is_running
      "active",
      clerkUserId, // created_by_user_id
      body.sport_account_id || null
    )
    .run();

  const game = await c.env.DB.prepare(
    "SELECT * FROM games WHERE game_code = ?"
  )
    .bind(gameCode)
    .first<Game>();

  return c.json(game);
});

// Update user role (admin only)
app.patch("/api/users/:clerk_user_id/role", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const targetUserId = c.req.param("clerk_user_id");
  const body = await c.req.json();
  
  if (!body.role || !["admin", "coordinator", "referee", "viewer"].includes(body.role)) {
    return c.json({ error: "Invalid role" }, 400);
  }

  // If changing to coordinator, set default tier
  const updateFields = body.role === "coordinator" && body.subscription_tier
    ? "role = ?, subscription_tier = ?, organization_name = ?, fields_allowed = ?"
    : "role = ?";
  
  const updateValues = body.role === "coordinator" && body.subscription_tier
    ? [body.role, body.subscription_tier, body.organization_name || null, body.fields_allowed || 1]
    : [body.role];

  await c.env.DB.prepare(
    `UPDATE users SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE clerk_user_id = ?`
  )
    .bind(...updateValues, targetUserId)
    .run();

  return c.json({ success: true });
});

// Update coordinator subscription (admin only)
app.patch("/api/users/:clerk_user_id/subscription", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const targetUserId = c.req.param("clerk_user_id");
  const body = await c.req.json();
  
  // Validate subscription tier
  if (body.subscription_tier && !["basic", "silver", "gold"].includes(body.subscription_tier)) {
    return c.json({ error: "Invalid subscription tier" }, 400);
  }

  await c.env.DB.prepare(
    `UPDATE users SET 
      subscription_tier = ?, 
      organization_name = ?, 
      subscription_start_date = ?, 
      subscription_end_date = ?, 
      fields_allowed = ?,
      updated_at = CURRENT_TIMESTAMP 
    WHERE clerk_user_id = ?`
  )
    .bind(
      body.subscription_tier || null,
      body.organization_name || null,
      body.subscription_start_date || null,
      body.subscription_end_date || null,
      body.fields_allowed || 0,
      targetUserId
    )
    .run();

  return c.json({ success: true });
});

// Edit user details (admin only)
app.patch("/api/users/:clerk_user_id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const targetUserId = c.req.param("clerk_user_id");
  const body = await c.req.json();
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (body.email !== undefined) {
    updates.push("email = ?");
    values.push(body.email);
  }
  
  if (body.organization_name !== undefined) {
    updates.push("organization_name = ?");
    values.push(body.organization_name);
  }
  
  if (body.sport_type !== undefined) {
    updates.push("sport_type = ?");
    values.push(body.sport_type);
  }
  
  if (body.is_onboarded !== undefined) {
    updates.push("is_onboarded = ?");
    values.push(body.is_onboarded ? 1 : 0);
  }
  
  if (body.template_config !== undefined) {
    updates.push("template_config = ?");
    values.push(body.template_config);
  }

  if (updates.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(targetUserId);

  await c.env.DB.prepare(
    `UPDATE users SET ${updates.join(", ")} WHERE clerk_user_id = ?`
  )
    .bind(...values)
    .run();

  const updatedUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE clerk_user_id = ?"
  )
    .bind(targetUserId)
    .first();

  return c.json(updatedUser);
});

// Delete user (admin only)
app.delete("/api/users/:clerk_user_id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const targetUserId = c.req.param("clerk_user_id");
  
  // Prevent deleting yourself
  if (targetUserId === clerkUserId) {
    return c.json({ error: "Cannot delete your own account" }, 400);
  }

  // Get user's internal ID for cascade deletes
  const userToDelete = await c.env.DB.prepare(
    "SELECT id FROM users WHERE clerk_user_id = ?"
  )
    .bind(targetUserId)
    .first<{ id: number }>();

  if (!userToDelete) {
    return c.json({ error: "User not found" }, 404);
  }

  // Delete related records
  await c.env.DB.prepare("DELETE FROM user_field_assignments WHERE user_id = ?")
    .bind(userToDelete.id)
    .run();
  
  await c.env.DB.prepare("DELETE FROM fields WHERE coordinator_user_id = ?")
    .bind(userToDelete.id)
    .run();
  
  await c.env.DB.prepare("DELETE FROM referees WHERE coordinator_user_id = ?")
    .bind(userToDelete.id)
    .run();
  
  await c.env.DB.prepare("DELETE FROM sponsors WHERE coordinator_user_id = ?")
    .bind(userToDelete.id)
    .run();
  
  await c.env.DB.prepare("DELETE FROM branding WHERE coordinator_user_id = ?")
    .bind(userToDelete.id)
    .run();
  
  // Delete games created by this user
  await c.env.DB.prepare("DELETE FROM games WHERE coordinator_user_id = ?")
    .bind(userToDelete.id)
    .run();
  
  // Finally delete the user
  await c.env.DB.prepare("DELETE FROM users WHERE clerk_user_id = ?")
    .bind(targetUserId)
    .run();

  return c.json({ success: true });
});

// List all users (admin and coordinators can see users)
app.get("/api/users", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  let query = "SELECT * FROM users";
  let params: any[] = [];
  
  // Coordinators only see users assigned to their fields
  if (currentUser.role === "coordinator") {
    query += ` WHERE id IN (
      SELECT DISTINCT ufa.user_id 
      FROM user_field_assignments ufa
      JOIN fields f ON ufa.field_id = f.id
      WHERE f.coordinator_user_id = ?
    ) OR id = ?`;
    params.push(currentUser.id, currentUser.id);
  }
  
  query += " ORDER BY created_at DESC";

  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  return c.json(results);
});

// Create/invite a new user
app.post("/api/users", clerkAuthMiddleware, async (c) => {
  try {
    const clerkUserId = c.get("clerkUserId") as string;
    
    if (!clerkUserId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const currentUser = await c.env.DB.prepare(
      "SELECT id, role FROM users WHERE clerk_user_id = ?"
    )
      .bind(clerkUserId)
      .first<{ id: number; role: string }>();

    if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
      return c.json({ error: "Access denied" }, 403);
    }

    const body = await c.req.json();
    
    if (!body.email || !body.role) {
      return c.json({ error: "email and role are required" }, 400);
    }

    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    )
      .bind(body.email)
      .first();

    if (existingUser) {
      return c.json({ error: "User with this email already exists" }, 400);
    }

    // Coordinators can only create referee/viewer roles
    if (currentUser.role === "coordinator" && !["referee", "viewer"].includes(body.role)) {
      return c.json({ error: "Coordinators can only invite referees and viewers" }, 403);
    }

    // Create placeholder user (they'll complete onboarding on first login)
    const result = await c.env.DB.prepare(
      `INSERT INTO users (clerk_user_id, email, role, is_onboarded, created_at, updated_at) 
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
      .bind(
        `pending_${Date.now()}`, // Temporary placeholder ID
        body.email,
        body.role,
        0 // Not yet onboarded
      )
      .run();

    const newUser = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    )
      .bind(result.meta.last_row_id)
      .first();

    return c.json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    return c.json({ error: "Failed to create user: " + (error instanceof Error ? error.message : String(error)) }, 500);
  }
});

// Get user-field assignments for a user
app.get("/api/users/:user_id/field-assignments", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const userId = parseInt(c.req.param("user_id"));

  let query = `
    SELECT ufa.*, f.name as field_name, f.status as field_status
    FROM user_field_assignments ufa
    JOIN fields f ON ufa.field_id = f.id
    WHERE ufa.user_id = ?
  `;
  let params: any[] = [userId];

  // Coordinators can only see assignments for their own fields
  if (currentUser.role === "coordinator") {
    query += " AND f.coordinator_user_id = ?";
    params.push(currentUser.id);
  }

  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  return c.json(results);
});

// Assign user to field
app.post("/api/users/:user_id/field-assignments", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const userId = parseInt(c.req.param("user_id"));
  const body = await c.req.json();
  
  if (!body.field_id) {
    return c.json({ error: "field_id is required" }, 400);
  }

  // Verify field exists and coordinator has access
  const field = await c.env.DB.prepare(
    "SELECT id, coordinator_user_id FROM fields WHERE id = ?"
  )
    .bind(body.field_id)
    .first<{ id: number; coordinator_user_id: number }>();

  if (!field) {
    return c.json({ error: "Field not found" }, 404);
  }

  // Coordinators can only assign to their own fields
  if (currentUser.role === "coordinator" && field.coordinator_user_id !== currentUser.id) {
    return c.json({ error: "Access denied" }, 403);
  }

  // Check if assignment already exists
  const existing = await c.env.DB.prepare(
    "SELECT id FROM user_field_assignments WHERE user_id = ? AND field_id = ?"
  )
    .bind(userId, body.field_id)
    .first();

  if (existing) {
    return c.json({ error: "Assignment already exists" }, 400);
  }

  await c.env.DB.prepare(
    `INSERT INTO user_field_assignments (user_id, field_id, assigned_by_user_id)
     VALUES (?, ?, ?)`
  )
    .bind(userId, body.field_id, currentUser.id)
    .run();

  return c.json({ success: true });
});

// Remove user field assignment
app.delete("/api/users/:user_id/field-assignments/:assignment_id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const assignmentId = parseInt(c.req.param("assignment_id"));

  // Verify assignment exists and coordinator has access
  const assignment = await c.env.DB.prepare(
    `SELECT ufa.id, f.coordinator_user_id
     FROM user_field_assignments ufa
     JOIN fields f ON ufa.field_id = f.id
     WHERE ufa.id = ?`
  )
    .bind(assignmentId)
    .first<{ id: number; coordinator_user_id: number }>();

  if (!assignment) {
    return c.json({ error: "Assignment not found" }, 404);
  }

  // Coordinators can only remove assignments for their own fields
  if (currentUser.role === "coordinator" && assignment.coordinator_user_id !== currentUser.id) {
    return c.json({ error: "Access denied" }, 403);
  }

  await c.env.DB.prepare(
    "DELETE FROM user_field_assignments WHERE id = ?"
  )
    .bind(assignmentId)
    .run();

  return c.json({ success: true });
});

// Get field usage statistics for current user
app.get("/api/users/field-usage", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role, fields_allowed FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string; fields_allowed: number }>();

  if (!currentUser) {
    return c.json({ error: "User not found" }, 404);
  }

  // Admins have unlimited fields
  if (currentUser.role === "admin") {
    return c.json({
      fields_allowed: -1,
      fields_used: 0,
      fields_remaining: -1,
      active_fields: []
    });
  }

  // Get active field usage (last 24 hours)
  const now = new Date();
  const { results: activeFields } = await c.env.DB.prepare(
    `SELECT DISTINCT field_location, expires_at 
     FROM field_usage 
     WHERE coordinator_user_id = ? AND expires_at > ?
     ORDER BY field_location`
  )
    .bind(currentUser.id, now.toISOString())
    .all();

  const fieldsUsed = (activeFields || []).length;
  const fieldsRemaining = Math.max(0, (currentUser.fields_allowed || 0) - fieldsUsed);

  return c.json({
    fields_allowed: currentUser.fields_allowed || 0,
    fields_used: fieldsUsed,
    fields_remaining: fieldsRemaining,
    active_fields: activeFields
  });
});

// Get completed games
app.get("/api/games/completed", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  // Get sport_account_id from query params
  const sportAccountId = c.req.query("sport_account_id");

  let query = "SELECT * FROM games WHERE status = 'completed'";
  let params: any[] = [];
  
  // Coordinators only see their own games
  if (currentUser.role === "coordinator") {
    query += " AND coordinator_user_id = ?";
    params.push(currentUser.id);
  }
  
  // Filter by sport_account_id if provided
  if (sportAccountId) {
    query += " AND sport_account_id = ?";
    params.push(parseInt(sportAccountId));
  }
  
  query += " ORDER BY updated_at DESC";

  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  return c.json(results);
});

// Referee management endpoints

// List all referees (admin only)
app.get("/api/referees", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  // Get sport_account_id from query params
  const sportAccountId = c.req.query("sport_account_id");

  let query = "SELECT * FROM referees WHERE is_active = 1";
  let params: any[] = [];
  
  // Coordinators only see their own referees
  if (currentUser.role === "coordinator") {
    query += " AND coordinator_user_id = ?";
    params.push(currentUser.id);
  }
  
  // Filter by sport_account_id if provided
  if (sportAccountId) {
    query += " AND sport_account_id = ?";
    params.push(parseInt(sportAccountId));
  }
  
  query += " ORDER BY name ASC";

  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  return c.json(results);
});

// Create referee (admin only)
app.post("/api/referees", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const body = await c.req.json();

  await c.env.DB.prepare(
    "INSERT INTO referees (name, phone_number, email, coordinator_user_id, sport_account_id) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(body.name, body.phone_number, body.email || null, currentUser.role === "coordinator" ? currentUser.id : null, body.sport_account_id || null)
    .run();

  return c.json({ success: true });
});

// Update referee (admin only)
app.patch("/api/referees/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const id = c.req.param("id");
  
  // Coordinators can only update their own referees
  if (currentUser.role === "coordinator") {
    const referee = await c.env.DB.prepare(
      "SELECT coordinator_user_id FROM referees WHERE id = ?"
    )
      .bind(id)
      .first<{ coordinator_user_id: number | null }>();
    
    if (!referee || referee.coordinator_user_id !== currentUser.id) {
      return c.json({ error: "Access denied" }, 403);
    }
  }
  
  const body = await c.req.json();

  await c.env.DB.prepare(
    "UPDATE referees SET name = ?, phone_number = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  )
    .bind(body.name, body.phone_number, body.email || null, id)
    .run();

  return c.json({ success: true });
});

// Delete referee (admin only)
app.delete("/api/referees/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const id = c.req.param("id");
  
  // Coordinators can only delete their own referees
  if (currentUser.role === "coordinator") {
    const referee = await c.env.DB.prepare(
      "SELECT coordinator_user_id FROM referees WHERE id = ?"
    )
      .bind(id)
      .first<{ coordinator_user_id: number | null }>();
    
    if (!referee || referee.coordinator_user_id !== currentUser.id) {
      return c.json({ error: "Access denied" }, 403);
    }
  }

  // Soft delete
  await c.env.DB.prepare(
    "UPDATE referees SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  )
    .bind(id)
    .run();

  return c.json({ success: true });
});

// Field management endpoints

// List all fields for the current user
app.get("/api/fields", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role, fields_allowed FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string; fields_allowed: number | null }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  // Get sport_account_id from query params
  const sportAccountId = c.req.query("sport_account_id");

  // Mark any expired fields before fetching
  await c.env.DB.prepare(
    `UPDATE fields SET 
      status = 'expired', 
      updated_at = CURRENT_TIMESTAMP 
     WHERE coordinator_user_id = ? 
       AND status = 'active' 
       AND expires_at IS NOT NULL 
       AND expires_at < datetime('now')`
  )
    .bind(currentUser.id)
    .run();

  // Get fields with game counts - filter by sport_account_id if provided
  let query = `
    SELECT f.*, 
           b.id as branding_id,
           b.organization_name as branding_org_name,
           b.primary_color as branding_primary_color,
           b.secondary_color as branding_secondary_color,
           b.background_color as branding_background_color,
           b.text_color as branding_text_color,
           b.accent_color as branding_accent_color,
           b.logo_url as branding_logo_url,
           s.id as sponsor_id,
           s.name as sponsor_name,
           s.logo_url as sponsor_logo_url,
           t.id as template_id,
           t.name as template_name,
           t.sport_type as template_sport_type,
           (SELECT COUNT(*) FROM games g WHERE g.field_id = f.id) as game_count
    FROM fields f
    LEFT JOIN branding b ON f.branding_id = b.id
    LEFT JOIN sponsors s ON f.sponsor_id = s.id
    LEFT JOIN scoreboard_templates t ON f.template_id = t.id
    WHERE f.coordinator_user_id = ?
  `;
  
  const params: any[] = [currentUser.id];
  
  if (sportAccountId) {
    query += " AND f.sport_account_id = ?";
    params.push(parseInt(sportAccountId));
  }
  
  query += " ORDER BY f.created_at DESC";
  
  const { results: fields } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  // Calculate fields used (active or expired) for this sport account
  const fieldsUsed = (fields || []).filter((f: any) => f.status === 'active' || f.status === 'expired').length;
  
  // Get fields_allowed from sport account if provided
  let fieldsAllowed = currentUser.role === 'admin' ? 999999 : (currentUser.fields_allowed || 1);
  if (sportAccountId) {
    const sportAccount = await c.env.DB.prepare(
      "SELECT fields_allowed FROM sport_accounts WHERE id = ? AND user_id = ?"
    ).bind(parseInt(sportAccountId), currentUser.id).first<{ fields_allowed: number }>();
    if (sportAccount) {
      fieldsAllowed = sportAccount.fields_allowed || 1;
    }
  }

  return c.json({
    fields: fields || [],
    userInfo: {
      fields_allowed: fieldsAllowed,
      fields_used: fieldsUsed,
      fields_remaining: Math.max(0, fieldsAllowed - fieldsUsed),
    }
  });
});

// Create a new field
app.post("/api/fields", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role, fields_allowed FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string; fields_allowed: number | null }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const body = await c.req.json();
  const { name, location, branding_id, sponsor_id, template_id, sport_account_id } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return c.json({ error: "Field name is required" }, 400);
  }

  // Check field credit limit based on sport account (not for admins)
  if (currentUser.role !== 'admin') {
    let fieldsAllowed = currentUser.fields_allowed || 1;
    
    // If sport_account_id provided, use its fields_allowed
    if (sport_account_id) {
      const sportAccount = await c.env.DB.prepare(
        "SELECT fields_allowed FROM sport_accounts WHERE id = ? AND user_id = ?"
      ).bind(sport_account_id, currentUser.id).first<{ fields_allowed: number }>();
      if (sportAccount) {
        fieldsAllowed = sportAccount.fields_allowed || 1;
      }
    }
    
    // Count existing fields for this sport account
    let countQuery = "SELECT id FROM fields WHERE coordinator_user_id = ? AND (status = 'active' OR status = 'pending')";
    const countParams: any[] = [currentUser.id];
    if (sport_account_id) {
      countQuery += " AND sport_account_id = ?";
      countParams.push(sport_account_id);
    }
    
    const { results: existingFields } = await c.env.DB.prepare(countQuery)
      .bind(...countParams)
      .all();

    if ((existingFields || []).length >= fieldsAllowed) {
      return c.json({ error: "Field credit limit reached. Please purchase more credits." }, 400);
    }
  }

  // Create the field
  const result = await c.env.DB.prepare(
    "INSERT INTO fields (name, location, coordinator_user_id, status, branding_id, sponsor_id, template_id, sport_account_id) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)"
  )
    .bind(name.trim(), location || null, currentUser.id, branding_id || null, sponsor_id || null, template_id || null, sport_account_id || null)
    .run();

  return c.json({ success: true, fieldId: result.meta.last_row_id });
});

// Update field
app.patch("/api/fields/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const fieldId = c.req.param("id");
  const body = await c.req.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return c.json({ error: "Field name is required" }, 400);
  }

  // Check field ownership (coordinators can only edit their own fields)
  const field = await c.env.DB.prepare(
    "SELECT id, coordinator_user_id FROM fields WHERE id = ?"
  )
    .bind(fieldId)
    .first<{ id: number; coordinator_user_id: number }>();

  if (!field) {
    return c.json({ error: "Field not found" }, 404);
  }

  if (currentUser.role === "coordinator" && field.coordinator_user_id !== currentUser.id) {
    return c.json({ error: "You can only edit your own fields" }, 403);
  }

  // Update the field
  await c.env.DB.prepare(
    "UPDATE fields SET name = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(name.trim(), fieldId)
    .run();

  return c.json({ success: true });
});

// Delete field
app.delete("/api/fields/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const fieldId = c.req.param("id");

  // Check field ownership
  const field = await c.env.DB.prepare(
    "SELECT id, coordinator_user_id FROM fields WHERE id = ?"
  )
    .bind(fieldId)
    .first<{ id: number; coordinator_user_id: number }>();

  if (!field) {
    return c.json({ error: "Field not found" }, 404);
  }

  if (currentUser.role === "coordinator" && field.coordinator_user_id !== currentUser.id) {
    return c.json({ error: "You can only delete your own fields" }, 403);
  }

  // Check if field has any games
  const gameCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM games WHERE field_id = ?"
  )
    .bind(fieldId)
    .first<{ count: number }>();

  if (gameCount && gameCount.count > 0) {
    return c.json({ error: "Cannot delete field with scheduled games. Delete or reassign games first." }, 400);
  }

  // Delete the field
  await c.env.DB.prepare("DELETE FROM fields WHERE id = ?")
    .bind(fieldId)
    .run();

  return c.json({ success: true });
});

// Game scheduling endpoints

// Schedule a game (admin only)
app.post("/api/games/schedule", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const body = await c.req.json();
  const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  await c.env.DB.prepare(
    `INSERT INTO games (
      game_code, sport_type, home_team, away_team, 
      home_score, away_score, time_remaining, half,
      home_timeouts, away_timeouts, home_blitzes, away_blitzes,
      is_running, status, scheduled_date, scheduled_time, 
      field_location, assigned_referee_id, created_by_user_id,
      division, clock_mode, clock_direction, branding_id, template_id, field_id, sport_account_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      gameCode,
      body.sport_type || "flag_football",
      body.home_team,
      body.away_team,
      0, // home_score
      0, // away_score
      body.time_remaining || 1200,
      1, // half
      2, // home_timeouts
      2, // away_timeouts
      2, // home_blitzes
      2, // away_blitzes
      0, // is_running
      "scheduled",
      body.scheduled_date || null,
      body.scheduled_time || null,
      body.field_location || null,
      body.assigned_referee_id || null,
      clerkUserId,
      body.division || null,
      body.clock_mode || 'running',
      body.clock_direction || 'down',
      body.branding_id || null,
      body.template_id || null,
      body.field_id || null,
      body.sport_account_id || null
    )
    .run();

  const gameResult = await c.env.DB.prepare(
    "SELECT * FROM games WHERE game_code = ?"
  )
    .bind(gameCode)
    .first();

  if (!gameResult) {
    return c.json({ error: "Failed to create game" }, 500);
  }

  // If referee_ids provided, assign them to the game
  if (body.referee_ids && Array.isArray(body.referee_ids)) {
    for (const refereeId of body.referee_ids) {
      await c.env.DB.prepare(
        "INSERT INTO game_referees (game_id, referee_id) VALUES (?, ?)"
      )
        .bind(gameResult.id, refereeId)
        .run();
    }
  }

  // If sponsor_ids provided, assign them to the game
  if (body.sponsor_ids && Array.isArray(body.sponsor_ids)) {
    for (const sponsorId of body.sponsor_ids) {
      await c.env.DB.prepare(
        "INSERT INTO game_sponsors (game_id, sponsor_id) VALUES (?, ?)"
      )
        .bind(gameResult.id, sponsorId)
        .run();
    }
  }

  // Send usage snapshot to AI Ops (non-blocking)
  try {
    const client = new ScoreLinkToAiOpsClient(c.env);
    
    // Get usage metrics for the user
    const metrics = await c.env.DB.prepare(
      `SELECT 
        COUNT(DISTINCT sport_account_id) as active_leagues,
        COUNT(DISTINCT CASE WHEN status IN ('live', 'active') THEN id END) as active_boards,
        COUNT(DISTINCT CASE WHEN updated_at > datetime('now', '-30 days') THEN id END) as games_last_30d
       FROM games
       WHERE created_by_user_id = ?`
    )
      .bind(clerkUserId)
      .first<any>();
    
    const sportAccount = body.sport_account_id 
      ? await c.env.DB.prepare("SELECT subscription_tier FROM sport_accounts WHERE id = ?")
          .bind(body.sport_account_id)
          .first<any>()
      : null;
    
    await client.sendUsageSnapshot({
      externalCustomerId: clerkUserId,
      snapshotDate: new Date().toISOString().split('T')[0],
      activeLeaguesCount: metrics?.active_leagues || 0,
      activeEventsCount: 0,
      activeBoardsCount: metrics?.active_boards || 0,
      totalSessions: 0,
      premiumFeatureUsageCount: sportAccount?.subscription_tier === 'premium' ? 1 : 0,
      gamesStreamedLast30d: metrics?.games_last_30d || 0,
      multiFieldUsageCount: 0,
      lastActiveAt: new Date().toISOString(),
      usageScore: Math.min(100, (metrics?.games_last_30d || 0) * 5)
    });
  } catch (error) {
    console.error('Failed to send usage snapshot to AI Ops:', error);
  }

  return c.json(gameResult);
});

// Assign referees to a game (admin only)
app.post("/api/games/:id/referees", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const gameId = c.req.param("id");
  
  // Coordinators can only assign referees to their own games
  if (currentUser.role === "coordinator") {
    const game = await c.env.DB.prepare(
      "SELECT created_by_user_id FROM games WHERE id = ?"
    )
      .bind(gameId)
      .first<{ created_by_user_id: string | null }>();
    
    if (!game || game.created_by_user_id !== clerkUserId) {
      return c.json({ error: "Access denied" }, 403);
    }
  }
  const body = await c.req.json();

  // Clear existing assignments
  await c.env.DB.prepare(
    "DELETE FROM game_referees WHERE game_id = ?"
  )
    .bind(gameId)
    .run();

  // Add new assignments
  if (body.referee_ids && Array.isArray(body.referee_ids)) {
    for (const refereeId of body.referee_ids) {
      await c.env.DB.prepare(
        "INSERT INTO game_referees (game_id, referee_id) VALUES (?, ?)"
      )
        .bind(gameId, refereeId)
        .run();
    }
  }

  return c.json({ success: true });
});

// Get referees for a game
app.get("/api/games/:id/referees", async (c) => {
  const gameId = c.req.param("id");
  
  const referees = await c.env.DB.prepare(
    `SELECT r.id, r.name, r.phone_number FROM referees r
     JOIN game_referees gr ON r.id = gr.referee_id
     WHERE gr.game_id = ?`
  )
    .bind(gameId)
    .all();

  return c.json(referees.results || []);
});

// Edit/update a scheduled game (admin and coordinator only)
app.patch("/api/games/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const gameId = c.req.param("id");
  
  // Coordinators can only edit games in their sport accounts (admins can edit any)
  if (currentUser.role === "coordinator") {
    const game = await c.env.DB.prepare(
      `SELECT g.sport_account_id 
       FROM games g
       WHERE g.id = ?`
    )
      .bind(gameId)
      .first<{ sport_account_id: number | null }>();
    
    if (!game) {
      return c.json({ error: "Game not found" }, 404);
    }

    // Verify the game belongs to one of the coordinator's sport accounts
    const hasAccess = await c.env.DB.prepare(
      `SELECT id FROM sport_accounts 
       WHERE id = ? AND coordinator_user_id = ?`
    )
      .bind(game.sport_account_id, currentUser.id)
      .first();

    if (!hasAccess) {
      return c.json({ error: "Access denied" }, 403);
    }
  }
  // Admins have full access to all games

  const body = await c.req.json();
  
  // Update game fields
  await c.env.DB.prepare(
    `UPDATE games SET 
      home_team = ?,
      away_team = ?,
      scheduled_date = ?,
      scheduled_time = ?,
      field_location = ?,
      field_id = ?,
      division = ?,
      clock_mode = ?,
      clock_direction = ?,
      branding_id = ?,
      template_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`
  )
    .bind(
      body.home_team,
      body.away_team,
      body.scheduled_date || null,
      body.scheduled_time || null,
      body.field_location || null,
      body.field_id || null,
      body.division || null,
      body.clock_mode || 'running',
      body.clock_direction || 'down',
      body.branding_id || null,
      body.template_id || null,
      gameId
    )
    .run();

  // Update referee assignments if provided
  if (body.referee_ids && Array.isArray(body.referee_ids)) {
    // Clear existing assignments
    await c.env.DB.prepare(
      "DELETE FROM game_referees WHERE game_id = ?"
    )
      .bind(gameId)
      .run();

    // Add new assignments
    for (const refereeId of body.referee_ids) {
      await c.env.DB.prepare(
        "INSERT INTO game_referees (game_id, referee_id) VALUES (?, ?)"
      )
        .bind(gameId, refereeId)
        .run();
    }
  }

  // Update sponsor assignments if provided
  if (body.sponsor_ids !== undefined && Array.isArray(body.sponsor_ids)) {
    // Clear existing sponsors
    await c.env.DB.prepare(
      "DELETE FROM game_sponsors WHERE game_id = ?"
    )
      .bind(gameId)
      .run();

    // Add new sponsors
    for (const sponsorId of body.sponsor_ids) {
      await c.env.DB.prepare(
        "INSERT INTO game_sponsors (game_id, sponsor_id) VALUES (?, ?)"
      )
        .bind(gameId, sponsorId)
        .run();
    }
  }

  const updatedGame = await c.env.DB.prepare(
    "SELECT * FROM games WHERE id = ?"
  )
    .bind(gameId)
    .first();

  return c.json(updatedGame);
});

// Delete a game (admin and coordinator only)
app.delete("/api/games/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const gameId = c.req.param("id");
  
  // Coordinators can only delete games in their sport accounts (admins can delete any)
  if (currentUser.role === "coordinator") {
    const game = await c.env.DB.prepare(
      `SELECT g.sport_account_id 
       FROM games g
       WHERE g.id = ?`
    )
      .bind(gameId)
      .first<{ sport_account_id: number | null }>();
    
    if (!game) {
      return c.json({ error: "Game not found" }, 404);
    }

    // Verify the game belongs to one of the coordinator's sport accounts
    const hasAccess = await c.env.DB.prepare(
      `SELECT id FROM sport_accounts 
       WHERE id = ? AND coordinator_user_id = ?`
    )
      .bind(game.sport_account_id, currentUser.id)
      .first();

    if (!hasAccess) {
      return c.json({ error: "Access denied" }, 403);
    }
  }
  // Admins have full access to all games

  // Delete related records first
  await c.env.DB.prepare(
    "DELETE FROM game_referees WHERE game_id = ?"
  )
    .bind(gameId)
    .run();

  await c.env.DB.prepare(
    "DELETE FROM game_sponsors WHERE game_id = ?"
  )
    .bind(gameId)
    .run();

  // Delete the game
  await c.env.DB.prepare(
    "DELETE FROM games WHERE id = ?"
  )
    .bind(gameId)
    .run();

  return c.json({ success: true });
});

// Quick game transition endpoint
app.post("/api/games/:code/transition", async (c) => {
  const code = c.req.param("code");
  
  // Get current game
  const currentGame = await c.env.DB.prepare(
    "SELECT * FROM games WHERE game_code = ?"
  )
    .bind(code)
    .first<Game>();

  if (!currentGame) {
    return c.json({ error: "Game not found" }, 404);
  }

  // Mark current game as completed
  await c.env.DB.prepare(
    "UPDATE games SET status = 'completed', is_running = 0, updated_at = CURRENT_TIMESTAMP WHERE game_code = ?"
  )
    .bind(code)
    .run();

  // Look for next scheduled game on same field or assigned to same referee
  let nextGame = null;
  
  if (currentGame.field_location || currentGame.assigned_referee_id) {
    const whereConditions = [];
    const bindings = [];
    
    if (currentGame.field_location) {
      whereConditions.push("field_location = ?");
      bindings.push(currentGame.field_location);
    }
    
    if (currentGame.assigned_referee_id) {
      whereConditions.push("assigned_referee_id = ?");
      bindings.push(currentGame.assigned_referee_id);
    }
    
    const whereClause = whereConditions.join(" OR ");
    
    nextGame = await c.env.DB.prepare(
      `SELECT * FROM games 
       WHERE (${whereClause}) 
       AND status = 'scheduled' 
       AND id != ?
       ORDER BY scheduled_date ASC, scheduled_time ASC, created_at ASC 
       LIMIT 1`
    )
      .bind(...bindings, currentGame.id)
      .first<Game>();
  }

  // If we found a scheduled game, activate it with fresh state
  if (nextGame) {
    await c.env.DB.prepare(
      `UPDATE games SET 
        status = 'active',
        home_score = 0,
        away_score = 0,
        time_remaining = ?,
        half = 1,
        home_timeouts = 2,
        away_timeouts = 2,
        home_blitzes = 0,
        away_blitzes = 0,
        is_running = 0,
        inning = 1,
        balls = 0,
        strikes = 0,
        outs = 0,
        pitch_count = 0,
        home_fouls = 0,
        away_fouls = 0,
        bonus_situation = NULL,
        down = 1,
        yards_to_go = 10,
        ball_on = 20,
        home_penalties = 0,
        away_penalties = 0,
        penalty_time_remaining = 0,
        period = 1,
        home_shots_on_goal = 0,
        away_shots_on_goal = 0,
        home_games_won = 0,
        away_games_won = 0,
        home_sets_won = 0,
        away_sets_won = 0,
        current_server = NULL,
        updated_at = CURRENT_TIMESTAMP
       WHERE game_code = ?`
    )
      .bind(nextGame.time_remaining || 1200, nextGame.game_code)
      .run();

    // Activate field if this is the first game going live on it
    if (nextGame.field_id) {
      await c.env.DB.prepare(
        `UPDATE fields SET 
          status = 'active', 
          activated_at = CURRENT_TIMESTAMP,
          expires_at = datetime('now', '+24 hours'),
          updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND status = 'pending'`
      )
        .bind(nextGame.field_id)
        .run();
    }

    const refreshedGame = await c.env.DB.prepare(
      "SELECT * FROM games WHERE game_code = ?"
    )
      .bind(nextGame.game_code)
      .first<Game>();

    return c.json({ 
      success: true, 
      nextGame: refreshedGame,
      transitionType: 'scheduled'
    });
  }

  // No scheduled game found - create a new blank game
  const newGameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  await c.env.DB.prepare(
    `INSERT INTO games (
      game_code, sport_type, home_team, away_team, 
      home_score, away_score, time_remaining, half,
      home_timeouts, away_timeouts, home_blitzes, away_blitzes,
      is_running, status, field_location, assigned_referee_id,
      created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      newGameCode,
      currentGame.sport_type,
      "Home Team",
      "Away Team",
      0, // home_score
      0, // away_score
      1200, // time_remaining (20 minutes)
      1, // half
      2, // home_timeouts
      2, // away_timeouts
      2, // home_blitzes
      2, // away_blitzes
      0, // is_running
      "active",
      currentGame.field_location || null,
      currentGame.assigned_referee_id || null,
      currentGame.created_by_user_id || null
    )
    .run();

  const newGame = await c.env.DB.prepare(
    "SELECT * FROM games WHERE game_code = ?"
  )
    .bind(newGameCode)
    .first<Game>();

  return c.json({ 
    success: true, 
    nextGame: newGame,
    transitionType: 'new'
  });
});

// Sponsor management endpoints

// List all sponsors (admin only)
app.get("/api/sponsors", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  // Get sport_account_id from query params
  const sportAccountId = c.req.query("sport_account_id");

  let query = "SELECT * FROM sponsors WHERE is_active = 1";
  let params: any[] = [];
  
  // Coordinators only see their own sponsors
  if (currentUser.role === "coordinator") {
    query += " AND coordinator_user_id = ?";
    params.push(currentUser.id);
  }
  
  // Filter by sport_account_id if provided
  if (sportAccountId) {
    query += " AND sport_account_id = ?";
    params.push(parseInt(sportAccountId));
  }
  
  query += " ORDER BY name ASC";

  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  return c.json(results);
});

// Serve files from R2
app.get("/api/files/*", async (c) => {
  // Extract the full path after /api/files/
  const fullPath = c.req.path;
  const key = fullPath.replace('/api/files/', '');
  
  if (!key) {
    return c.json({ error: "No file key provided" }, 400);
  }

  try {
    if (!c.env.R2_BUCKET) {
      console.error("R2_BUCKET not available");
      return c.json({ error: "File storage not available in preview" }, 503);
    }

    const object = await c.env.R2_BUCKET.get(key);
    
    if (!object) {
      return c.json({ error: "File not found" }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000");

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("R2 get error:", error);
    return c.json({ error: "Failed to retrieve file" }, 500);
  }
});

// Upload sponsor logo
app.post("/api/sponsors/upload-logo", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const formData = await c.req.formData();
  const file = formData.get("logo") as File;

  if (!file) {
    return c.json({ error: "No file uploaded" }, 400);
  }

  try {
    // Check if R2 is available
    if (!c.env.R2_BUCKET) {
      console.error("R2_BUCKET not available - file storage requires published app");
      return c.json({ 
        error: "File storage not available in preview. Please publish your app to use sponsor logos.",
        logoUrl: null 
      }, 503);
    }

    // Generate unique key for the logo
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `sponsors/${currentUser.id}/${timestamp}-${sanitizedFilename}`;

    console.log("Uploading to R2:", key, "Size:", file.size, "Type:", file.type);

    // Upload to R2
    const result = await c.env.R2_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    console.log("Upload successful:", result?.key);

    // Return the URL
    const logoUrl = `/api/files/${key}`;
    return c.json({ logoUrl });
  } catch (error) {
    console.error("R2 upload error:", error);
    return c.json({ 
      error: "Failed to upload file. File storage works in published apps.",
      logoUrl: null 
    }, 500);
  }
});

// Create sponsor (admin only)
app.post("/api/sponsors", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const body = await c.req.json();

  // Ensure website URL has https:// prefix
  let websiteUrl = body.website_url || null;
  if (websiteUrl && !websiteUrl.startsWith("http://") && !websiteUrl.startsWith("https://")) {
    websiteUrl = "https://" + websiteUrl;
  }

  await c.env.DB.prepare(
    "INSERT INTO sponsors (name, logo_url, website_url, additional_text, coordinator_user_id, sport_account_id) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(body.name, body.logo_url || null, websiteUrl, body.additional_text || null, currentUser.role === "coordinator" ? currentUser.id : null, body.sport_account_id || null)
    .run();

  return c.json({ success: true });
});

// Update sponsor (admin only)
app.patch("/api/sponsors/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const id = c.req.param("id");
  
  // Coordinators can only update their own sponsors (admins can edit any)
  if (currentUser.role === "coordinator") {
    const sponsor = await c.env.DB.prepare(
      "SELECT coordinator_user_id FROM sponsors WHERE id = ?"
    )
      .bind(id)
      .first<{ coordinator_user_id: number | null }>();
    
    if (!sponsor || sponsor.coordinator_user_id !== currentUser.id) {
      return c.json({ error: "Access denied" }, 403);
    }
  }
  // Admins have full access to all sponsors
  
  const body = await c.req.json();

  // Ensure website URL has https:// prefix
  let websiteUrl = body.website_url || null;
  if (websiteUrl && !websiteUrl.startsWith("http://") && !websiteUrl.startsWith("https://")) {
    websiteUrl = "https://" + websiteUrl;
  }

  await c.env.DB.prepare(
    "UPDATE sponsors SET name = ?, logo_url = ?, website_url = ?, additional_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  )
    .bind(body.name, body.logo_url || null, websiteUrl, body.additional_text || null, id)
    .run();

  return c.json({ success: true });
});

// Delete sponsor (admin only)
app.delete("/api/sponsors/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const id = c.req.param("id");
  
  // Coordinators can only delete their own sponsors (admins can delete any)
  if (currentUser.role === "coordinator") {
    const sponsor = await c.env.DB.prepare(
      "SELECT coordinator_user_id FROM sponsors WHERE id = ?"
    )
      .bind(id)
      .first<{ coordinator_user_id: number | null }>();
    
    if (!sponsor || sponsor.coordinator_user_id !== currentUser.id) {
      return c.json({ error: "Access denied" }, 403);
    }
  }
  // Admins have full access to all sponsors

  await c.env.DB.prepare(
    "UPDATE sponsors SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  )
    .bind(id)
    .run();

  return c.json({ success: true });
});

// Assign sponsor to game (admin only)
app.post("/api/games/:gameId/sponsors/:sponsorId", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const gameId = c.req.param("gameId");
  const sponsorId = c.req.param("sponsorId");

  await c.env.DB.prepare(
    "INSERT INTO game_sponsors (game_id, sponsor_id) VALUES (?, ?)"
  )
    .bind(gameId, sponsorId)
    .run();

  return c.json({ success: true });
});

// Get sponsors for a game (public)
app.get("/api/games/:code/sponsors", async (c) => {
  const code = c.req.param("code");
  
  const game = await c.env.DB.prepare(
    "SELECT id FROM games WHERE game_code = ?"
  )
    .bind(code)
    .first<{ id: number }>();

  if (!game) {
    return c.json({ error: "Game not found" }, 404);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT s.* FROM sponsors s
     INNER JOIN game_sponsors gs ON s.id = gs.sponsor_id
     WHERE gs.game_id = ? AND s.is_active = 1
     ORDER BY gs.display_order, s.name`
  )
    .bind(game.id)
    .all();

  return c.json(results);
});

// Send SMS link to referee (admin only)
app.post("/api/games/:id/send-referee-link", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const gameId = c.req.param("id");

  const game = await c.env.DB.prepare(
    "SELECT * FROM games WHERE id = ?"
  )
    .bind(gameId)
    .first<Game & { assigned_referee_id: number }>();

  if (!game) {
    return c.json({ error: "Game not found" }, 404);
  }

  if (!game.assigned_referee_id) {
    return c.json({ error: "No referee assigned to this game" }, 400);
  }

  const referee = await c.env.DB.prepare(
    "SELECT * FROM referees WHERE id = ?"
  )
    .bind(game.assigned_referee_id)
    .first<{ name: string; phone_number: string }>();

  if (!referee) {
    return c.json({ error: "Referee not found" }, 404);
  }

  // Send SMS via Twilio
  const refereeLink = `${c.req.url.split('/api')[0]}/referee/${game.game_code}`;
  
  try {
    const twilioClient = twilio(
      c.env.TWILIO_ACCOUNT_SID,
      c.env.TWILIO_AUTH_TOKEN
    );

    await twilioClient.messages.create({
      body: `Hi ${referee.name}, you've been assigned to referee ${game.home_team} vs ${game.away_team}. Access your control panel here: ${refereeLink}`,
      from: c.env.TWILIO_PHONE_NUMBER,
      to: referee.phone_number,
    });

    return c.json({ 
      success: true, 
      message: "SMS sent successfully",
      link: refereeLink,
      referee: referee.name,
      phone: referee.phone_number
    });
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return c.json({ 
      error: "Failed to send SMS",
      details: error instanceof Error ? error.message : "Unknown error",
      link: refereeLink
    }, 500);
  }
});

// Template management endpoints

// Get all templates
app.get("/api/templates", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM scoreboard_templates WHERE is_active = 1 ORDER BY name"
  ).all();

  return c.json(results);
});

// Create template (admin only)
app.post("/api/templates", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const body = await c.req.json();

  const result = await c.env.DB.prepare(
    `INSERT INTO scoreboard_templates (
      name, sport_type, description, default_time, time_format,
      has_halves, has_quarters, has_periods, period_count, period_label,
      has_timeouts, timeouts_per_period, has_blitzes, blitzes_per_period,
      has_fouls, fouls_limit, has_possession
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      body.name,
      body.sport_type,
      body.description || null,
      body.default_time,
      body.time_format || 'mm:ss',
      body.has_halves ? 1 : 0,
      body.has_quarters ? 1 : 0,
      body.has_periods ? 1 : 0,
      body.period_count,
      body.period_label,
      body.has_timeouts ? 1 : 0,
      body.timeouts_per_period,
      body.has_blitzes ? 1 : 0,
      body.blitzes_per_period,
      body.has_fouls ? 1 : 0,
      body.fouls_limit,
      body.has_possession ? 1 : 0
    )
    .run();

  const template = await c.env.DB.prepare(
    "SELECT * FROM scoreboard_templates WHERE id = ?"
  )
    .bind(result.meta.last_row_id)
    .first<ScoreboardTemplate>();

  return c.json(template);
});

// Update template (admin only)
app.put("/api/templates/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const templateId = c.req.param("id");
  const body = await c.req.json();

  await c.env.DB.prepare(
    `UPDATE scoreboard_templates SET
      name = ?, sport_type = ?, description = ?, default_time = ?, time_format = ?,
      has_halves = ?, has_quarters = ?, has_periods = ?, period_count = ?, period_label = ?,
      has_timeouts = ?, timeouts_per_period = ?, has_blitzes = ?, blitzes_per_period = ?,
      has_fouls = ?, fouls_limit = ?, has_possession = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`
  )
    .bind(
      body.name,
      body.sport_type,
      body.description || null,
      body.default_time,
      body.time_format || 'mm:ss',
      body.has_halves ? 1 : 0,
      body.has_quarters ? 1 : 0,
      body.has_periods ? 1 : 0,
      body.period_count,
      body.period_label,
      body.has_timeouts ? 1 : 0,
      body.timeouts_per_period,
      body.has_blitzes ? 1 : 0,
      body.blitzes_per_period,
      body.has_fouls ? 1 : 0,
      body.fouls_limit,
      body.has_possession ? 1 : 0,
      templateId
    )
    .run();

  const template = await c.env.DB.prepare(
    "SELECT * FROM scoreboard_templates WHERE id = ?"
  )
    .bind(templateId)
    .first<ScoreboardTemplate>();

  return c.json(template);
});

// Delete template (admin only)
app.delete("/api/templates/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const templateId = c.req.param("id");

  // Soft delete by setting is_active to 0
  await c.env.DB.prepare(
    "UPDATE scoreboard_templates SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  )
    .bind(templateId)
    .run();

  return c.json({ success: true });
});

// Update template (admin only)
app.patch("/api/templates/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const templateId = c.req.param("id");
  const body = await c.req.json();

  await c.env.DB.prepare(
    `UPDATE scoreboard_templates SET 
      name = ?, sport_type = ?, description = ?, default_time = ?, time_format = ?,
      has_halves = ?, has_quarters = ?, has_periods = ?, period_count = ?, period_label = ?,
      has_timeouts = ?, timeouts_per_period = ?, has_blitzes = ?, blitzes_per_period = ?,
      has_fouls = ?, fouls_limit = ?, has_possession = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`
  )
    .bind(
      body.name,
      body.sport_type,
      body.description || null,
      body.default_time,
      body.time_format || 'mm:ss',
      body.has_halves ? 1 : 0,
      body.has_quarters ? 1 : 0,
      body.has_periods ? 1 : 0,
      body.period_count,
      body.period_label,
      body.has_timeouts ? 1 : 0,
      body.timeouts_per_period,
      body.has_blitzes ? 1 : 0,
      body.blitzes_per_period,
      body.has_fouls ? 1 : 0,
      body.fouls_limit,
      body.has_possession ? 1 : 0,
      templateId
    )
    .run();

  return c.json({ success: true });
});

// Branding management endpoints

// Upload branding logo
app.post("/api/brandings/upload-logo", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const formData = await c.req.formData();
  const file = formData.get("logo") as File;

  if (!file) {
    return c.json({ error: "No file uploaded" }, 400);
  }

  try {
    // Check if R2 is available
    if (!c.env.R2_BUCKET) {
      console.error("R2_BUCKET not available - file storage requires published app");
      return c.json({ 
        error: "File storage not available in preview. Please publish your app to use branding logos.",
        logoUrl: null 
      }, 400);
    }

    // Generate unique key for the logo
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `brandings/${currentUser.id}/${timestamp}-${sanitizedFilename}`;

    console.log("Uploading branding logo to R2:", key, "Size:", file.size, "Type:", file.type);

    // Upload to R2
    const result = await c.env.R2_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    console.log("Upload successful:", result?.key);

    // Return the URL using /api/files/ prefix
    const logoUrl = `/api/files/${key}`;
    return c.json({ logoUrl });
  } catch (error) {
    console.error("Failed to upload branding logo:", error);
    return c.json({ 
      error: "Failed to upload file. File storage works in published apps.",
      logoUrl: null 
    }, 500);
  }
});

// Get all brandings
app.get("/api/brandings", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  // Get sport_account_id from query params
  const sportAccountId = c.req.query("sport_account_id");

  let query = "SELECT * FROM branding WHERE is_active = 1";
  let params: any[] = [];
  
  // Coordinators only see their own branding
  if (currentUser.role === "coordinator") {
    query += " AND coordinator_user_id = ?";
    params.push(currentUser.id);
  }
  
  // Filter by sport_account_id if provided
  if (sportAccountId) {
    query += " AND sport_account_id = ?";
    params.push(parseInt(sportAccountId));
  }
  
  query += " ORDER BY organization_name";

  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  return c.json(results);
});

// Get branding by ID (public - needed for scoreboard display)
app.get("/api/brandings/:id", async (c) => {
  const brandingId = c.req.param("id");

  const branding = await c.env.DB.prepare(
    "SELECT * FROM branding WHERE id = ? AND is_active = 1"
  )
    .bind(brandingId)
    .first<Branding>();

  if (!branding) {
    return c.json({ error: "Branding not found" }, 404);
  }

  return c.json(branding);
});

// Create branding (admin only)
app.post("/api/brandings", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const body = await c.req.json();

  const result = await c.env.DB.prepare(
    `INSERT INTO branding (
      organization_name, logo_url, primary_color, secondary_color,
      background_color, text_color, accent_color, created_by_user_id, coordinator_user_id, sport_account_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      body.organization_name,
      body.logo_url || null,
      body.primary_color || '#f59e0b',
      body.secondary_color || '#0ea5e9',
      body.background_color || '#0f172a',
      body.text_color || '#ffffff',
      body.accent_color || '#fbbf24',
      clerkUserId,
      currentUser.role === "coordinator" ? currentUser.id : null,
      body.sport_account_id || null
    )
    .run();

  const branding = await c.env.DB.prepare(
    "SELECT * FROM branding WHERE id = ?"
  )
    .bind(result.meta.last_row_id)
    .first<Branding>();

  return c.json(branding);
});

// Business Analytics Endpoints (Admin only)

// Get customer list with subscription and activity data
// Admin customer management endpoints
app.get("/api/admin/customers", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  // Get all coordinators with their game counts
  const customers = await c.env.DB.prepare(
    `SELECT 
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.phone_number,
      u.organization_name,
      u.subscription_tier,
      u.subscription_start_date,
      u.subscription_end_date,
      u.fields_allowed,
      u.street_1,
      u.street_2,
      u.city,
      u.state_province,
      u.country,
      u.zip_code,
      u.created_at,
      COUNT(DISTINCT CASE WHEN g.status = 'active' THEN g.id END) as active_games,
      COUNT(DISTINCT CASE WHEN g.status = 'scheduled' THEN g.id END) as scheduled_games,
      COUNT(DISTINCT CASE WHEN g.status = 'completed' THEN g.id END) as completed_games,
      COUNT(DISTINCT r.id) as total_referees,
      COUNT(DISTINCT s.id) as total_sponsors
    FROM users u
    LEFT JOIN games g ON u.id = g.coordinator_user_id
    LEFT JOIN referees r ON u.id = r.coordinator_user_id
    LEFT JOIN sponsors s ON u.id = s.coordinator_user_id
    WHERE u.role = 'coordinator'
    GROUP BY u.id
    ORDER BY u.created_at DESC`
  ).all();

  // Get sport accounts for each customer
  const customersWithAccounts = await Promise.all(
    customers.results.map(async (customer: any) => {
      const sportAccounts = await c.env.DB.prepare(
        "SELECT * FROM sport_accounts WHERE user_id = ? ORDER BY created_at DESC"
      )
        .bind(customer.id)
        .all();
      
      return {
        ...customer,
        sport_accounts: sportAccounts.results
      };
    })
  );

  return c.json(customersWithAccounts);
});

app.post("/api/admin/customers", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const body = await c.req.json();
  
  // Validate required fields
  if (!body.email || !body.sport_type) {
    return c.json({ error: "Email and sport type are required" }, 400);
  }

  // Check if user already exists
  const existingUser = await c.env.DB.prepare(
    "SELECT id FROM users WHERE email = ?"
  )
    .bind(body.email)
    .first();

  if (existingUser) {
    return c.json({ error: "User with this email already exists" }, 400);
  }

  // Create user account
  const userResult = await c.env.DB.prepare(
    `INSERT INTO users (
      email, first_name, last_name, phone_number, organization_name,
      street_1, street_2, city, state_province, country, zip_code,
      role, subscription_tier, fields_allowed, is_onboarded,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'coordinator', ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
    .bind(
      body.email,
      body.first_name || null,
      body.last_name || null,
      body.phone_number || null,
      body.organization_name || null,
      body.street_1 || null,
      body.street_2 || null,
      body.city || null,
      body.state_province || null,
      body.country || null,
      body.zip_code || null,
      body.subscription_tier || 'free',
      body.fields_allowed || 1
    )
    .run();

  const userId = userResult.meta.last_row_id;

  // Create sport account
  await c.env.DB.prepare(
    `INSERT INTO sport_accounts (
      user_id, sport_type, organization_name, subscription_tier,
      fields_allowed, billing_period, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
    .bind(
      userId,
      body.sport_type,
      body.organization_name || null,
      body.subscription_tier || 'free',
      body.fields_allowed || 1,
      body.billing_period || 'monthly'
    )
    .run();

  return c.json({ success: true, userId });
});

app.patch("/api/admin/customers/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const customerId = c.req.param("id");
  const body = await c.req.json();

  // Update user
  await c.env.DB.prepare(
    `UPDATE users SET
      first_name = ?, last_name = ?, phone_number = ?, organization_name = ?,
      street_1 = ?, street_2 = ?, city = ?, state_province = ?, country = ?, zip_code = ?,
      subscription_tier = ?, fields_allowed = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`
  )
    .bind(
      body.first_name || null,
      body.last_name || null,
      body.phone_number || null,
      body.organization_name || null,
      body.street_1 || null,
      body.street_2 || null,
      body.city || null,
      body.state_province || null,
      body.country || null,
      body.zip_code || null,
      body.subscription_tier || 'free',
      body.fields_allowed || 1,
      customerId
    )
    .run();

  // Update sport accounts if provided
  if (body.sport_type || body.billing_period) {
    await c.env.DB.prepare(
      `UPDATE sport_accounts SET
        subscription_tier = ?, fields_allowed = ?, billing_period = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?`
    )
      .bind(
        body.subscription_tier || 'free',
        body.fields_allowed || 1,
        body.billing_period || 'monthly',
        customerId
      )
      .run();
  }

  return c.json({ success: true });
});

app.delete("/api/admin/customers/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const customerId = c.req.param("id");

  // Get sport account IDs for this user
  const sportAccounts = await c.env.DB.prepare(
    "SELECT id FROM sport_accounts WHERE user_id = ?"
  )
    .bind(customerId)
    .all();

  // Delete related data for each sport account
  for (const account of sportAccounts.results as any[]) {
    await c.env.DB.prepare("DELETE FROM games WHERE sport_account_id = ?").bind(account.id).run();
    await c.env.DB.prepare("DELETE FROM fields WHERE sport_account_id = ?").bind(account.id).run();
    await c.env.DB.prepare("DELETE FROM referees WHERE sport_account_id = ?").bind(account.id).run();
    await c.env.DB.prepare("DELETE FROM sponsors WHERE sport_account_id = ?").bind(account.id).run();
    await c.env.DB.prepare("DELETE FROM branding WHERE sport_account_id = ?").bind(account.id).run();
    await c.env.DB.prepare("DELETE FROM scoreboard_templates WHERE sport_account_id = ?").bind(account.id).run();
    await c.env.DB.prepare("DELETE FROM field_usage WHERE sport_account_id = ?").bind(account.id).run();
  }

  // Delete sport accounts
  await c.env.DB.prepare("DELETE FROM sport_accounts WHERE user_id = ?").bind(customerId).run();

  // Delete user
  await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(customerId).run();

  return c.json({ success: true });
});

// Legacy analytics endpoint (kept for backwards compatibility)
app.get("/api/analytics/customers", clerkAuthMiddleware, async (c) => {
  // Redirect to new endpoint
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  // Get all coordinators with their game counts (basic version)
  const customers = await c.env.DB.prepare(
    `SELECT 
      u.id,
      u.email,
      u.organization_name,
      u.subscription_tier,
      u.subscription_start_date,
      u.subscription_end_date,
      u.fields_allowed,
      u.created_at,
      COUNT(DISTINCT CASE WHEN g.status = 'active' THEN g.id END) as active_games,
      COUNT(DISTINCT CASE WHEN g.status = 'scheduled' THEN g.id END) as scheduled_games,
      COUNT(DISTINCT CASE WHEN g.status = 'completed' THEN g.id END) as completed_games,
      COUNT(DISTINCT r.id) as total_referees,
      COUNT(DISTINCT s.id) as total_sponsors
    FROM users u
    LEFT JOIN games g ON u.id = g.coordinator_user_id
    LEFT JOIN referees r ON u.id = r.coordinator_user_id
    LEFT JOIN sponsors s ON u.id = s.coordinator_user_id
    WHERE u.role = 'coordinator'
    GROUP BY u.id
    ORDER BY u.created_at DESC`
  ).all();

  return c.json(customers.results);
});

// Get financial analytics
app.get("/api/analytics/financials", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const tierPricing = {
    basic: 20,
    standard: 30,
    premium: 50
  };

  // Get subscription breakdown
  const subscriptions = await c.env.DB.prepare(
    `SELECT 
      subscription_tier,
      COUNT(*) as count,
      SUM(fields_allowed) as total_fields
    FROM users 
    WHERE role = 'coordinator' AND subscription_tier IS NOT NULL
    GROUP BY subscription_tier`
  ).all();

  // Calculate revenue based on tier pricing
  let totalRevenue = 0;
  const revenueByTier = subscriptions.results.map((sub: any) => {
    const pricing = tierPricing[sub.subscription_tier as keyof typeof tierPricing] || 0;
    const revenue = sub.total_fields * pricing;
    totalRevenue += revenue;
    return {
      tier: sub.subscription_tier,
      customers: sub.count,
      fields: sub.total_fields,
      revenue: revenue
    };
  });

  // Get monthly revenue trend (simulated from creation dates)
  const monthlyData = await c.env.DB.prepare(
    `SELECT 
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as new_customers,
      SUM(fields_allowed) as fields
    FROM users 
    WHERE role = 'coordinator'
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12`
  ).all();

  return c.json({
    totalRevenue,
    revenueByTier,
    monthlyData: monthlyData.results,
    totalCustomers: subscriptions.results.reduce((sum: number, s: any) => sum + s.count, 0)
  });
});

// Get usage statistics
app.get("/api/analytics/statistics", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ role: string }>();

  if (!currentUser || currentUser.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  // Games by sport type
  const gamesBySport = await c.env.DB.prepare(
    `SELECT 
      sport_type,
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
      COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
    FROM games
    GROUP BY sport_type
    ORDER BY total DESC`
  ).all();

  // Subscriptions by tier
  const subscriptionsByTier = await c.env.DB.prepare(
    `SELECT 
      subscription_tier,
      COUNT(*) as count
    FROM users 
    WHERE role = 'coordinator' AND subscription_tier IS NOT NULL
    GROUP BY subscription_tier`
  ).all();

  // Total statistics
  const totals = await c.env.DB.prepare(
    `SELECT 
      (SELECT COUNT(*) FROM users WHERE role = 'coordinator') as total_coordinators,
      (SELECT COUNT(*) FROM users WHERE role = 'referee') as total_referees,
      (SELECT COUNT(*) FROM games) as total_games,
      (SELECT COUNT(*) FROM sponsors WHERE is_active = 1) as total_sponsors,
      (SELECT SUM(fields_allowed) FROM users WHERE role = 'coordinator') as total_fields
    `
  ).first();

  // Active usage last 30 days
  const recentActivity = await c.env.DB.prepare(
    `SELECT 
      DATE(created_at) as date,
      COUNT(*) as games_created
    FROM games
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY DATE(created_at)
    ORDER BY date DESC`
  ).all();

  return c.json({
    gamesBySport: gamesBySport.results,
    subscriptionsByTier: subscriptionsByTier.results,
    totals,
    recentActivity: recentActivity.results
  });
});

// Update branding (admin only)
app.put("/api/brandings/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const brandingId = c.req.param("id");
  
  // Coordinators can only update their own branding
  if (currentUser.role === "coordinator") {
    const branding = await c.env.DB.prepare(
      "SELECT coordinator_user_id FROM branding WHERE id = ?"
    )
      .bind(brandingId)
      .first<{ coordinator_user_id: number | null }>();
    
    if (!branding || branding.coordinator_user_id !== currentUser.id) {
      return c.json({ error: "Access denied" }, 403);
    }
  }
  
  const body = await c.req.json();

  await c.env.DB.prepare(
    `UPDATE branding SET
      organization_name = ?, logo_url = ?, primary_color = ?, secondary_color = ?,
      background_color = ?, text_color = ?, accent_color = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`
  )
    .bind(
      body.organization_name,
      body.logo_url || null,
      body.primary_color,
      body.secondary_color,
      body.background_color,
      body.text_color,
      body.accent_color,
      brandingId
    )
    .run();

  const branding = await c.env.DB.prepare(
    "SELECT * FROM branding WHERE id = ?"
  )
    .bind(brandingId)
    .first<Branding>();

  return c.json(branding);
});

// Update branding
app.patch("/api/brandings/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const brandingId = c.req.param("id");
  
  // Coordinators can only update their own branding (admins can edit any)
  if (currentUser.role === "coordinator") {
    const branding = await c.env.DB.prepare(
      "SELECT coordinator_user_id FROM branding WHERE id = ?"
    )
      .bind(brandingId)
      .first<{ coordinator_user_id: number | null }>();
    
    if (!branding || branding.coordinator_user_id !== currentUser.id) {
      return c.json({ error: "Access denied" }, 403);
    }
  }
  // Admins have full access to all branding

  const body = await c.req.json();

  await c.env.DB.prepare(
    `UPDATE branding SET 
      organization_name = ?,
      logo_url = ?,
      primary_color = ?,
      secondary_color = ?,
      background_color = ?,
      text_color = ?,
      accent_color = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`
  )
    .bind(
      body.organization_name,
      body.logo_url || null,
      body.primary_color,
      body.secondary_color,
      body.background_color,
      body.text_color,
      body.accent_color,
      brandingId
    )
    .run();

  return c.json({ success: true });
});

// Delete branding (admin only)
app.delete("/api/brandings/:id", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string }>();

  if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) {
    return c.json({ error: "Access denied" }, 403);
  }

  const brandingId = c.req.param("id");
  
  // Coordinators can only delete their own branding (admins can delete any)
  if (currentUser.role === "coordinator") {
    const branding = await c.env.DB.prepare(
      "SELECT coordinator_user_id FROM branding WHERE id = ?"
    )
      .bind(brandingId)
      .first<{ coordinator_user_id: number | null }>();
    
    if (!branding || branding.coordinator_user_id !== currentUser.id) {
      return c.json({ error: "Access denied" }, 403);
    }
  }
  // Admins have full access to all branding

  // Soft delete by setting is_active to 0
  await c.env.DB.prepare(
    "UPDATE branding SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  )
    .bind(brandingId)
    .run();

  return c.json({ success: true });
});

// Stripe checkout session creation
app.post("/api/stripe/create-checkout-session", clerkAuthMiddleware, async (c) => {
  const clerkUserId = c.get("clerkUserId") as string;
  
  if (!clerkUserId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const currentUser = await c.env.DB.prepare(
    "SELECT id, role, email, organization_name FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ id: number; role: string; email: string; organization_name: string | null }>();

  if (!currentUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const body = await c.req.json();
  const { tier, billing_period, field_days, sport_account_id } = body;

  if (!tier || !field_days) {
    return c.json({ error: "Missing required fields: tier, field_days" }, 400);
  }

  // Subscription prices (in dollars)
  const subscriptionPrices: Record<string, { monthly: number; annual: number }> = {
    free: { monthly: 0, annual: 0 },
    standard: { monthly: 99, annual: 79 },
    premium: { monthly: 349, annual: 299 },
  };

  const tierPricing = subscriptionPrices[tier.toLowerCase()];
  if (!tierPricing) {
    return c.json({ error: "Invalid tier" }, 400);
  }

  // Board pricing - same for everyone: $20 base with volume discounts
  const baseBoardPrice = 20;
  let volumeDiscount = 0;
  let discountedPrice = baseBoardPrice;
  if (field_days >= 100) {
    volumeDiscount = 0.30;
    discountedPrice = 14;
  } else if (field_days >= 50) {
    volumeDiscount = 0.20;
    discountedPrice = 16;
  } else if (field_days >= 20) {
    volumeDiscount = 0.10;
    discountedPrice = 18;
  }
  
  const boardsSubtotal = baseBoardPrice * field_days;
  const boardsDiscount = boardsSubtotal * volumeDiscount;
  const boardsTotal = boardsSubtotal - boardsDiscount;
  const boardsTotalCents = Math.round(boardsTotal * 100);

  // Subscription pricing
  const billingPeriod = billing_period || "monthly";
  const subscriptionPrice = billingPeriod === "annual" ? tierPricing.annual : tierPricing.monthly;
  const subscriptionTotalCents = billingPeriod === "annual" 
    ? Math.round(subscriptionPrice * 12 * 100) // Annual: charge full year upfront
    : Math.round(subscriptionPrice * 100); // Monthly

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const discountText = volumeDiscount > 0 
      ? ` (${(volumeDiscount * 100).toFixed(0)}% volume discount - $${discountedPrice}/each)`
      : '';
    
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    
    // Always add boards as one-time purchase
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: `ScoreLink Live - ${field_days} Field-Days`,
          description: `${field_days} field-days of scoreboard usage${discountText}`,
        },
        unit_amount: boardsTotalCents,
      },
      quantity: 1,
    });

    // Add subscription if not free tier
    if (tier.toLowerCase() !== "free" && subscriptionTotalCents > 0) {
      const subscriptionLabel = billingPeriod === "annual" 
        ? `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan - Annual (12 months)`
        : `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan - Monthly`;
      
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `ScoreLink Live - ${subscriptionLabel}`,
            description: billingPeriod === "annual"
              ? `$${subscriptionPrice}/month billed annually`
              : `Recurring monthly subscription`,
          },
          unit_amount: subscriptionTotalCents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${c.req.url.split("/api")[0]}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${c.req.url.split("/api")[0]}/pricing`,
      metadata: {
        userId: currentUser.id.toString(),
        tier,
        billing_period: billingPeriod,
        field_days: field_days.toString(),
        sport_account_id: sport_account_id?.toString() || "",
      },
      customer_email: currentUser.email,
    });

    return c.json({ url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    return c.json({ error: "Failed to create checkout session" }, 500);
  }
});

// Stripe webhook handler
app.post("/api/webhooks/stripe", async (c) => {
  const body = await c.req.text();
  const sig = c.req.header("stripe-signature") || "";

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      c.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (metadata && metadata.userId && metadata.tier && metadata.field_days) {
      const userId = parseInt(metadata.userId);
      const tier = metadata.tier;
      const fieldDays = parseInt(metadata.field_days);
      const billingPeriod = metadata.billing_period || "monthly";
      const sportAccountId = metadata.sport_account_id ? parseInt(metadata.sport_account_id) : null;

      // Calculate subscription dates based on billing period
      const startDate = new Date().toISOString().split("T")[0];
      const daysToAdd = billingPeriod === "annual" ? 365 : 30;
      const endDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // Update sport_account if we have the ID
      if (sportAccountId) {
        await c.env.DB.prepare(
          `UPDATE sport_accounts 
           SET subscription_tier = ?,
               billing_period = ?,
               fields_allowed = fields_allowed + ?,
               subscription_start_date = ?,
               subscription_end_date = ?,
               is_onboarded = 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        )
          .bind(tier, billingPeriod, fieldDays, startDate, endDate, sportAccountId)
          .run();

        console.log(`Sport account ${sportAccountId} activated: ${tier} tier, ${fieldDays} field-days, ${billingPeriod} billing`);
      }

      // Also update legacy user fields for backwards compatibility
      await c.env.DB.prepare(
        `UPDATE users 
         SET subscription_tier = ?,
             fields_allowed = COALESCE(fields_allowed, 0) + ?,
             subscription_start_date = ?,
             subscription_end_date = ?,
             is_onboarded = 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
        .bind(tier, fieldDays, startDate, endDate, userId)
        .run();

      console.log(`User ${userId} subscription updated: ${tier} tier, +${fieldDays} field-days`);
      
      // Send customer update to AI Ops (non-blocking)
      try {
        const user = await c.env.DB.prepare(
          "SELECT * FROM users WHERE id = ?"
        )
          .bind(userId)
          .first<any>();
        
        if (user) {
          const client = new ScoreLinkToAiOpsClient(c.env);
          await client.sendCustomerUpdate({
            externalCustomerId: user.clerk_user_id,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
            email: user.contact_email || user.email,
            companyName: user.organization_name || undefined,
            planKey: tier,
            status: 'active',
            billingEmail: user.contact_email || user.email
          });
        }
      } catch (error) {
        console.error('Failed to send customer update to AI Ops:', error);
      }
    }
  }

  return new Response("ok", { status: 200 });
});

// Contact form submission
app.post("/api/contact", async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, phone, preferred_contact, organization, existing_customer, topic, message } = body;

    // Validate required fields
    if (!name || !email || !phone || !preferred_contact || !existing_customer || !topic || !message) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Build email content
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563EB; margin-bottom: 20px;">New Contact Form Submission</h2>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #1e293b;">Contact Information</h3>
          <p style="margin: 8px 0;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 8px 0;"><strong>Phone:</strong> ${phone}</p>
          <p style="margin: 8px 0;"><strong>Preferred Contact:</strong> ${preferred_contact}</p>
          ${organization ? `<p style="margin: 8px 0;"><strong>Organization:</strong> ${organization}</p>` : ''}
          <p style="margin: 8px 0;"><strong>Existing Customer:</strong> ${existing_customer}</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #1e293b;">Inquiry Details</h3>
          <p style="margin: 8px 0;"><strong>Topic:</strong> ${topic}</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #1e293b;">Message</h3>
          <p style="margin: 8px 0; white-space: pre-wrap;">${message}</p>
        </div>
        
        <p style="margin-top: 20px; color: #64748b; font-size: 14px;">
          This message was sent from the ScoreLink LIVE contact form.
        </p>
      </div>
    `;

    const textBody = `
New Contact Form Submission

CONTACT INFORMATION
Name: ${name}
Email: ${email}
Phone: ${phone}
Preferred Contact: ${preferred_contact}
${organization ? `Organization: ${organization}\n` : ''}Existing Customer: ${existing_customer}

INQUIRY DETAILS
Topic: ${topic}

MESSAGE
${message}

---
This message was sent from the ScoreLink LIVE contact form.
    `.trim();

    // Send email
    const result = await sendEmail(c.env.RESEND_API_KEY, {
      to: "reilley.kevin@gmail.com",
      subject: `ScoreLink Contact Form: ${topic} - ${name}`,
      html: emailBody,
      text: textBody,
      reply_to: email
    });

    if (!result.success) {
      console.error("Failed to send contact email:", result.error);
      return c.json({ error: "Failed to send message" }, 500);
    }

    // Send support message to AI Ops (non-blocking)
    try {
      const client = new ScoreLinkToAiOpsClient(c.env);
      await client.sendSupportMessage({
        threadId: `contact-${Date.now()}`,
        messageId: result.message_id || `msg-${Date.now()}`,
        from: email,
        fromName: name,
        subject: `${topic} - ${name}`,
        message: `Organization: ${organization || 'N/A'}\nExisting Customer: ${existing_customer}\nPreferred Contact: ${preferred_contact}\nPhone: ${phone}\n\n${message}`,
        channel: 'contact_form'
      });
    } catch (error) {
      console.error('Failed to send support message to AI Ops:', error);
    }

    return c.json({ success: true, message_id: result.message_id }, 200);
  } catch (error) {
    console.error("Error processing contact form:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ============================================================================
// INTERNAL AI OPS ROUTES - /api/ops/*
// ============================================================================

// Inbound support webhook - creates/updates support tickets
app.post("/api/ops/webhooks/inbox", async (c) => {
  try {
    const body = await c.req.json();
    const { 
      businessId, 
      threadId, 
      messageId, 
      from, 
      fromName, 
      subject, 
      message,
      channel
    } = body;

    if (!from || !message || !messageId) {
      return c.json({ ok: false, error: "missing_required_fields", message: "from, message, and messageId are required" }, 400);
    }

    // Generate unique run ID for this workflow execution
    const workflowRunId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Step 1: Store raw webhook event (idempotent via external_event_id)
    const existingEvent = await c.env.DB.prepare(
      "SELECT id FROM aiops_webhook_events WHERE external_event_id = ?"
    )
      .bind(messageId)
      .first<{ id: number }>();

    let webhookEventId: number;
    if (existingEvent) {
      webhookEventId = existingEvent.id;
      // Event already processed, return existing result
      const existingMessage = await c.env.DB.prepare(
        "SELECT conversation_id FROM aiops_support_messages WHERE external_message_id = ?"
      )
        .bind(messageId)
        .first<{ conversation_id: number }>();

      if (existingMessage) {
        const existingTicket = await c.env.DB.prepare(
          "SELECT id FROM aiops_support_tickets WHERE conversation_id = ? AND status IN ('open', 'in_progress') LIMIT 1"
        )
          .bind(existingMessage.conversation_id)
          .first<{ id: number }>();

        return c.json({ 
          ok: true, 
          data: { 
            workflowRunId: null, 
            ticketId: existingTicket?.id || null 
          },
          message: "Event already processed"
        }, 200);
      }
    } else {
      const eventResult = await c.env.DB.prepare(
        `INSERT INTO aiops_webhook_events 
         (external_event_id, business_id, source, event_type, payload, is_processed)
         VALUES (?, ?, ?, ?, ?, 0)`
      )
        .bind(
          messageId,
          businessId || null,
          channel || 'email',
          'support.message.received',
          JSON.stringify(body)
        )
        .run();
      webhookEventId = eventResult.meta.last_row_id as number;
    }

    // Create workflow run
    const workflowRun = await c.env.DB.prepare(
      `INSERT INTO aiops_workflow_runs 
       (business_id, external_run_id, workflow_name, trigger_type, trigger_event_id, status, input_data, started_at)
       VALUES (?, ?, ?, ?, ?, 'running', ?, CURRENT_TIMESTAMP)`
    )
      .bind(
        businessId || null,
        workflowRunId,
        'support.new_ticket_triage',
        'webhook',
        webhookEventId,
        JSON.stringify({ from, subject, message })
      )
      .run();

    const runId = workflowRun.meta.last_row_id as number;

    // Helper function to log workflow steps
    const logStep = async (stepName: string, stepType: string, stepOrder: number, status: string, outputData?: any, errorMessage?: string) => {
      const stepResult = await c.env.DB.prepare(
        `INSERT INTO aiops_workflow_steps 
         (business_id, workflow_run_id, step_name, step_type, step_order, status, output_data, error_message, started_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
        .bind(
          businessId || null,
          runId,
          stepName,
          stepType,
          stepOrder,
          status,
          outputData ? JSON.stringify(outputData) : null,
          errorMessage || null
        )
        .run();

      const stepId = stepResult.meta.last_row_id as number;

      // Log execution event
      await c.env.DB.prepare(
        `INSERT INTO aiops_execution_events 
         (business_id, workflow_run_id, workflow_step_id, event_type, event_data, severity)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          businessId || null,
          runId,
          stepId,
          status === 'completed' ? 'step_completed' : 'step_failed',
          JSON.stringify({ stepName, outputData, errorMessage }),
          status === 'completed' ? 'info' : 'error'
        )
        .run();

      return stepId;
    };

    // Step 2: Resolve or create customer profile by exact email match
    let customerProfile = await c.env.DB.prepare(
      "SELECT * FROM aiops_customer_profiles WHERE email = ? AND business_id = ?"
    )
      .bind(from, businessId || null)
      .first<{ id: number; full_name: string | null }>();

    if (!customerProfile) {
      const profileResult = await c.env.DB.prepare(
        `INSERT INTO aiops_customer_profiles 
         (business_id, email, full_name, last_interaction_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
      )
        .bind(businessId || null, from, fromName || null)
        .run();

      customerProfile = {
        id: profileResult.meta.last_row_id as number,
        full_name: fromName || null
      };

      await logStep('resolve_customer_profile', 'data_lookup', 1, 'completed', { 
        customerProfileId: customerProfile.id, 
        action: 'created' 
      });
    } else {
      await logStep('resolve_customer_profile', 'data_lookup', 1, 'completed', { 
        customerProfileId: customerProfile.id, 
        action: 'found' 
      });
    }

    // Step 3: Resolve or create support conversation by threadId
    let conversation = threadId 
      ? await c.env.DB.prepare(
          "SELECT * FROM aiops_support_conversations WHERE external_conversation_id = ? AND business_id = ?"
        )
          .bind(threadId, businessId || null)
          .first<{ id: number; status: string }>()
      : null;

    if (!conversation) {
      const conversationResult = await c.env.DB.prepare(
        `INSERT INTO aiops_support_conversations 
         (business_id, external_conversation_id, customer_profile_id, subject, channel, status)
         VALUES (?, ?, ?, ?, ?, 'open')`
      )
        .bind(
          businessId || null,
          threadId || `thread_${messageId}`,
          customerProfile.id,
          subject || 'Support Request',
          channel || 'email'
        )
        .run();

      conversation = {
        id: conversationResult.meta.last_row_id as number,
        status: 'open'
      };

      await logStep('resolve_conversation', 'data_lookup', 2, 'completed', { 
        conversationId: conversation.id, 
        action: 'created' 
      });
    } else {
      await logStep('resolve_conversation', 'data_lookup', 2, 'completed', { 
        conversationId: conversation.id, 
        action: 'found' 
      });
    }

    // Step 4: Dedupe message by messageId
    const existingMessage = await c.env.DB.prepare(
      "SELECT id FROM aiops_support_messages WHERE external_message_id = ?"
    )
      .bind(messageId)
      .first<{ id: number }>();

    let messageDbId: number;
    if (existingMessage) {
      messageDbId = existingMessage.id;
      await logStep('dedupe_message', 'data_lookup', 3, 'completed', { 
        messageId: messageDbId, 
        action: 'duplicate_found' 
      });
    } else {
      // Classify sentiment
      const lowerMessage = message.toLowerCase();
      let sentiment = 'neutral';
      const urgentWords = ['urgent', 'asap', 'emergency', 'broken', 'not working', 'down', 'critical'];
      const positiveWords = ['thank', 'great', 'love', 'excellent', 'appreciate', 'happy'];
      const negativeWords = ['disappointed', 'frustrated', 'angry', 'unhappy', 'terrible', 'awful'];

      if (urgentWords.some(word => lowerMessage.includes(word))) {
        sentiment = 'urgent';
      } else if (negativeWords.some(word => lowerMessage.includes(word))) {
        sentiment = 'negative';
      } else if (positiveWords.some(word => lowerMessage.includes(word))) {
        sentiment = 'positive';
      }

      const messageResult = await c.env.DB.prepare(
        `INSERT INTO aiops_support_messages 
         (business_id, external_message_id, conversation_id, sender_type, sender_email, sender_name, content, sentiment)
         VALUES (?, ?, ?, 'customer', ?, ?, ?, ?)`
      )
        .bind(
          businessId || null,
          messageId,
          conversation.id,
          from,
          fromName || null,
          message,
          sentiment
        )
        .run();

      messageDbId = messageResult.meta.last_row_id as number;

      await logStep('dedupe_message', 'data_lookup', 3, 'completed', { 
        messageId: messageDbId, 
        action: 'created',
        sentiment 
      });
    }

    // Step 5: Create or reuse open support ticket for that conversation
    let ticket = await c.env.DB.prepare(
      "SELECT * FROM aiops_support_tickets WHERE conversation_id = ? AND status IN ('open', 'in_progress') LIMIT 1"
    )
      .bind(conversation.id)
      .first<{ id: number }>();

    // Step 6: Classify the issue and get category_id
    const lowerMessage = message.toLowerCase();
    const lowerSubject = (subject || '').toLowerCase();
    const fullText = `${lowerSubject} ${lowerMessage}`;

    let categoryName = 'general_question';
    if (fullText.includes('setup') || fullText.includes('install') || fullText.includes('getting started') || fullText.includes('onboard')) {
      categoryName = 'setup_issue';
    } else if (fullText.includes('hardware') || fullText.includes('device') || fullText.includes('screen') || fullText.includes('display') || fullText.includes('tablet')) {
      categoryName = 'hardware_issue';
    } else if (fullText.includes('scoreboard') || fullText.includes('score') || fullText.includes('clock') || fullText.includes('timer') || fullText.includes('game')) {
      categoryName = 'scoreboard_issue';
    } else if (fullText.includes('payment') || fullText.includes('billing') || fullText.includes('charge') || fullText.includes('invoice') || fullText.includes('subscription')) {
      categoryName = 'billing_issue';
    }

    // Get the category_id from the database
    const category = await c.env.DB.prepare(
      "SELECT id FROM aiops_issue_categories WHERE business_id = ? AND name = ? AND is_active = 1 LIMIT 1"
    )
      .bind(businessId, categoryName)
      .first<{ id: number }>();

    const categoryId = category?.id || null;

    // Step 7: Set severity
    let severity = 'low';
    const highSeverityWords = ['critical', 'emergency', 'urgent', 'asap', 'broken', 'down', 'not working'];
    const mediumSeverityWords = ['issue', 'problem', 'bug', 'error', 'help'];

    if (highSeverityWords.some(word => fullText.includes(word))) {
      severity = 'high';
    } else if (mediumSeverityWords.some(word => fullText.includes(word))) {
      severity = 'medium';
    }

    if (!ticket) {
      const ticketResult = await c.env.DB.prepare(
        `INSERT INTO aiops_support_tickets 
         (business_id, external_ticket_id, conversation_id, customer_profile_id, category_id, subject, description, status, priority, severity)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`
      )
        .bind(
          businessId || null,
          `ticket_${conversation.id}_${Date.now()}`,
          conversation.id,
          customerProfile.id,
          categoryId,
          subject || 'Support Request',
          message,
          severity === 'high' ? 'high' : 'normal',
          severity
        )
        .run();

      ticket = { id: ticketResult.meta.last_row_id as number };

      await logStep('classify_and_create_ticket', 'classification', 4, 'completed', { 
        ticketId: ticket.id, 
        categoryId,
        categoryName,
        severity,
        action: 'created' 
      });
    } else {
      // Update existing ticket with new classification
      await c.env.DB.prepare(
        `UPDATE aiops_support_tickets 
         SET category_id = ?, severity = ?, priority = ?
         WHERE id = ?`
      )
        .bind(
          categoryId,
          severity,
          severity === 'high' ? 'high' : 'normal',
          ticket.id
        )
        .run();

      await logStep('classify_and_create_ticket', 'classification', 4, 'completed', { 
        ticketId: ticket.id, 
        categoryId,
        categoryName,
        severity,
        action: 'reused_existing' 
      });
    }

    // Mark webhook event as processed
    await c.env.DB.prepare(
      "UPDATE aiops_webhook_events SET is_processed = 1, processed_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
      .bind(webhookEventId)
      .run();

    // Complete workflow run
    await c.env.DB.prepare(
      `UPDATE aiops_workflow_runs 
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP, output_data = ?
       WHERE id = ?`
    )
      .bind(
        JSON.stringify({ ticketId: ticket.id, category, severity }),
        runId
      )
      .run();

    return c.json({ 
      ok: true, 
      data: { 
        workflowRunId: runId,
        ticketId: ticket.id
      }
    }, 201);

  } catch (error) {
    console.error("Support inbox webhook error:", error);
    return c.json({ ok: false, error: "internal_error", message: "Internal server error" }, 500);
  }
});

// Generate draft response for support ticket
app.post("/api/ops/support/tickets/:ticketId/draft-response", async (c) => {
  try {
    const ticketId = parseInt(c.req.param('ticketId'));

    if (!ticketId || isNaN(ticketId)) {
      return c.json({ ok: false, error: "invalid_ticket_id", message: "Invalid ticket ID" }, 400);
    }

    // Generate unique run ID for this workflow execution
    const workflowRunId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Step 1: Load ticket with all context
    const ticket = await c.env.DB.prepare(
      `SELECT t.*, c.business_id, c.external_conversation_id, c.subject as conv_subject, c.channel,
              p.email as customer_email, p.full_name as customer_name, p.organization_name, 
              p.total_spend, p.lifetime_value, p.health_score
       FROM aiops_support_tickets t
       JOIN aiops_support_conversations c ON t.conversation_id = c.id
       JOIN aiops_customer_profiles p ON t.customer_profile_id = p.id
       WHERE t.id = ?`
    )
      .bind(ticketId)
      .first<{
        id: number;
        business_id: string | null;
        conversation_id: number;
        subject: string;
        description: string;
        status: string;
        priority: string;
        severity: string;
        customer_email: string;
        customer_name: string | null;
        organization_name: string | null;
        total_spend: number;
        lifetime_value: number;
        health_score: number | null;
        channel: string;
      }>();

    if (!ticket) {
      return c.json({ ok: false, error: "ticket_not_found", message: "Ticket not found" }, 404);
    }

    // Load all messages in the conversation
    const messages = await c.env.DB.prepare(
      `SELECT sender_type, sender_email, sender_name, content, sentiment, created_at
       FROM aiops_support_messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`
    )
      .bind(ticket.conversation_id)
      .all<{
        sender_type: string;
        sender_email: string;
        sender_name: string | null;
        content: string;
        sentiment: string | null;
        created_at: string;
      }>();

    // Create workflow run
    const workflowRun = await c.env.DB.prepare(
      `INSERT INTO aiops_workflow_runs 
       (business_id, external_run_id, workflow_name, trigger_type, status, input_data, started_at)
       VALUES (?, ?, ?, ?, 'running', ?, CURRENT_TIMESTAMP)`
    )
      .bind(
        ticket.business_id || null,
        workflowRunId,
        'support.draft_response',
        'manual',
        JSON.stringify({ ticketId: ticket.id })
      )
      .run();

    const runId = workflowRun.meta.last_row_id as number;

    // Helper function to log workflow steps
    const logStep = async (stepName: string, stepType: string, stepOrder: number, status: string, outputData?: any, errorMessage?: string) => {
      const stepResult = await c.env.DB.prepare(
        `INSERT INTO aiops_workflow_steps 
         (business_id, workflow_run_id, step_name, step_type, step_order, status, output_data, error_message, started_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
        .bind(
          ticket.business_id || null,
          runId,
          stepName,
          stepType,
          stepOrder,
          status,
          outputData ? JSON.stringify(outputData) : null,
          errorMessage || null
        )
        .run();

      const stepId = stepResult.meta.last_row_id as number;

      // Log execution event
      await c.env.DB.prepare(
        `INSERT INTO aiops_execution_events 
         (business_id, workflow_run_id, workflow_step_id, event_type, event_data, severity)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          ticket.business_id || null,
          runId,
          stepId,
          status === 'completed' ? 'step_completed' : 'step_failed',
          JSON.stringify({ stepName, outputData, errorMessage }),
          status === 'completed' ? 'info' : 'error'
        )
        .run();

      return stepId;
    };

    await logStep('load_ticket_context', 'data_lookup', 1, 'completed', {
      ticketId: ticket.id,
      messageCount: messages.results.length,
      customerEmail: ticket.customer_email
    });

    // Load AI Ops settings for business
    const settingsResult = await c.env.DB.prepare(
      `SELECT ai_ops_enabled, auto_send_enabled, auto_send_confidence_threshold 
       FROM aiops_settings 
       WHERE business_id = ?`
    )
      .bind(ticket.business_id || 'scorelink')
      .first();

    const aiOpsEnabled = settingsResult?.ai_ops_enabled === 1;
    const autoSendEnabled = settingsResult?.auto_send_enabled === 1;
    const confidenceThreshold = (settingsResult?.auto_send_confidence_threshold as number) || 0.95;

    // Define allowed categories for auto-send
    const allowedCategories = ['setup_issue', 'hardware_issue', 'scoreboard_issue', 'general_question'];

    // If AI Ops is disabled, only generate and store draft
    if (!aiOpsEnabled) {
      await logStep('check_ai_ops_status', 'configuration', 2, 'completed', {
        aiOpsEnabled: false,
        action: 'draft_only_mode'
      });

      // Step 2: Build conversation context for AI (continue numbering)
      const conversationHistory = messages.results.map(msg => {
        return `[${msg.sender_type === 'customer' ? 'Customer' : 'Agent'}]: ${msg.content}`;
      }).join('\n\n');

      const customerContext = `
Customer: ${ticket.customer_name || ticket.customer_email}
Organization: ${ticket.organization_name || 'N/A'}
Total Spend: $${(ticket.total_spend / 100).toFixed(2)}
Lifetime Value: $${(ticket.lifetime_value / 100).toFixed(2)}
Health Score: ${ticket.health_score || 'N/A'}
`.trim();

      // Step 3: Generate draft response using OpenAI
      const client = new OpenAI({
        apiKey: c.env.OPENAI_API_KEY,
      });

      const systemPrompt = `You are an expert customer support agent for ScoreLink Live, a youth sports live scoreboard platform. 

Your task is to analyze the support ticket and draft a helpful, professional response.

Provide your response in this exact JSON format:
{
  "draft": "Your draft response here",
  "confidence": 0.85,
  "rationale": "Brief explanation of your analysis and why you chose this response"
}`;

      const userPrompt = `
CUSTOMER CONTEXT:
${customerContext}

TICKET DETAILS:
Subject: ${ticket.subject}
Priority: ${ticket.priority}
Severity: ${ticket.severity}
Status: ${ticket.status}

CONVERSATION HISTORY:
${conversationHistory}

Generate a draft response.`;

      let aiResponse;
      try {
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });

        aiResponse = JSON.parse(completion.choices[0].message.content || "{}");

        await logStep('generate_draft_response', 'ai_generation', 3, 'completed', {
          confidence: aiResponse.confidence,
          draftLength: aiResponse.draft?.length || 0
        });
      } catch (error) {
        console.error("OpenAI API error:", error);
        await logStep('generate_draft_response', 'ai_generation', 3, 'failed', null, String(error));
        
        await c.env.DB.prepare(
          `UPDATE aiops_workflow_runs 
           SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error_message = ?
           WHERE id = ?`
        )
          .bind(String(error), runId)
          .run();

        return c.json({ ok: false, error: "ai_generation_failed", message: "Failed to generate draft response" }, 500);
      }

      // Store draft only (no sending, no approval)
      await c.env.DB.prepare(
        `INSERT INTO aiops_support_responses 
         (business_id, workflow_run_id, ticket_id, conversation_id, draft_content, confidence, rationale, is_sent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`
      )
        .bind(
          ticket.business_id || null,
          runId,
          ticket.id,
          ticket.conversation_id,
          aiResponse.draft,
          aiResponse.confidence || 0.5,
          aiResponse.rationale || null
        )
        .run();

      // Log disabled event
      await c.env.DB.prepare(
        `INSERT INTO aiops_execution_events 
         (business_id, workflow_run_id, event_type, event_data, severity, created_at)
         VALUES (?, ?, 'ai_ops_disabled', ?, 'info', CURRENT_TIMESTAMP)`
      )
        .bind(
          ticket.business_id || null,
          runId,
          JSON.stringify({ reason: 'AI Ops disabled - draft stored only' })
        )
        .run();

      // Complete workflow with disabled status
      await c.env.DB.prepare(
        `UPDATE aiops_workflow_runs 
         SET status = 'disabled', completed_at = CURRENT_TIMESTAMP, output_data = ?
         WHERE id = ?`
      )
        .bind(
          JSON.stringify({ draft: aiResponse.draft, disabled: true }),
          runId
        )
        .run();

      return c.json({
        ok: true,
        data: {
          workflowRunId: runId,
          result: { disabled: true }
        }
      }, 200);
    }

    await logStep('check_ai_ops_status', 'configuration', 2, 'completed', {
      aiOpsEnabled: true,
      action: 'proceeding_with_full_workflow'
    });

    // Step 2: Build conversation context for AI
    const conversationHistory = messages.results.map(msg => {
      return `[${msg.sender_type === 'customer' ? 'Customer' : 'Agent'}]: ${msg.content}`;
    }).join('\n\n');

    const customerContext = `
Customer: ${ticket.customer_name || ticket.customer_email}
Organization: ${ticket.organization_name || 'N/A'}
Total Spend: $${(ticket.total_spend / 100).toFixed(2)}
Lifetime Value: $${(ticket.lifetime_value / 100).toFixed(2)}
Health Score: ${ticket.health_score || 'N/A'}
`.trim();

    // Step 3: Generate draft response using OpenAI with structured output
    const client = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are an expert customer support agent for ScoreLink Live, a youth sports live scoreboard platform. 

Your task is to analyze the support ticket and draft a helpful, professional response. You must also assess risk factors and provide confidence scores.

Consider:
- Customer context (spend, lifetime value, organization)
- Ticket severity and priority
- Conversation history and sentiment
- Whether the issue involves billing, technical problems, or general questions

Provide your response in this exact JSON format:
{
  "draft": "Your draft response here",
  "confidence": 0.85,
  "flags": {
    "billingSensitive": false,
    "angryTone": false,
    "financialImpact": false,
    "requiresApproval": false
  },
  "rationale": "Brief explanation of your analysis and why you chose this response"
}

Set flags appropriately:
- billingSensitive: true if the ticket mentions payments, refunds, charges, or billing issues
- angryTone: true if customer messages show frustration, anger, or negative sentiment
- financialImpact: true if resolution may involve refunds, credits, or financial adjustments
- requiresApproval: true if any of the above flags are true, or if you're not confident (< 0.90)

Your confidence score should reflect how certain you are that this response is appropriate and complete.`;

    const userPrompt = `
CUSTOMER CONTEXT:
${customerContext}

TICKET DETAILS:
Subject: ${ticket.subject}
Priority: ${ticket.priority}
Severity: ${ticket.severity}
Status: ${ticket.status}

CONVERSATION HISTORY:
${conversationHistory}

Generate a draft response with risk assessment.`;

    let aiResponse;
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      aiResponse = JSON.parse(completion.choices[0].message.content || "{}");

      await logStep('generate_draft_response', 'ai_generation', 2, 'completed', {
        confidence: aiResponse.confidence,
        flags: aiResponse.flags,
        draftLength: aiResponse.draft?.length || 0
      });
    } catch (error) {
      console.error("OpenAI API error:", error);
      await logStep('generate_draft_response', 'ai_generation', 2, 'failed', null, String(error));
      
      // Complete workflow as failed
      await c.env.DB.prepare(
        `UPDATE aiops_workflow_runs 
         SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error_message = ?
         WHERE id = ?`
      )
        .bind(String(error), runId)
        .run();

      return c.json({ ok: false, error: "ai_generation_failed", message: "Failed to generate draft response" }, 500);
    }

    // Step 4: Ensure flags object has all required fields
    const flags = {
      billingSensitive: aiResponse.flags?.billingSensitive || false,
      angryTone: aiResponse.flags?.angryTone || false,
      financialImpact: aiResponse.flags?.financialImpact || false,
      requiresApproval: aiResponse.flags?.requiresApproval || false,
    };

    // Recalculate requiresApproval based on logic
    const hasRiskFlags = flags.billingSensitive || flags.angryTone || flags.financialImpact;
    const confidence = aiResponse.confidence || 0.5;

    // Get ticket category name (settings already loaded earlier in function)
    const categoryResult = await c.env.DB.prepare(
      `SELECT c.slug 
       FROM aiops_support_tickets t
       LEFT JOIN aiops_issue_categories c ON t.category_id = c.id
       WHERE t.id = ?`
    )
      .bind(ticketId)
      .first();

    const categorySlug = (categoryResult?.slug as string) || null;
    const categoryAllowed = categorySlug ? allowedCategories.includes(categorySlug) : false;

    // Determine if auto-send is allowed based on all criteria
    const meetsAutoSendCriteria = aiOpsEnabled
      && autoSendEnabled 
      && confidence >= confidenceThreshold 
      && categoryAllowed 
      && !hasRiskFlags;

    flags.requiresApproval = !meetsAutoSendCriteria;

    await logStep('assess_risk_flags', 'classification', 3, 'completed', {
      flags,
      confidence,
      hasRiskFlags,
      aiOpsEnabled,
      autoSendEnabled,
      confidenceThreshold,
      categorySlug,
      categoryAllowed,
      meetsAutoSendCriteria
    });

    // Step 5: Handle auto-send or create approval request
    let approvalRequestId: number | null = null;
    let workflowStatus = 'completed';
    
    if (flags.requiresApproval) {
      // Create approval request for risky or low-confidence responses
      const approvalResult = await c.env.DB.prepare(
        `INSERT INTO aiops_approval_requests 
         (business_id, workflow_run_id, request_type, title, description, status, expires_at)
         VALUES (?, ?, 'draft_response_approval', ?, ?, 'pending', datetime('now', '+24 hours'))`
      )
        .bind(
          ticket.business_id || null,
          runId,
          `Approval Required: Ticket #${ticket.id}`,
          `Draft response needs approval due to: ${
            hasRiskFlags 
              ? Object.entries(flags).filter(([k, v]) => v && k !== 'requiresApproval').map(([k]) => k).join(', ')
              : 'Low confidence (' + (confidence * 100).toFixed(0) + '%)'
          }\n\nDraft: ${aiResponse.draft?.substring(0, 200)}...`
        )
        .run();

      approvalRequestId = approvalResult.meta.last_row_id as number;
      workflowStatus = 'waiting_approval';

      await logStep('create_approval_request', 'workflow_control', 4, 'completed', {
        approvalRequestId,
        reason: hasRiskFlags ? 'risk_flags_detected' : 'low_confidence'
      });
    } else {
      // High confidence, no risk - auto-send the response
      await logStep('mark_auto_send_eligible', 'workflow_control', 4, 'completed', {
        reason: 'high_confidence_no_risk',
        confidence,
        autoSendEligible: true
      });

      // Step 5: Store draft in aiops_support_responses
      const draftResult = await c.env.DB.prepare(
        `INSERT INTO aiops_support_responses 
         (business_id, workflow_run_id, ticket_id, conversation_id, draft_content, confidence, flags, rationale, is_sent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`
      )
        .bind(
          ticket.business_id || null,
          runId,
          ticket.id,
          ticket.conversation_id,
          aiResponse.draft,
          confidence,
          JSON.stringify(flags),
          aiResponse.rationale || null
        )
        .run();

      const draftId = draftResult.meta.last_row_id as number;

      // Step 6: Send email via Resend
      let providerMessageId: string | null = null;
      let sendError: string | null = null;

      try {
        const emailResult = await sendEmail(c.env.RESEND_API_KEY, {
          to: ticket.customer_email,
          subject: `Re: ${ticket.subject}`,
          text: aiResponse.draft,
        });

        console.log('Email service response:', JSON.stringify(emailResult));

        // Check if email send failed (service returned error response)
        if (!emailResult.success) {
          console.error('Email send failed', {
            error: emailResult.error || 'Unknown error'
          });
          throw new Error(emailResult.error || 'Email send failed');
        }

        // Extract message ID from email service response
        providerMessageId = emailResult.message_id;
        
        if (!providerMessageId) {
          throw new Error('Email send completed but no message ID returned');
        }
        
        console.log('Email sent successfully, provider message ID:', providerMessageId);

        await logStep('send_email', 'email_delivery', 5, 'completed', {
          to: ticket.customer_email,
          providerMessageId,
          draftId
        });

        // Step 7: Update draft as sent (must happen before creating outbound message)
        await c.env.DB.prepare(
          `UPDATE aiops_support_responses 
           SET is_sent = 1, sent_at = CURRENT_TIMESTAMP, provider_message_id = ?
           WHERE id = ?`
        )
          .bind(providerMessageId, draftId)
          .run();

        // Step 8: Create outbound message in aiops_support_messages
        await c.env.DB.prepare(
          `INSERT INTO aiops_support_messages 
           (business_id, external_message_id, conversation_id, sender_type, sender_email, sender_name, content, sentiment, is_read, created_at)
           VALUES (?, ?, ?, 'agent', 'support@scorelink.com', 'ScoreLink Support', ?, 'neutral', 1, CURRENT_TIMESTAMP)`
        )
          .bind(
            ticket.business_id || null,
            providerMessageId,
            ticket.conversation_id,
            aiResponse.draft
          )
          .run();

        // Step 9: Log message_sent execution event
        await c.env.DB.prepare(
          `INSERT INTO aiops_execution_events 
           (business_id, workflow_run_id, event_type, event_data, severity, created_at)
           VALUES (?, ?, 'message_sent', ?, 'info', CURRENT_TIMESTAMP)`
        )
          .bind(
            ticket.business_id || null,
            runId,
            JSON.stringify({
              to: ticket.customer_email,
              providerMessageId,
              draftId,
              confidence
            })
          )
          .run();

      } catch (error) {
        console.error("Email send error:", error);
        sendError = String(error);
        
        await logStep('send_email', 'email_delivery', 5, 'failed', null, sendError);

        // Update draft with error (is_sent remains 0, no provider_message_id)
        await c.env.DB.prepare(
          `UPDATE aiops_support_responses 
           SET send_error = ?
           WHERE id = ?`
        )
          .bind(sendError, draftId)
          .run();

        // Create a manual review task
        await c.env.DB.prepare(
          `INSERT INTO aiops_tasks 
           (business_id, workflow_run_id, task_type, title, description, assigned_to, status, priority, due_at, created_at)
           VALUES (?, ?, 'manual_review', ?, ?, 'support_team', 'pending', 'high', datetime('now', '+2 hours'), CURRENT_TIMESTAMP)`
        )
          .bind(
            ticket.business_id || null,
            runId,
            `Email Send Failed: Ticket #${ticket.id}`,
            `Failed to send auto-generated response. Error: ${sendError}\n\nDraft: ${aiResponse.draft?.substring(0, 200)}...`
          )
          .run();

        workflowStatus = 'failed';
      }
    }

    // Prepare result object
    const result = {
      draft: aiResponse.draft,
      confidence,
      flags,
      rationale: aiResponse.rationale,
      approvalRequestId,
      autoSendEligible: !flags.requiresApproval
    };

    // Complete workflow run with appropriate status
    await c.env.DB.prepare(
      `UPDATE aiops_workflow_runs 
       SET status = ?, completed_at = ?, output_data = ?
       WHERE id = ?`
    )
      .bind(
        workflowStatus,
        workflowStatus === 'completed' ? new Date().toISOString() : null,
        JSON.stringify(result),
        runId
      )
      .run();

    return c.json({
      ok: true,
      data: {
        workflowRunId: runId,
        result
      }
    }, 200);

  } catch (error) {
    console.error("Draft response error:", error);
    return c.json({ ok: false, error: "internal_error", message: "Internal server error" }, 500);
  }
});

// Stripe payment failed webhook - AI Ops finance handler
app.post("/api/ops/webhooks/stripe", async (c) => {
  try {
    // Check for test mode
    const isTestMode = c.req.header('x-test-mode') === 'true';
    
    let event;
    let rawBody;
    
    if (isTestMode) {
      // Test mode: skip signature verification and parse body directly
      rawBody = await c.req.text();
      event = JSON.parse(rawBody);
    } else {
      // Production mode: verify Stripe webhook signature
      const signature = c.req.header('stripe-signature');
      rawBody = await c.req.text();
      
      if (!signature) {
        return c.json({ ok: false, error: "missing_signature", message: "Webhook signature required" }, 400);
      }

      // Verify signature using Stripe's method
      const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-02-25.clover',
        httpClient: Stripe.createFetchHttpClient(),
      });

      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          c.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return c.json({ ok: false, error: "invalid_signature", message: "Webhook signature verification failed" }, 400);
      }
    }

    const { type, data, id: stripeEventId } = event;

    // Only handle invoice.payment_failed events
    if (type !== 'invoice.payment_failed') {
      return c.json({ ok: true, data: { received: true, ignored: true } }, 200);
    }

    const invoice = data.object;
    const {
      id: invoiceId,
      customer: stripeCustomerId,
      customer_email,
      amount_due,
      amount_paid,
      currency,
      attempt_count,
      status: invoiceStatus,
      period_end
    } = invoice;

    if (!invoiceId || !stripeCustomerId) {
      return c.json({ ok: false, error: "missing_invoice_data", message: "Missing required invoice data" }, 400);
    }

    // Generate unique run ID for this workflow execution
    const workflowRunId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const businessId = 'scorelink'; // Default business ID for ScoreLink

    // Step 1: Store raw webhook event (idempotent by external_event_id)
    const existingEvent = await c.env.DB.prepare(
      "SELECT id FROM aiops_webhook_events WHERE external_event_id = ?"
    )
      .bind(stripeEventId || invoiceId)
      .first<{ id: number }>();

    if (existingEvent) {
      // Event already processed, return success
      return c.json({ ok: true, data: { received: true, duplicate: true } }, 200);
    }

    const webhookEventResult = await c.env.DB.prepare(
      `INSERT INTO aiops_webhook_events 
       (business_id, external_event_id, source, event_type, payload, is_processed)
       VALUES (?, ?, 'stripe', 'invoice.payment_failed', ?, 0)`
    )
      .bind(businessId, stripeEventId || invoiceId, JSON.stringify(event))
      .run();

    const webhookEventId = webhookEventResult.meta.last_row_id as number;

    // Create workflow run
    const workflowResult = await c.env.DB.prepare(
      `INSERT INTO aiops_workflow_runs 
       (business_id, external_run_id, workflow_name, trigger_type, status, input_data, started_at)
       VALUES (?, ?, 'finance.failed_payment_handler', 'webhook', 'running', ?, CURRENT_TIMESTAMP)`
    )
      .bind(businessId, workflowRunId, JSON.stringify({ invoiceId, stripeCustomerId }))
      .run();

    const runId = workflowResult.meta.last_row_id as number;

    // Helper function to log workflow steps
    const logStep = async (stepName: string, stepType: string, stepOrder: number, status: string, outputData?: any, errorMessage?: string) => {
      const stepResult = await c.env.DB.prepare(
        `INSERT INTO aiops_workflow_steps 
         (business_id, workflow_run_id, step_name, step_type, step_order, status, output_data, error_message, started_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
        .bind(
          businessId,
          runId,
          stepName,
          stepType,
          stepOrder,
          status,
          outputData ? JSON.stringify(outputData) : null,
          errorMessage || null
        )
        .run();

      const stepId = stepResult.meta.last_row_id as number;

      // Log execution event
      await c.env.DB.prepare(
        `INSERT INTO aiops_execution_events 
         (business_id, workflow_run_id, workflow_step_id, event_type, event_data, severity)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          businessId,
          runId,
          stepId,
          status === 'completed' ? 'step_completed' : 'step_failed',
          JSON.stringify({ stepName, outputData, errorMessage }),
          status === 'completed' ? 'info' : 'error'
        )
        .run();

      return stepId;
    };

    await logStep('store_webhook_event', 'data_ingestion', 1, 'completed', { webhookEventId });

    // Step 2: Normalize customer account from Stripe customer ID
    let customerAccount = await c.env.DB.prepare(
      "SELECT * FROM aiops_customer_accounts WHERE external_account_id = ?"
    )
      .bind(stripeCustomerId)
      .first<{ id: number; customer_profile_id: number }>();

    if (!customerAccount) {
      // Create customer account
      const accountResult = await c.env.DB.prepare(
        `INSERT INTO aiops_customer_accounts 
         (business_id, external_account_id, account_type, status)
         VALUES (?, ?, 'stripe', 'active')`
      )
        .bind(businessId, stripeCustomerId)
        .run();

      const accountId = accountResult.meta.last_row_id as number;

      // Also create/link customer profile
      let profile = await c.env.DB.prepare(
        "SELECT id FROM aiops_customer_profiles WHERE email = ?"
      )
        .bind(customer_email || 'unknown@unknown.com')
        .first<{ id: number }>();

      if (!profile) {
        const profileResult = await c.env.DB.prepare(
          `INSERT INTO aiops_customer_profiles 
           (business_id, email, full_name, total_spend, lifetime_value)
           VALUES (?, ?, ?, 0, 0)`
        )
          .bind(businessId, customer_email || 'unknown@unknown.com', null)
          .run();

        profile = { id: profileResult.meta.last_row_id as number };
      }

      // Update account with profile link
      await c.env.DB.prepare(
        "UPDATE aiops_customer_accounts SET customer_profile_id = ? WHERE id = ?"
      )
        .bind(profile.id, accountId)
        .run();

      customerAccount = { id: accountId, customer_profile_id: profile.id };

      await logStep('normalize_customer_account', 'data_normalization', 2, 'completed', {
        accountId,
        profileId: profile.id,
        action: 'created'
      });
    } else {
      await logStep('normalize_customer_account', 'data_normalization', 2, 'completed', {
        accountId: customerAccount.id,
        action: 'found_existing'
      });
    }

    // Step 3: Normalize invoice
    let invoiceRecord = await c.env.DB.prepare(
      "SELECT id FROM aiops_invoices WHERE external_invoice_id = ?"
    )
      .bind(invoiceId)
      .first<{ id: number }>();

    if (!invoiceRecord) {
      const invoiceInsert = await c.env.DB.prepare(
        `INSERT INTO aiops_invoices 
         (business_id, customer_account_id, customer_profile_id, external_invoice_id, amount_due, amount_paid, currency, status, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          businessId,
          customerAccount.id,
          customerAccount.customer_profile_id,
          invoiceId,
          amount_due || 0,
          amount_paid || 0,
          currency || 'usd',
          invoiceStatus || 'open',
          period_end ? new Date(period_end * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        )
        .run();

      invoiceRecord = { id: invoiceInsert.meta.last_row_id as number };

      await logStep('normalize_invoice', 'data_normalization', 3, 'completed', {
        invoiceId: invoiceRecord.id,
        action: 'created'
      });
    } else {
      await logStep('normalize_invoice', 'data_normalization', 3, 'completed', {
        invoiceId: invoiceRecord.id,
        action: 'found_existing'
      });
    }

    // Step 4: Normalize failed payment (idempotent)
    const chargeId = (invoice as any).charge || null;
    const externalPaymentId = chargeId || `failed_payment_${invoiceId}`;

    let paymentRecord = await c.env.DB.prepare(
      "SELECT id FROM aiops_payments WHERE external_payment_id = ?"
    )
      .bind(externalPaymentId)
      .first<{ id: number }>();

    let paymentId: number;

    if (!paymentRecord) {
      const paymentResult = await c.env.DB.prepare(
        `INSERT INTO aiops_payments 
         (business_id, customer_account_id, invoice_id, external_payment_id, amount, currency, status, payment_method, failure_reason)
         VALUES (?, ?, ?, ?, ?, ?, 'failed', 'stripe', ?)`
      )
        .bind(
          businessId,
          customerAccount.id,
          invoiceRecord.id,
          externalPaymentId,
          amount_due || 0,
          currency || 'usd',
          `Payment failed after ${attempt_count || 1} attempts`
        )
        .run();

      paymentId = paymentResult.meta.last_row_id as number;

      await logStep('normalize_failed_payment', 'data_normalization', 4, 'completed', {
        paymentId,
        attemptCount: attempt_count || 1,
        action: 'created'
      });
    } else {
      paymentId = paymentRecord.id;

      await logStep('normalize_failed_payment', 'data_normalization', 4, 'completed', {
        paymentId,
        attemptCount: attempt_count || 1,
        action: 'found_existing'
      });
    }

    // Check AI Ops global kill switch
    const opsConfigResult = await c.env.DB.prepare(
      `SELECT ai_ops_enabled FROM aiops_settings WHERE business_id = ?`
    )
      .bind(businessId)
      .first();

    const aiOpsEnabled = opsConfigResult?.ai_ops_enabled === 1;

    if (!aiOpsEnabled) {
      // AI Ops disabled - log event but skip workflow execution
      await logStep('check_ai_ops_status', 'configuration', 5, 'completed', {
        aiOpsEnabled: false,
        action: 'workflow_disabled'
      });

      await c.env.DB.prepare(
        `UPDATE aiops_workflow_runs 
         SET status = 'disabled', output_data = ?
         WHERE id = ?`
      )
        .bind(
          JSON.stringify({
            reason: 'AI Ops disabled',
            paymentId,
            invoiceId: invoiceRecord.id,
            accountId: customerAccount.id
          }),
          runId
        )
        .run();

      return c.json({
        ok: true,
        data: {
          received: true,
          logged: true,
          workflowDisabled: true,
          message: 'AI Ops disabled - event logged but workflow not executed'
        }
      }, 200);
    }

    await logStep('check_ai_ops_status', 'configuration', 5, 'completed', {
      aiOpsEnabled: true,
      action: 'proceeding_with_workflow'
    });

    // Step 6: Create finance alert with type failed_payment and severity high
    const alertResult = await c.env.DB.prepare(
      `INSERT INTO aiops_finance_alerts 
       (business_id, customer_account_id, alert_type, severity, title, description, status)
       VALUES (?, ?, 'failed_payment', 'high', ?, ?, 'open')`
    )
      .bind(
        businessId,
        customerAccount.id,
        `Payment Failed: Invoice ${invoiceId}`,
        `Payment of ${((amount_due || 0) / 100).toFixed(2)} ${currency?.toUpperCase() || 'USD'} failed after ${attempt_count || 1} attempts for customer ${customer_email || stripeCustomerId}`
      )
      .run();

    const alertId = alertResult.meta.last_row_id as number;

    await logStep('create_finance_alert', 'alert_creation', 6, 'completed', {
      alertId,
      severity: 'high',
      type: 'failed_payment'
    });

    // Step 6: Draft a billing follow-up message using AI
    const client = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are a professional billing and finance communication specialist for ScoreLink Live, a youth sports scoreboard platform.

Your task is to draft a courteous but clear follow-up message about a failed payment. The message should:
- Be professional and empathetic
- Clearly state the payment issue
- Provide actionable next steps
- Maintain a positive customer relationship

Provide your response in this exact JSON format:
{
  "subject": "Brief subject line",
  "message": "Full message body",
  "tone": "professional/empathetic/urgent",
  "requiresApproval": true
}

Finance messages always require approval by default.`;

    const userPrompt = `
PAYMENT FAILURE DETAILS:
- Customer Email: ${customer_email || 'Unknown'}
- Invoice ID: ${invoiceId}
- Amount Due: ${((amount_due || 0) / 100).toFixed(2)} ${currency?.toUpperCase() || 'USD'}
- Attempt Count: ${attempt_count || 1}
- Stripe Customer ID: ${stripeCustomerId}

Draft a billing follow-up message to notify the customer and request payment update.`;

    let draftMessage;
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      draftMessage = JSON.parse(completion.choices[0].message.content || "{}");

      await logStep('draft_billing_message', 'ai_generation', 6, 'completed', {
        subject: draftMessage.subject,
        messageLength: draftMessage.message?.length || 0
      });
    } catch (error) {
      console.error("OpenAI API error for billing message:", error);
      await logStep('draft_billing_message', 'ai_generation', 6, 'failed', null, String(error));
      
      // Use fallback message
      draftMessage = {
        subject: `Payment Issue - Invoice ${invoiceId}`,
        message: `We noticed a payment issue with your ScoreLink Live account. Please update your payment method to continue service.`,
        tone: "professional",
        requiresApproval: true
      };
    }

    // Step 7: Create approval request (finance messages require approval by default)
    const approvalResult = await c.env.DB.prepare(
      `INSERT INTO aiops_approval_requests 
       (business_id, workflow_run_id, request_type, title, description, status, expires_at)
       VALUES (?, ?, 'finance_message_approval', ?, ?, 'pending', datetime('now', '+48 hours'))`
    )
      .bind(
        businessId,
        runId,
        `Finance Message Approval Required`,
        `Failed payment follow-up for ${customer_email || stripeCustomerId}\n\nSubject: ${draftMessage.subject}\n\nMessage:\n${draftMessage.message}`
      )
      .run();

    const approvalRequestId = approvalResult.meta.last_row_id as number;

    await logStep('create_approval_request', 'workflow_control', 7, 'completed', {
      approvalRequestId,
      reason: 'finance_message_requires_approval'
    });

    // Mark webhook event as processed
    await c.env.DB.prepare(
      "UPDATE aiops_webhook_events SET is_processed = 1, processed_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
      .bind(webhookEventId)
      .run();

    // Set workflow run to waiting_approval since approval request was created
    await c.env.DB.prepare(
      `UPDATE aiops_workflow_runs 
       SET status = 'waiting_approval', output_data = ?
       WHERE id = ?`
    )
      .bind(
        JSON.stringify({
          alertId,
          paymentId,
          invoiceId: invoiceRecord.id,
          approvalRequestId,
          draftMessage
        }),
        runId
      )
      .run();

    return c.json({
      ok: true,
      data: { received: true }
    }, 200);

  } catch (error) {
    console.error("Stripe finance webhook error:", error);
    return c.json({ ok: false, error: "internal_error", message: "Internal server error" }, 500);
  }
});

// AI Ops UI Support Routes
app.get("/api/ops/support/tickets", async (c) => {
  try {
    const tickets = await c.env.DB.prepare(
      `SELECT t.id as ticket_id, t.subject as summary, ic.name as category_name, 
              t.severity, t.priority, t.status, t.created_at
       FROM aiops_support_tickets t
       LEFT JOIN aiops_issue_categories ic ON t.category_id = ic.id
       WHERE t.business_id = 'scorelink'
       ORDER BY t.created_at DESC`
    ).all();

    return c.json({ ok: true, data: tickets.results }, 200);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return c.json({ ok: false, error: "internal_error", message: "Failed to fetch tickets" }, 500);
  }
});

app.get("/api/ops/support/tickets/:ticketId", async (c) => {
  try {
    const ticketId = parseInt(c.req.param('ticketId'));

    const ticket = await c.env.DB.prepare(
      `SELECT t.id as ticket_id, t.subject as summary, ic.name as category_name,
              t.severity, t.status, t.created_at
       FROM aiops_support_tickets t
       LEFT JOIN aiops_issue_categories ic ON t.category_id = ic.id
       WHERE t.id = ?`
    )
      .bind(ticketId)
      .first();

    if (!ticket) {
      return c.json({ ok: false, error: "not_found", message: "Ticket not found" }, 404);
    }

    const ticketData = await c.env.DB.prepare(
      "SELECT conversation_id FROM aiops_support_tickets WHERE id = ?"
    )
      .bind(ticketId)
      .first<{ conversation_id: number }>();

    const messages = await c.env.DB.prepare(
      `SELECT id as message_id, direction, content, created_at
       FROM aiops_support_messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`
    )
      .bind(ticketData!.conversation_id)
      .all();

    const draft = await c.env.DB.prepare(
      `SELECT id as response_id, response_body, confidence_score, flags, is_sent
       FROM aiops_support_responses
       WHERE ticket_id = ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
      .bind(ticketId)
      .first();

    return c.json({
      ok: true,
      data: {
        ticket,
        messages: messages.results,
        draft
      }
    }, 200);
  } catch (error) {
    console.error("Error fetching ticket detail:", error);
    return c.json({ ok: false, error: "internal_error", message: "Failed to fetch ticket" }, 500);
  }
});

app.post("/api/ops/support/tickets/:ticketId/send", async (c) => {
  try {
    const { response_id } = await c.req.json();

    const draft = await c.env.DB.prepare(
      `SELECT sr.response_body, sr.ticket_id, st.conversation_id, cp.email
       FROM aiops_support_responses sr
       JOIN aiops_support_tickets st ON sr.ticket_id = st.id
       JOIN aiops_customer_profiles cp ON st.customer_profile_id = cp.id
       WHERE sr.id = ?`
    )
      .bind(response_id)
      .first<{
        response_body: string;
        ticket_id: number;
        conversation_id: number;
        email: string;
      }>();

    if (!draft) {
      return c.json({ ok: false, error: "not_found", message: "Draft not found" }, 404);
    }

    // Send email
    let emailResult;
    try {
      emailResult = await sendEmail(c.env.RESEND_API_KEY, {
        from: "support@scorelinksports.com",
        to: draft.email,
        subject: "Re: Support Request",
        text: draft.response_body
      });
    } catch (emailError) {
      console.error("Email send failed:", emailError);
      return c.json({ ok: false, error: "email_failed", message: "Failed to send email" }, 500);
    }

    const providerMessageId = emailResult?.message_id || `sent_${Date.now()}`;

    // Create outbound message
    await c.env.DB.prepare(
      `INSERT INTO aiops_support_messages 
       (business_id, conversation_id, external_message_id, direction, sender_type, 
        sender_email, content, created_at)
       VALUES ('scorelink', ?, ?, 'outbound', 'agent', 'support@scorelinksports.com', ?, CURRENT_TIMESTAMP)`
    )
      .bind(draft.conversation_id, providerMessageId, draft.response_body)
      .run();

    // Mark draft as sent
    await c.env.DB.prepare(
      "UPDATE aiops_support_responses SET is_sent = 1 WHERE id = ?"
    )
      .bind(response_id)
      .run();

    // Log execution event
    await c.env.DB.prepare(
      `INSERT INTO aiops_execution_events 
       (business_id, event_type, event_data, severity, created_at)
       VALUES ('scorelink', 'message_sent', ?, 'info', CURRENT_TIMESTAMP)`
    )
      .bind(JSON.stringify({ response_id, providerMessageId, email: draft.email }))
      .run();

    return c.json({ ok: true, data: { sent: true, provider_message_id: providerMessageId } }, 200);
  } catch (error) {
    console.error("Error sending message:", error);
    return c.json({ ok: false, error: "internal_error", message: "Failed to send message" }, 500);
  }
});

app.get("/api/ops/finance/alerts", async (c) => {
  try {
    const alerts = await c.env.DB.prepare(
      `SELECT id, customer_account_id, alert_type, severity, title, description, status, created_at
       FROM aiops_finance_alerts
       WHERE status = 'open'
       ORDER BY created_at DESC`
    ).all();

    return c.json({ ok: true, data: alerts.results }, 200);
  } catch (error) {
    console.error("Error fetching finance alerts:", error);
    return c.json({ ok: false, error: "internal_error", message: "Failed to fetch alerts" }, 500);
  }
});

app.get("/api/ops/approvals", async (c) => {
  try {
    const approvals = await c.env.DB.prepare(
      `SELECT id, workflow_run_id, request_type, title, description, status, created_at
       FROM aiops_approval_requests
       WHERE status = 'pending'
       ORDER BY created_at DESC`
    ).all();

    return c.json({ ok: true, data: approvals.results }, 200);
  } catch (error) {
    console.error("Error fetching approvals:", error);
    return c.json({ ok: false, error: "internal_error", message: "Failed to fetch approvals" }, 500);
  }
});

app.post("/api/ops/approvals/:approvalId/approve", async (c) => {
  try {
    const approvalId = parseInt(c.req.param('approvalId'));

    const approval = await c.env.DB.prepare(
      `SELECT ar.workflow_run_id, ar.request_type, wr.output_data
       FROM aiops_approval_requests ar
       JOIN aiops_workflow_runs wr ON ar.workflow_run_id = wr.id
       WHERE ar.id = ?`
    )
      .bind(approvalId)
      .first<{
        workflow_run_id: number;
        request_type: string;
        output_data: string;
      }>();

    if (!approval) {
      return c.json({ ok: false, error: "not_found", message: "Approval request not found" }, 404);
    }

    // Execute the stored action based on request type
    if (approval.request_type === 'support_message_approval') {
      const outputData = JSON.parse(approval.output_data);
      const responseId = outputData.responseId;

      // Get draft and send it
      const draft = await c.env.DB.prepare(
        `SELECT sr.response_body, st.conversation_id, cp.email
         FROM aiops_support_responses sr
         JOIN aiops_support_tickets st ON sr.ticket_id = st.id
         JOIN aiops_customer_profiles cp ON st.customer_profile_id = cp.id
         WHERE sr.id = ?`
      )
        .bind(responseId)
        .first<{
          response_body: string;
          conversation_id: number;
          email: string;
        }>();

      if (draft) {
        try {
          const emailResult = await sendEmail(c.env.RESEND_API_KEY, {
            from: "support@scorelinksports.com",
            to: draft.email,
            subject: "Re: Support Request",
            text: draft.response_body
          });

          const providerMessageId = emailResult?.message_id || `sent_${Date.now()}`;

          await c.env.DB.prepare(
            `INSERT INTO aiops_support_messages 
             (business_id, conversation_id, external_message_id, direction, sender_type, 
              sender_email, content, created_at)
             VALUES ('scorelink', ?, ?, 'outbound', 'agent', 'support@scorelinksports.com', ?, CURRENT_TIMESTAMP)`
          )
            .bind(draft.conversation_id, providerMessageId, draft.response_body)
            .run();

          await c.env.DB.prepare(
            "UPDATE aiops_support_responses SET is_sent = 1 WHERE id = ?"
          )
            .bind(responseId)
            .run();
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
        }
      }
    }

    // Update approval status
    await c.env.DB.prepare(
      "UPDATE aiops_approval_requests SET status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
      .bind(approvalId)
      .run();

    // Log execution event
    await c.env.DB.prepare(
      `INSERT INTO aiops_execution_events 
       (business_id, event_type, event_data, severity, created_at)
       VALUES ('scorelink', 'approval_approved', ?, 'info', CURRENT_TIMESTAMP)`
    )
      .bind(JSON.stringify({ approval_id: approvalId, workflow_run_id: approval.workflow_run_id }))
      .run();

    return c.json({ ok: true, data: { approved: true } }, 200);
  } catch (error) {
    console.error("Error approving request:", error);
    return c.json({ ok: false, error: "internal_error", message: "Failed to approve" }, 500);
  }
});

app.post("/api/ops/approvals/:approvalId/reject", async (c) => {
  try {
    const approvalId = parseInt(c.req.param('approvalId'));

    await c.env.DB.prepare(
      "UPDATE aiops_approval_requests SET status = 'rejected', rejected_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
      .bind(approvalId)
      .run();

    // Log execution event
    await c.env.DB.prepare(
      `INSERT INTO aiops_execution_events 
       (business_id, event_type, event_data, severity, created_at)
       VALUES ('scorelink', 'approval_rejected', ?, 'info', CURRENT_TIMESTAMP)`
    )
      .bind(JSON.stringify({ approval_id: approvalId }))
      .run();

    return c.json({ ok: true, data: { rejected: true } }, 200);
  } catch (error) {
    console.error("Error rejecting request:", error);
    return c.json({ ok: false, error: "internal_error", message: "Failed to reject" }, 500);
  }
});

app.post("/api/ops/workflows/daily-summary", async (c) => {
  try {
    const businessId = 'scorelink';
    const summaryDate = new Date().toISOString().split('T')[0];

    // Create workflow run
    const workflowResult = await c.env.DB.prepare(
      `INSERT INTO aiops_workflow_runs 
       (business_id, workflow_name, status, trigger_type, started_at)
       VALUES (?, 'ops.daily_summary', 'running', 'scheduled', CURRENT_TIMESTAMP)`
    )
      .bind(businessId)
      .run();

    const runId = workflowResult.meta.last_row_id as number;

    // Log workflow started
    await c.env.DB.prepare(
      `INSERT INTO aiops_execution_events 
       (business_id, workflow_run_id, event_type, severity, created_at)
       VALUES (?, ?, 'workflow_started', 'info', CURRENT_TIMESTAMP)`
    )
      .bind(businessId, runId)
      .run();

    // STEP 1: Collect metrics
    await c.env.DB.prepare(
      `INSERT INTO aiops_workflow_steps
       (workflow_run_id, step_name, step_order, status, started_at)
       VALUES (?, 'collect_metrics', 1, 'running', CURRENT_TIMESTAMP)`
    )
      .bind(runId)
      .run();

    // Collect last 24 hours of activity
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // New support tickets
    const newTickets = await c.env.DB.prepare(
      `SELECT id, subject, severity, priority, status, created_at
       FROM aiops_support_tickets
       WHERE business_id = ? AND created_at >= ?
       ORDER BY created_at DESC`
    )
      .bind(businessId, twentyFourHoursAgo)
      .all();

    // Auto-sent support replies
    const autoSent = await c.env.DB.prepare(
      `SELECT id, ticket_id, confidence, created_at
       FROM aiops_support_responses
       WHERE business_id = ? AND is_sent = 1 AND created_at >= ?
       ORDER BY created_at DESC`
    )
      .bind(businessId, twentyFourHoursAgo)
      .all();

    // Failed sends
    const failedSends = await c.env.DB.prepare(
      `SELECT id, ticket_id, send_error, created_at
       FROM aiops_support_responses
       WHERE business_id = ? AND is_sent = 0 AND send_error IS NOT NULL AND created_at >= ?
       ORDER BY created_at DESC`
    )
      .bind(businessId, twentyFourHoursAgo)
      .all();

    // Pending approvals
    const pendingApprovals = await c.env.DB.prepare(
      `SELECT id, request_type, title, created_at
       FROM aiops_approval_requests
       WHERE business_id = ? AND status = 'pending'
       ORDER BY created_at DESC`
    )
      .bind(businessId)
      .all();

    // Finance alerts
    const financeAlerts = await c.env.DB.prepare(
      `SELECT id, customer_account_id, invoice_id, severity, created_at
       FROM aiops_finance_alerts
       WHERE business_id = ? AND created_at >= ?
       ORDER BY created_at DESC`
    )
      .bind(businessId, twentyFourHoursAgo)
      .all();

    // Failed workflows
    const failedWorkflows = await c.env.DB.prepare(
      `SELECT id, workflow_name, error_message, started_at
       FROM aiops_workflow_runs
       WHERE business_id = ? AND status = 'failed' AND started_at >= ?
       ORDER BY started_at DESC`
    )
      .bind(businessId, twentyFourHoursAgo)
      .all();

    // Waiting approval workflows
    const waitingApprovalWorkflows = await c.env.DB.prepare(
      `SELECT id, workflow_name, started_at
       FROM aiops_workflow_runs
       WHERE business_id = ? AND status = 'waiting_approval' AND started_at >= ?
       ORDER BY started_at DESC`
    )
      .bind(businessId, twentyFourHoursAgo)
      .all();

    const counts = {
      support_ticket_count: newTickets.results.length,
      auto_sent_count: autoSent.results.length,
      failed_send_count: failedSends.results.length,
      pending_approval_count: pendingApprovals.results.length,
      finance_alert_count: financeAlerts.results.length,
      failed_workflow_count: failedWorkflows.results.length,
      waiting_approval_workflow_count: waitingApprovalWorkflows.results.length
    };

    // Mark step 1 complete
    await c.env.DB.prepare(
      `UPDATE aiops_workflow_steps
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE workflow_run_id = ? AND step_name = 'collect_metrics'`
    )
      .bind(runId)
      .run();

    // STEP 2: Generate AI summary
    await c.env.DB.prepare(
      `INSERT INTO aiops_workflow_steps
       (workflow_run_id, step_name, step_order, status, started_at)
       VALUES (?, 'generate_ai_summary', 2, 'running', CURRENT_TIMESTAMP)`
    )
      .bind(runId)
      .run();
    const client = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are an AI Ops monitoring assistant for ScoreLink Live. Generate a concise daily summary report for the operations team.

Format your response as a clear, scannable report with these sections:
1. Executive Summary - 2-3 sentences highlighting key metrics and any critical issues
2. Support Activity - Summary of tickets, auto-responses, and failed sends
3. Finance / Billing Alerts - Any payment issues or billing concerns
4. Pending Approvals - Items requiring human review
5. Failed or Blocked Workflows - Technical issues that need attention
6. Recommended Actions - Top 3 priority actions for the ops team

Use clear headings and bullet points. Be concise but informative.`;

    const activityData = `
ACTIVITY COUNTS (Last 24 Hours):
- New Support Tickets: ${counts.support_ticket_count}
- Auto-Sent Responses: ${counts.auto_sent_count}
- Failed Sends: ${counts.failed_send_count}
- Pending Approvals: ${counts.pending_approval_count}
- Finance Alerts: ${counts.finance_alert_count}
- Failed Workflows: ${counts.failed_workflow_count}
- Waiting Approval Workflows: ${counts.waiting_approval_workflow_count}

NEW SUPPORT TICKETS:
${newTickets.results.map((t: any) => `- [${t.severity}] ${t.subject} (${t.status})`).join('\n') || 'None'}

FINANCE ALERTS:
${financeAlerts.results.map((a: any) => `- Alert ${a.id}: Customer ${a.customer_account_id}, Invoice ${a.invoice_id} (${a.severity})`).join('\n') || 'None'}

FAILED SENDS:
${failedSends.results.map((f: any) => `- Ticket ${f.ticket_id}: ${f.send_error}`).join('\n') || 'None'}

PENDING APPROVALS:
${pendingApprovals.results.map((a: any) => `- ${a.title} (${a.request_type})`).join('\n') || 'None'}

FAILED WORKFLOWS:
${failedWorkflows.results.map((w: any) => `- ${w.workflow_name}: ${w.error_message}`).join('\n') || 'None'}
`;

    let summaryText;
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate today's daily summary based on this data:\n\n${activityData}` }
        ],
        temperature: 0.7,
      });

      summaryText = completion.choices[0].message.content || "Failed to generate summary";

      await c.env.DB.prepare(
        `INSERT INTO aiops_execution_events 
         (business_id, workflow_run_id, event_type, severity, created_at)
         VALUES (?, ?, 'daily_summary_generated', 'info', CURRENT_TIMESTAMP)`
      )
        .bind(businessId, runId)
        .run();
    } catch (error) {
      console.error("OpenAI API error:", error);
      summaryText = `Daily Summary - ${summaryDate}\n\n${activityData}`;
    }

    // Mark step 2 complete
    await c.env.DB.prepare(
      `UPDATE aiops_workflow_steps
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE workflow_run_id = ? AND step_name = 'generate_ai_summary'`
    )
      .bind(runId)
      .run();

    // STEP 3: Store summary
    await c.env.DB.prepare(
      `INSERT INTO aiops_workflow_steps
       (workflow_run_id, step_name, step_order, status, started_at)
       VALUES (?, 'store_summary', 3, 'running', CURRENT_TIMESTAMP)`
    )
      .bind(runId)
      .run();

    // Store summary in database
    await c.env.DB.prepare(
      `INSERT INTO aiops_daily_summaries 
       (business_id, summary_date, summary_text, support_ticket_count, auto_sent_count,
        failed_send_count, pending_approval_count, finance_alert_count, failed_workflow_count,
        waiting_approval_workflow_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        businessId,
        summaryDate,
        summaryText,
        counts.support_ticket_count,
        counts.auto_sent_count,
        counts.failed_send_count,
        counts.pending_approval_count,
        counts.finance_alert_count,
        counts.failed_workflow_count,
        counts.waiting_approval_workflow_count
      )
      .run();

    // Mark step 3 complete
    await c.env.DB.prepare(
      `UPDATE aiops_workflow_steps
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE workflow_run_id = ? AND step_name = 'store_summary'`
    )
      .bind(runId)
      .run();

    // STEP 4: Send summary email
    await c.env.DB.prepare(
      `INSERT INTO aiops_workflow_steps
       (workflow_run_id, step_name, step_order, status, started_at)
       VALUES (?, 'send_summary_email', 4, 'running', CURRENT_TIMESTAMP)`
    )
      .bind(runId)
      .run();

    // Determine admin email
    let adminEmail = c.env.OPS_ADMIN_EMAIL;
    if (!adminEmail) {
      const adminUser = await c.env.DB.prepare(
        "SELECT email FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1"
      )
        .first<{ email: string }>();
      
      adminEmail = adminUser?.email || "admin@scorelinksports.com";
    }

    // Send email
    try {
      await sendEmail(c.env.RESEND_API_KEY, {
        from: "aiops@scorelinksports.com",
        to: adminEmail,
        subject: `ScoreLink AI Ops Daily Summary - ${summaryDate}`,
        text: summaryText
      });

      await c.env.DB.prepare(
        `INSERT INTO aiops_execution_events 
         (business_id, workflow_run_id, event_type, severity, created_at)
         VALUES (?, ?, 'daily_summary_sent', 'info', CURRENT_TIMESTAMP)`
      )
        .bind(businessId, runId)
        .run();

      // Mark step 4 complete
      await c.env.DB.prepare(
        `UPDATE aiops_workflow_steps
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE workflow_run_id = ? AND step_name = 'send_summary_email'`
      )
        .bind(runId)
        .run();

      await c.env.DB.prepare(
        `UPDATE aiops_workflow_runs 
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
        .bind(runId)
        .run();

      return c.json({
        ok: true,
        data: {
          workflowRunId: runId,
          summaryDate,
          counts
        }
      }, 200);
    } catch (emailError) {
      console.error("Failed to send daily summary email:", emailError);

      // Mark step 4 failed
      await c.env.DB.prepare(
        `UPDATE aiops_workflow_steps
         SET status = 'failed', completed_at = CURRENT_TIMESTAMP
         WHERE workflow_run_id = ? AND step_name = 'send_summary_email'`
      )
        .bind(runId)
        .run();

      await c.env.DB.prepare(
        `INSERT INTO aiops_execution_events 
         (business_id, workflow_run_id, event_type, severity, details, created_at)
         VALUES (?, ?, 'step_failed', 'error', ?, CURRENT_TIMESTAMP)`
      )
        .bind(businessId, runId, JSON.stringify({ error: String(emailError), step: 'email_send' }))
        .run();

      await c.env.DB.prepare(
        `INSERT INTO aiops_tasks 
         (business_id, task_type, title, description, priority, status, created_at)
         VALUES (?, 'daily_summary_send_failed', 'Daily Summary Email Failed', ?, 'high', 'open', CURRENT_TIMESTAMP)`
      )
        .bind(businessId, `Failed to send daily summary for ${summaryDate}. Error: ${String(emailError)}`)
        .run();

      await c.env.DB.prepare(
        `UPDATE aiops_workflow_runs 
         SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error_message = ?
         WHERE id = ?`
      )
        .bind(String(emailError), runId)
        .run();

      return c.json({
        ok: false,
        error: "email_send_failed",
        message: "Summary saved but email failed to send"
      }, 500);
    }
  } catch (error) {
    console.error("Error generating daily summary:", error);
    return c.json({
      ok: false,
      error: "internal_error",
      message: "Failed to generate daily summary"
    }, 500);
  }
});

app.get("/api/ops/daily-summaries", async (c) => {
  try {
    const summaries = await c.env.DB.prepare(
      `SELECT id, business_id, summary_date, summary_text, support_ticket_count,
              auto_sent_count, failed_send_count, pending_approval_count,
              finance_alert_count, failed_workflow_count, waiting_approval_workflow_count,
              created_at
       FROM aiops_daily_summaries
       WHERE business_id = 'scorelink'
       ORDER BY summary_date DESC
       LIMIT 10`
    )
      .all();

    return c.json({
      ok: true,
      data: { summaries: summaries.results }
    }, 200);
  } catch (error) {
    console.error("Error fetching daily summaries:", error);
    return c.json({
      ok: false,
      error: "internal_error",
      message: "Failed to fetch summaries"
    }, 500);
  }
});

app.post("/api/ops/workflows/growth/high-usage-upsell", async (c) => {
  try {
    const businessId = 'scorelink';
    const campaignDate = new Date().toISOString().split('T')[0];
    const campaignKey = 'high_usage_no_premium';

    // Check for existing campaign today
    const existingCampaign = await c.env.DB.prepare(
      `SELECT id FROM aiops_workflow_runs 
       WHERE business_id = ? 
       AND workflow_name = ? 
       AND DATE(started_at) = ?`
    )
      .bind(businessId, `growth.${campaignKey}`, campaignDate)
      .first();

    if (existingCampaign) {
      return c.json({
        ok: true,
        data: { targetCount: 0, message: 'Campaign already run today' }
      }, 200);
    }

    // Create workflow run
    const workflowResult = await c.env.DB.prepare(
      `INSERT INTO aiops_workflow_runs 
       (business_id, workflow_name, status, trigger_type, started_at)
       VALUES (?, ?, 'running', 'manual', CURRENT_TIMESTAMP)`
    )
      .bind(businessId, `growth.${campaignKey}`)
      .run();

    const runId = workflowResult.meta.last_row_id as number;

    await c.env.DB.prepare(
      `INSERT INTO aiops_execution_events 
       (business_id, workflow_run_id, event_type, severity, created_at)
       VALUES (?, ?, 'workflow_started', 'info', CURRENT_TIMESTAMP)`
    )
      .bind(businessId, runId)
      .run();

    // Step 1: Find high-usage accounts not on premium
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const targetAccounts = await c.env.DB.prepare(
      `SELECT DISTINCT 
         sa.id as sport_account_id,
         sa.coordinator_user_id,
         u.email,
         u.first_name,
         u.organization_name,
         sa.subscription_tier,
         (SELECT COUNT(*) FROM games WHERE sport_account_id = sa.id AND created_at >= ?) as game_count,
         (SELECT COUNT(*) FROM fields WHERE sport_account_id = sa.id AND created_at >= ?) as field_count
       FROM sport_accounts sa
       JOIN users u ON sa.coordinator_user_id = u.id
       WHERE sa.subscription_tier != 'premium'
       HAVING game_count >= 10 OR field_count >= 5`
    )
      .bind(thirtyDaysAgo, thirtyDaysAgo)
      .all();

    await c.env.DB.prepare(
      `INSERT INTO aiops_workflow_steps 
       (workflow_run_id, step_name, step_type, step_order, status, started_at, completed_at)
       VALUES (?, 'identify_targets', 'data_query', 1, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
      .bind(runId)
      .run();

    if (targetAccounts.results.length === 0) {
      await c.env.DB.prepare(
        `UPDATE aiops_workflow_runs 
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
        .bind(runId)
        .run();

      return c.json({
        ok: true,
        data: { targetCount: 0 }
      }, 200);
    }

    // Step 2: Generate AI upsell messages for each account
    const client = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    for (const account of targetAccounts.results) {
      const accountData = account as any;

      const systemPrompt = `You are a growth specialist for ScoreLink Live, a youth sports live scoreboard platform.

Your task is to craft a personalized, compelling upsell message to encourage customers to upgrade to the Premium plan.

The customer is actively using the platform (${accountData.game_count} games, ${accountData.field_count} fields in the last 30 days) but is currently on the ${accountData.subscription_tier} tier.

Premium benefits:
- Unlimited fields
- Custom branding with team colors
- Sponsor logo rotation
- Multi-field view on large displays
- Priority support

Provide your response in this exact JSON format:
{
  "subject": "Brief, enticing subject line",
  "body": "Personalized email body mentioning their usage and premium benefits",
  "confidence": 0.85,
  "flags": {
    "requiresApproval": true
  }
}

ALWAYS set requiresApproval to true. Growth messages should never auto-send.`;

      const userPrompt = `
ACCOUNT DETAILS:
- Organization: ${accountData.organization_name || 'Unknown'}
- Contact Name: ${accountData.first_name || 'Coach'}
- Email: ${accountData.email}
- Current Tier: ${accountData.subscription_tier}
- Games (30 days): ${accountData.game_count}
- Fields (30 days): ${accountData.field_count}

Generate a personalized upsell message.`;

      let aiResponse;
      try {
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });

        aiResponse = JSON.parse(completion.choices[0].message.content || "{}");
      } catch (error) {
        console.error("OpenAI API error for upsell:", error);
        aiResponse = {
          subject: `Unlock Premium Features for ${accountData.organization_name}`,
          body: `Hi ${accountData.first_name},\n\nWe noticed you've been actively using ScoreLink Live with ${accountData.game_count} games scheduled recently. Have you considered upgrading to Premium for custom branding, sponsor logos, and multi-field displays?\n\nLet us know if you'd like to learn more!\n\nBest,\nScoreLink Team`,
          confidence: 0.5,
          flags: { requiresApproval: true }
        };
      }

      // Store draft response
      const responseResult = await c.env.DB.prepare(
        `INSERT INTO aiops_support_responses 
         (business_id, workflow_run_id, draft_content, confidence, is_sent, created_at)
         VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`
      )
        .bind(
          businessId,
          runId,
          JSON.stringify({
            to: accountData.email,
            subject: aiResponse.subject,
            body: aiResponse.body
          }),
          aiResponse.confidence || 0.5
        )
        .run();

      const responseId = responseResult.meta.last_row_id as number;

      // Create approval request
      await c.env.DB.prepare(
        `INSERT INTO aiops_approval_requests 
         (business_id, workflow_run_id, request_type, title, description, status, expires_at)
         VALUES (?, ?, 'growth_upsell_approval', ?, ?, 'pending', datetime('now', '+7 days'))`
      )
        .bind(
          businessId,
          runId,
          `Upsell: ${accountData.organization_name}`,
          `To: ${accountData.email}\nSubject: ${aiResponse.subject}\n\nBody:\n${aiResponse.body}\n\nUsage: ${accountData.game_count} games, ${accountData.field_count} fields (30 days)\nCurrent Tier: ${accountData.subscription_tier}`
        )
        .run();

      await c.env.DB.prepare(
        `INSERT INTO aiops_execution_events 
         (business_id, workflow_run_id, event_type, severity, details, created_at)
         VALUES (?, ?, 'upsell_message_generated', 'info', ?, CURRENT_TIMESTAMP)`
      )
        .bind(
          businessId,
          runId,
          JSON.stringify({
            responseId,
            sportAccountId: accountData.sport_account_id,
            email: accountData.email,
            confidence: aiResponse.confidence
          })
        )
        .run();
    }

    await c.env.DB.prepare(
      `INSERT INTO aiops_workflow_steps 
       (workflow_run_id, step_name, step_type, step_order, status, started_at, completed_at)
       VALUES (?, 'generate_upsell_messages', 'ai_generation', 2, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
      .bind(runId)
      .run();

    // Mark workflow as waiting approval
    await c.env.DB.prepare(
      `UPDATE aiops_workflow_runs 
       SET status = 'waiting_approval', completed_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(runId)
      .run();

    return c.json({
      ok: true,
      data: { targetCount: targetAccounts.results.length }
    }, 200);
  } catch (error) {
    console.error("Error running high-usage upsell workflow:", error);
    return c.json({
      ok: false,
      error: "internal_error",
      message: "Failed to run upsell workflow"
    }, 500);
  }
});

// AI Ops Connector Test Endpoints
app.post("/api/internal/aiops/test-customer", async (c) => {
  const client = new ScoreLinkToAiOpsClient(c.env);
  
  const testCustomer = {
    externalCustomerId: "test-customer-123",
    name: "Test User",
    email: "test@example.com",
    companyName: "Test League",
    planKey: "premium",
    status: "active",
    billingEmail: "billing@example.com"
  };

  const result = await client.sendCustomerUpdate(testCustomer);
  
  return c.json({
    ok: result.ok,
    message: result.ok ? "Customer update sent successfully" : "Failed to send customer update",
    error: result.error,
    payload: testCustomer
  });
});

app.post("/api/internal/aiops/test-usage", async (c) => {
  const client = new ScoreLinkToAiOpsClient(c.env);
  
  const testUsage = {
    externalCustomerId: "test-customer-123",
    snapshotDate: new Date().toISOString().split('T')[0],
    activeLeaguesCount: 5,
    activeEventsCount: 12,
    activeBoardsCount: 8,
    totalSessions: 150,
    premiumFeatureUsageCount: 45,
    gamesStreamedLast30d: 67,
    multiFieldUsageCount: 23,
    lastActiveAt: new Date().toISOString(),
    usageScore: 75
  };

  const result = await client.sendUsageSnapshot(testUsage);
  
  return c.json({
    ok: result.ok,
    message: result.ok ? "Usage snapshot sent successfully" : "Failed to send usage snapshot",
    error: result.error,
    payload: testUsage
  });
});

app.post("/api/internal/aiops/test-support-message", async (c) => {
  const client = new ScoreLinkToAiOpsClient(c.env);
  
  const testMessage = {
    threadId: "thread-" + Date.now(),
    messageId: "msg-" + Date.now(),
    from: "test@example.com",
    fromName: "Test User",
    subject: "Test Support Message",
    message: "This is a test support message from ScoreLink Live",
    channel: "contact_form"
  };

  const result = await client.sendSupportMessage(testMessage);
  
  return c.json({
    ok: result.ok,
    message: result.ok ? "Support message sent successfully" : "Failed to send support message",
    error: result.error,
    payload: testMessage
  });
});

app.get("/api/internal/aiops/health", async (c) => {
  const client = new ScoreLinkToAiOpsClient(c.env);
  const result = await client.healthCheck();
  
  return c.json({
    ok: result.ok,
    status: result.ok ? "healthy" : "unhealthy",
    error: result.error,
    baseUrl: c.env.AI_OPS_BASE_URL || "not configured",
    secretConfigured: !!c.env.AI_OPS_CONNECTOR_SECRET
  });
});

export default app;
