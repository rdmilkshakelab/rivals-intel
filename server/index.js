import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { initialiseAuth, registerAuthRoutes } from "./auth.js";
import { getStatsProvider, getPlayerProfile, getPlayerMatchHistory, getHeroCatalogue } from "./stats-provider.js";

export const app = express();
const port = Number(process.env.PORT || 4000);
const profileLimiter = rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: "draft-7", legacyHeaders: false });
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "").split(",").map((value) => value.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("This origin is not allowed by Rivals Intel."));
  },
  credentials: true
}));
app.use(express.json({ limit: "32kb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false }));
app.use("/api/account", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }));
const devicePollLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 150, standardHeaders: "draft-7", legacyHeaders: false });
const deviceActionLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false });
app.use("/api/device", (req, res, next) => {
  const limiter = req.path === "/poll" ? devicePollLimiter : deviceActionLimiter;
  limiter(req, res, next);
});

// Keep all public player-data requests under the same per-IP limit.
app.use("/api/player", profileLimiter);
app.use("/api/heroes", profileLimiter);

function validUsername(value) {
  return /^[a-zA-Z0-9_. -]{2,32}$/.test(String(value || "").trim());
}

app.get("/", (_req, res) => res.json({
  name: "Rivals Intel API",
  version: "1.0.0",
  status: "online",
  documentation: "/openapi.json",
  health: "/health",
  endpoints: {
    playerProfile: "/api/player/{username}",
    matchHistory: "/api/player/{username}/match-history",
    heroes: "/api/heroes"
  }
}));

app.get("/openapi.json", (_req, res) => res.json({
  openapi: "3.1.0",
  info: {
    title: "Rivals Intel API",
    version: "1.0.0",
    description: "Player profile, match-history and hero-catalogue API. Data availability depends on the configured upstream provider."
  },
  servers: [{ url: process.env.PUBLIC_API_URL || "https://rivals-intel-api.onrender.com" }],
  paths: {
    "/health": { get: { summary: "API health", responses: { "200": { description: "Service health and active provider." } } } },
    "/api/player/{username}": {
      get: {
        summary: "Get a public player profile",
        parameters: [{ name: "username", in: "path", required: true, schema: { type: "string", minLength: 2, maxLength: 32 } }],
        responses: { "200": { description: "Player profile." }, "400": { description: "Invalid username." }, "404": { description: "Player not found." }, "502": { description: "Upstream provider error." } }
      }
    },
    "/api/player/{username}/match-history": {
      get: {
        summary: "Get player match history",
        parameters: [
          { name: "username", in: "path", required: true, schema: { type: "string" } },
          { name: "season", in: "query", schema: { type: "string" } },
          { name: "game_mode", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50 } }
        ],
        responses: { "200": { description: "Match history." }, "400": { description: "Invalid request." }, "501": { description: "Not supported by the active provider." } }
      }
    },
    "/api/heroes": { get: { summary: "Get the hero catalogue", responses: { "200": { description: "Hero catalogue." }, "501": { description: "Not supported by the active provider." } } } }
  }
}));

app.get("/health", (_req, res) => res.json({
  ok: true,
  service: "rivals-intel-api",
  accountsConfigured: Boolean(process.env.DATABASE_URL),
  statsProvider: getStatsProvider(),
  timestamp: new Date().toISOString()
}));

app.get("/api/player/:query", async (req, res) => {
  const username = String(req.params.query || "").trim();
  if (!validUsername(username)) return res.status(400).json({ error: "Enter a valid player username (2-32 characters)." });
  try {
    const player = await getPlayerProfile(username);
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=240");
    res.json({ player });
  } catch (error) {
    const message = String(error?.message || "");
    const notFound = error.status === 404 || /could not find|not found|does not exist/i.test(message);
    const status = error.status || (notFound ? 404 : 502);
    res.status(status).json({
      error: notFound ? "We couldn't find that public player profile." : status === 501 ? message : "The player-data provider could not complete this request.",
      provider: getStatsProvider()
    });
  }
});

app.get("/api/player/:query/match-history", async (req, res) => {
  const username = String(req.params.query || "").trim();
  if (!validUsername(username)) return res.status(400).json({ error: "Enter a valid player username (2-32 characters)." });
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({ error: "Page must be a positive integer and limit must be between 1 and 50." });
  }
  try {
    const history = await getPlayerMatchHistory(username, { ...req.query, page, limit });
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    res.json(history);
  } catch (error) {
    res.status(error.status || 502).json({
      error: error.status === 501 ? error.message : "Match history is currently unavailable.",
      provider: getStatsProvider()
    });
  }
});

app.get("/api/heroes", async (_req, res) => {
  try {
    const heroes = await getHeroCatalogue();
    res.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=7200");
    res.json(heroes);
  } catch (error) {
    res.status(error.status || 502).json({
      error: error.status === 501 ? error.message : "The hero catalogue is currently unavailable.",
      provider: getStatsProvider()
    });
  }
});

registerAuthRoutes(app);
app.use((error, _req, res, _next) => {
  console.error("Rivals Intel API error:", error.message);
  const isCorsError = error.message === "This origin is not allowed by Rivals Intel.";
  res.status(isCorsError ? 403 : (error.status || 500)).json({
    error: isCorsError ? "This origin is not allowed." : error.status && error.status < 500 ? error.message : "An unexpected server error occurred."
  });
});

async function start() {
  if (process.env.DATABASE_URL) {
    await initialiseAuth();
    console.log("Rivals Intel account database is ready.");
  } else {
    console.warn("DATABASE_URL is missing. Stats endpoints are available; account endpoints are not configured.");
  }
  console.log("Rivals Intel stats provider: " + getStatsProvider());
  app.listen(port, "0.0.0.0", () => console.log("Rivals Intel API listening on http://localhost:" + port));
}
if (process.env.NODE_ENV !== "test") {
  start().catch((error) => {
    console.error("Could not start Rivals Intel API:", error.message);
    process.exit(1);
  });
}
