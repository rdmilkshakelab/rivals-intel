import { API } from "mrivals";

const selectedProvider = (process.env.STATS_PROVIDER || "mrivals").toLowerCase();
const cache = new Map();
const cacheTtl = Math.max(30, Number(process.env.STATS_CACHE_SECONDS || 300)) * 1000;
const maxCacheEntries = 500;

function providerError(message, status = 502) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function remember(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + cacheTtl });
  if (cache.size > maxCacheEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
}

async function marvelRivalsApi(path) {
  const apiKey = process.env.MARVEL_RIVALS_API_KEY;
  if (!apiKey) throw providerError("MarvelRivalsAPI is selected but MARVEL_RIVALS_API_KEY is not configured.", 503);
  const response = await fetch("https://marvelrivalsapi.com/api/v1" + path, {
    headers: { "x-api-key": apiKey, accept: "application/json" },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw providerError("MarvelRivalsAPI returned HTTP " + response.status + ".", response.status);
  return response.json();
}

async function mrivalsProfile(username) {
  const options = {};
  if (process.env.MRIVALS_FLARESOLVERR_URL) options.flaresolverrUrl = process.env.MRIVALS_FLARESOLVERR_URL;
  else if (process.env.MRIVALS_USE_CURL === "true") options.useCurl = true;

  const user = await API.fetchUser(username, options);
  return {
    provider: "mrivals",
    username,
    info: user.info(),
    overview: user.overview(),
    heroes: user.heroes(),
    roles: user.roles(),
    peakRank: user.peakRank(),
    source: "Tracker Network via mrivals",
    fetchedAt: new Date().toISOString()
  };
}

export function getStatsProvider() {
  return selectedProvider;
}

export async function getPlayerProfile(username) {
  const key = selectedProvider + ":profile:" + username.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { ...cached.value, cached: true };

  let result;
  if (selectedProvider === "mrivals") {
    result = await mrivalsProfile(username);
  } else if (selectedProvider === "marvelrivalsapi") {
    const raw = await marvelRivalsApi("/player/" + encodeURIComponent(username));
    result = { provider: "marvelrivalsapi", ...raw, source: "MarvelRivalsAPI", fetchedAt: new Date().toISOString() };
  } else {
    throw providerError("Unknown STATS_PROVIDER. Use mrivals or marvelrivalsapi.", 500);
  }
  remember(key, result);
  return { ...result, cached: false };
}

export async function getPlayerMatchHistory(username, query = {}) {
  if (selectedProvider === "mrivals") {
    throw providerError("Match history is not currently exposed by mrivals. It will return when the primary provider is restored.", 501);
  }
  if (selectedProvider !== "marvelrivalsapi") throw providerError("Unknown STATS_PROVIDER.", 500);
  const params = new URLSearchParams();
  for (const key of ["season", "game_mode", "page", "limit"]) {
    if (query[key] !== undefined) params.set(key, String(query[key]));
  }
  const suffix = params.size ? "?" + params.toString() : "";
  return marvelRivalsApi("/player/" + encodeURIComponent(username) + "/match-history" + suffix);
}

export async function getHeroCatalogue() {
  if (selectedProvider === "mrivals") {
    throw providerError("The mrivals profile wrapper does not expose a global hero catalogue.", 501);
  }
  if (selectedProvider !== "marvelrivalsapi") throw providerError("Unknown STATS_PROVIDER.", 500);
  return marvelRivalsApi("/heroes");
}
