import "dotenv/config";
import express from "express";
import cors from "cors";
import { initialiseAuth, registerAuthRoutes } from "./auth.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const apiKey = process.env.MARVEL_RIVALS_API_KEY;
const upstream = "https://marvelrivalsapi.com/api/v1";
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "").split(",").map((value) => value.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("This origin is not allowed by Rivals Intel."));
  },
  credentials: true
}));
app.use(express.json({ limit: "32kb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "rivals-intel-api", accountsConfigured: Boolean(process.env.DATABASE_URL) }));

async function upstreamGet(path) {
  if (!apiKey) {
    const error = new Error("MARVEL_RIVALS_API_KEY is not configured on the server.");
    error.status = 503;
    throw error;
  }
  const response = await fetch(\`\${upstream}\${path}\`, {
    headers: { "x-api-key": apiKey, accept: "application/json" }
  });
  if (!response.ok) {
    const error = new Error(\`MarvelRivalsAPI returned \${response.status}.\`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

app.get("/api/player/:query", async (req, res) => {
  try {
    const raw = await upstreamGet(\`/player/\${encodeURIComponent(req.params.query)}\`);
    res.json({ player: raw });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "Upstream request failed." });
  }
});

app.get("/api/player/:query/match-history", async (req, res) => {
  try {
    const params = new URLSearchParams();
    for (const key of ["season", "game_mode", "page", "limit"]) {
      if (req.query[key] !== undefined) params.set(key, String(req.query[key]));
    }
    const suffix = params.size ? \`?\${params.toString()}\` : "";
    const raw = await upstreamGet(\`/player/\${encodeURIComponent(req.params.query)}/match-history\${suffix}\`);
    res.json(raw);
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "Upstream request failed." });
  }
});

app.get("/api/heroes", async (_req, res) => {
  try {
    res.json(await upstreamGet("/heroes"));
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "Upstream request failed." });
  }
});

registerAuthRoutes(app);

app.use((error, _req, res, _next) => {
  console.error("Rivals Intel API error:", error.message);
  res.status(error.status || 500).json({ error: error.status && error.status < 500 ? error.message : "An unexpected server error occurred." });
});

async function start() {
  if (process.env.DATABASE_URL) {
    await initialiseAuth();
    console.log("Rivals Intel account database is ready.");
  } else {
    console.warn("DATABASE_URL is missing. Stats endpoints are available; account endpoints are not configured.");
  }
  app.listen(port, "0.0.0.0", () => {
    console.log(\`Rivals Intel API listening on http://localhost:\${port}\`);
  });
}

start().catch((error) => {
  console.error("Could not start Rivals Intel API:", error.message);
  process.exit(1);
});
