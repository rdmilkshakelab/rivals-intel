import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient, type User } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://yqoyksfsiqmnjnnbrzun.supabase.co";
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ5cW95a3Nmc2lxbW5qbm5icnp1biIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzkzOTk1MTUzLCJleHAiOjIxMDk1NzExNTN9.YTvzjjv0zGeqJKROFfnmZ7nmXMMnSfI_wxdobd2BbT0";
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key)
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: Platform.OS === "web" ? undefined : secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web"
  }
});

function ensureSupabaseKey() {
  if (!SUPABASE_KEY) throw new Error("Supabase is not configured in this website build. Add EXPO_PUBLIC_SUPABASE_ANON_KEY to the GitHub Actions variables and rebuild.");
}

function ensureApi() {
  if (!API_BASE) throw new Error("Device management needs the Rivals Intel API. Account sign-in works independently.");
}

async function accountFromUser(user: User): Promise<AccountUser> {
  const { data } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  return {
    id: user.id,
    email: user.email ?? "",
    username: data?.username ?? String(user.user_metadata?.username ?? user.email?.split("@")[0] ?? "player"),
    twoFactorEnabled: Boolean(user.factors?.some((factor) => factor.status === "verified"))
  };
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  ensureApi();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  if (session?.access_token) headers.set("Authorization", "Bearer " + session.access_token);
  const response = await fetch(API_BASE + path, { ...options, headers, credentials: "include" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || ("Request failed (" + response.status + ")."));
  return payload as T;
}

export async function registerAccount(email: string, username: string, password: string) {
  ensureSupabaseKey();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) throw new Error("Username must be 3–20 characters and use only letters, numbers or underscores.");
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { username }, emailRedirectTo: Platform.OS === "web" ? window.location.origin + "/rivals-intel/" : "rivalsintel://auth/callback" }
  });
  if (error) throw error;
  if (!data.user) throw new Error("Supabase did not return an account.");
  if (!data.session) return { user: await accountFromUser(data.user), token: "" , confirmationRequired: true };
  return { user: await accountFromUser(data.user), token: data.session.access_token, confirmationRequired: false };
}

export async function loginAccount(email: string, password: string, extra: { totpCode?: string; recoveryCode?: string } = {}) {
  ensureSupabaseKey();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  if (extra.recoveryCode) {
    await supabase.auth.signOut();
    throw new Error("Recovery-code sign-in is not available yet. Use your password and authenticator code.");
  }
  if (data.user.factors?.some((factor) => factor.status === "verified")) {
    const factor = data.user.factors.find((item) => item.status === "verified");
    if (factor && extra.totpCode) {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: extra.totpCode });
      if (verifyError) throw verifyError;
    } else {
      await supabase.auth.signOut();
      throw new Error("This account has an authenticator enabled. Complete authenticator verification to finish signing in.");
    }
  }
  return { user: await accountFromUser(data.user), token: data.session.access_token };
}

export async function logoutAccount() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getAccount() {
  ensureSupabaseKey();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error ?? new Error("Not signed in.");
  return { user: await accountFromUser(data.user) };
}

export async function getDevices() { return apiRequest<{ devices: DeviceSession[] }>("/api/account/devices"); }
export async function revokeDevice(id: string) { return apiRequest<{ ok: boolean }>("/api/account/devices/" + encodeURIComponent(id), { method: "DELETE" }); }
export async function renameDevice(id: string, name: string) { return apiRequest<{ ok: boolean }>("/api/account/devices/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify({ name }) }); }
export async function signOutOtherDevices() { return apiRequest<{ ok: boolean }>("/api/account/devices/sign-out-others", { method: "POST" }); }

export async function beginAuthenticatorSetup() {
  ensureSupabaseKey();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "Rivals Intel" });
  if (error) throw error;
  return { secret: data.totp.secret, otpauthUri: data.totp.uri, qrCodeDataUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data.totp.qr_code), factorId: data.id };
}
export async function confirmAuthenticator(code: string) {
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) throw listError;
  const factor = factors.all.find((item) => String(item.status) === "unverified" && item.factor_type === "totp");
  if (!factor) throw new Error("Start authenticator setup again to generate a new QR code.");
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challengeError) throw challengeError;
  const { error } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code });
  if (error) throw error;
  return { enabled: true, recoveryCodes: [] };
}
export async function disableAuthenticator(password: string, code: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) throw userError ?? new Error("Sign in again before changing authenticator settings.");
  if (!password || !/^\d{6}$/.test(code)) throw new Error("Enter your account password and current six-digit authenticator code.");
  const { error: passwordError } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (passwordError) throw new Error("The account password was not accepted.");
  const { data: factors, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const factor = factors.totp.find((item) => item.status === "verified");
  if (!factor) throw new Error("No verified authenticator was found.");
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challengeError) throw challengeError;
  const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code });
  if (verifyError) throw new Error("The authenticator code was not accepted.");
  const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
  if (unenrollError) throw unenrollError;
  return { enabled: false };
}
export async function approveDevice(userCode: string) { return apiRequest<{ approved: boolean; deviceName: string }>("/api/device/approve", { method: "POST", body: JSON.stringify({ userCode }) }); }
export async function createDeviceAuthorisation(deviceName: string) { return apiRequest<{ deviceCode: string; userCode: string; verificationUri: string; qrCodeDataUrl: string; expiresIn: number; interval: number }>("/api/device/authorise", { method: "POST", body: JSON.stringify({ deviceName }) }); }
export async function pollDeviceAuthorisation(deviceCode: string) { return apiRequest<{ status: "pending" | "complete"; token?: string; expiresAt?: string }>("/api/device/poll", { method: "POST", body: JSON.stringify({ deviceCode }) }); }

export type AccountUser = { id: string; email: string; username: string; twoFactorEnabled: boolean };
export type DeviceSession = { id: string; name: string; user_agent: string; created_at: string; last_seen_at: string; expires_at: string; current: boolean };
