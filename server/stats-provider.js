import { API } from "mrivals";

const PROFILE_TIMEOUT_MS = Math.max(1000, Number(process.env.STATS_PROFILE_TIMEOUT_MS || 15000));

function providerError(message, status = 502) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function withTimeout(promise, timeoutMs, providerName) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(providerError(providerName + " did not respond within " + timeoutMs + "ms.", 504)), timeoutMs);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function readMrivalsUser(user, username) {
  const read = (method) => {
    try {
      return typeof user?.[method] === "function" ? user[method]() : null;
    } catch {
      return null;
    }
  };

  const info = read("info");
  const overview = read("overview");
  if (!info || !overview) {
    throw providerError("The upstream profile response was incomplete. Please try again later.", 502);
  }

  return {
    provider: "mrivals",
    username,
    info,
    overview,
    heroes: read("heroes") ?? {},
    roles: read("roles") ?? {},
    peakRank: read("peakRank") ?? {},
    source: "Tracker Network via mrivals",
    fetchedAt: new Date().toISOString()
  };
}

export function createStatsService({
  providerName = (process.env.STATS_PROVIDER || "mrivals").toLowerCase(),
  mrivalsClient = API,
  fetchImpl = fetch,
  env = process.env,
  now = () => Date.now()
} = {}) {
  const cache = new Map();
  const inFlight = new Map();
  const cacheTtl = Math.max(30, Number(env.STATS_CACHE_SECONDS || 300)) * 1000;
  const maxCacheEntries = 500;

  async function marvelRivalsApi(path) {
    const apiKey = env.MARVEL_RIVALS_API_KEY;
    if (!apiKey) throw providerError("MarvelRivalsAPI is selected but MARVEL_RIVALS_API_KEY is not configured.", 503);
    let response;
    try {
      response = await fetchImpl("https://marvelrivalsapi.com/api/v1" + path, {
        headers: { "x-api-key": apiKey, accept: "application/json" },
        signal: AbortSignal.timeout(15000)
      });
    } catch (error) {
      if (error?.name === "TimeoutError" || error?.name === "AbortError") {
        throw providerError("MarvelRivalsAPI timed out. Please try again.", 504);
      }
      throw providerError("MarvelRivalsAPI could not be reached. Please try again later.", 502);
    }
    if (!response.ok) {
      if (response.status === 404) throw providerError("The public player profile was not found.", 404);
      if (response.status === 429) throw providerError("The upstream stats provider is rate-limiting requests. Please try again shortly.", 503);
      if (response.status >= 500) throw providerError("The upstream stats provider is temporarily unavailable.", 502);
      throw providerError("MarvelRivalsAPI rejected the request (HTTP " + response.status + ").", 502);
    }
    try {
      return await response.json();
    } catch {
      throw providerError("The upstream stats provider returned invalid JSON.", 502);
    }
  }

  async function fetchMrivalsProfile(username) {
    const options = {};
    if (env.MRIVALS_FLARESOLVERR_URL) options.flaresolverrUrl = env.MRIVALS_FLARESOLVERR_URL;
    else if (env.MRIVALS_USE_CURL === "true") options.useCurl = true;

    try {
      const user = await withTimeout(mrivalsClient.fetchUser(username, options), PROFILE_TIMEOUT_MS, "Tracker Network");
      return readMrivalsUser(user, username);
    } catch (error) {
      if (error.status) throw error;
      const message = String(error?.message || "");
      if (/not found|could not find|does not exist|404/i.test(message)) {
        throw providerError("The public player profile was not found.", 404);
      }
      if (/429|rate.?limit|too many requests/i.test(message)) {
        throw providerError("The upstream stats provider is rate-limiting requests. Please try again shortly.", 503);
      }
      throw providerError("Tracker Network could not provide this profile. Please try again later.", 502);
    }
  }

  async function loadProfile(username) {
    if (providerName === "mrivals") return fetchMrivalsProfile(username);
    if (providerName === "marvelrivalsapi") {
      const raw = await marvelRivalsApi("/player/" + encodeURIComponent(username));
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw providerError("The upstream stats provider returned an invalid profile.", 502);
      }
      return { provider: "marvelrivalsapi", ...raw, source: "MarvelRivalsAPI", fetchedAt: new Date().toISOString() };
    }
    throw providerError("Unknown STATS_PROVIDER. Use mrivals or marvelrivalsapi.", 500);
  }

  async function getPlayerProfile(username) {
    const normalisedUsername = String(username || "").trim();
    const key = providerName + ":profile:" + normalisedUsername.toLowerCase();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now()) {
      return { ...cached.value, cached: true };
    }
    if (cached) cache.delete(key);

    if (inFlight.has(key)) {
      const result = await inFlight.get(key);
      return { ...result, cached: true };
    }

    const request = loadProfile(normalisedUsername);
    inFlight.set(key, request);
    try {
      const result = await request;
      cache.set(key, { value: result, expiresAt: now() + cacheTtl });
      if (cache.size > maxCacheEntries) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
      }
      return { ...result, cached: false };
    } finally {
      inFlight.delete(key);
    }
  }

  async function getPlayerMatchHistory(username, query = {}) {
    if (providerName === "mrivals") {
      throw providerError("Match history is not currently exposed by the active provider.", 501);
    }
    if (providerName !== "marvelrivalsapi") throw providerError("Unknown STATS_PROVIDER.", 500);
    const params = new URLSearchParams();
    for (const key of ["season", "game_mode", "page", "limit"]) {
      if (query[key] !== undefined) params.set(key, String(query[key]));
    }
    const suffix = params.size ? "?" + params.toString() : "";
    return marvelRivalsApi("/player/" + encodeURIComponent(username) + "/match-history" + suffix);
  }

  async function getHeroCatalogue() {
    if (providerName === "mrivals") {
      throw providerError("The active provider does not expose a global hero catalogue.", 501);
    }
    if (providerName !== "marvelrivalsapi") throw providerError("Unknown STATS_PROVIDER.", 500);
    return marvelRivalsApi("/heroes");
  }

  return {
    getStatsProvider: () => providerName,
    getPlayerProfile,
    getPlayerMatchHistory,
    getHeroCatalogue
  };
}

const defaultService = createStatsService();

export const getStatsProvider = defaultService.getStatsProvider;
export const getPlayerProfile = defaultService.getPlayerProfile;
export const getPlayerMatchHistory = defaultService.getPlayerMatchHistory;
export const getHeroCatalogue = defaultService.getHeroCatalogue;
