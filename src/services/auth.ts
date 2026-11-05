import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const TOKEN_KEY = "rivals-intel-session";

async function getToken() {
  if (Platform.OS === "web") return typeof localStorage === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}
async function saveToken(token: string) {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}
async function clearToken() {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE) throw new Error("Set EXPO_PUBLIC_API_BASE_URL before using Rivals Intel accounts.");
  const token = await getToken();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", \`Bearer \${token}\`);
  const response = await fetch(\`\${API_BASE}\${path}\`, { ...options, headers, credentials: "include" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || \`Request failed (\${response.status}).\`);
  if (payload.token) await saveToken(payload.token);
  return payload as T;
}

export async function registerAccount(email: string, username: string, password: string) {
  return authRequest<{ user: AccountUser; token: string }>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, username, password }) });
}
export async function loginAccount(email: string, password: string, extra: { totpCode?: string; recoveryCode?: string } = {}) {
  return authRequest<{ user: AccountUser; token: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password, ...extra }) });
}
export async function logoutAccount() {
  try { await authRequest("/api/auth/logout", { method: "POST" }); } finally { await clearToken(); }
}
export async function getAccount() {
  return authRequest<{ user: AccountUser }>("/api/auth/me");
}
export async function getDevices() {
  return authRequest<{ devices: DeviceSession[] }>("/api/account/devices");
}
export async function revokeDevice(id: string) {
  return authRequest<{ ok: boolean }>(\`/api/account/devices/\${encodeURIComponent(id)}\`, { method: "DELETE" });
}
export async function signOutOtherDevices() {
  return authRequest<{ ok: boolean }>("/api/account/devices/sign-out-others", { method: "POST" });
}
export async function beginAuthenticatorSetup() {
  return authRequest<{ secret: string; otpauthUri: string; qrCodeDataUrl: string }>("/api/account/totp/setup", { method: "POST" });
}
export async function confirmAuthenticator(code: string) {
  return authRequest<{ enabled: boolean; recoveryCodes: string[] }>("/api/account/totp/confirm", { method: "POST", body: JSON.stringify({ code }) });
}
export async function disableAuthenticator(password: string, code: string) {
  return authRequest<{ enabled: boolean }>("/api/account/totp/disable", { method: "POST", body: JSON.stringify({ password, code }) });
}
export async function approveDevice(userCode: string) {
  return authRequest<{ approved: boolean; deviceName: string }>("/api/device/approve", { method: "POST", body: JSON.stringify({ userCode }) });
}
export async function clearAccountToken() {
  await clearToken();
}
export type AccountUser = { id: string; email: string; username: string; twoFactorEnabled: boolean };
export type DeviceSession = { id: string; name: string; user_agent: string; created_at: string; last_seen_at: string; expires_at: string; current: boolean };
