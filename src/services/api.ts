import type { PlayerSummary } from "./demo";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export async function fetchPlayer(query: string): Promise<PlayerSummary> {
  if (!API_BASE_URL) {
    throw new Error("API proxy is not configured. Set EXPO_PUBLIC_API_BASE_URL.");
  }

  const response = await fetch(`${API_BASE_URL}/api/player/${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error(`Player lookup failed (${response.status}).`);
  }

  const payload = await response.json();
  // The upstream API response can evolve. The proxy normalises it to this stable app shape.
  if (!payload?.player) {
    throw new Error("The stats service returned an unexpected response.");
  }
  return payload.player as PlayerSummary;
}