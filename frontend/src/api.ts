import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AppState, User } from "./types";

const baseUrl = String(
  Constants.expoConfig?.extra?.backendUrl ?? process.env.EXPO_PUBLIC_BACKEND_URL ?? process.env.EXPO_BACKEND_URL ?? "",
).replace(/\/$/, "");
let memoryToken: string | null = null;

export async function readToken() {
  if (memoryToken) return memoryToken;
  memoryToken = Platform.OS === "web" ? window.localStorage.getItem("forgefit_session") : await SecureStore.getItemAsync("forgefit_session");
  return memoryToken;
}

export async function saveToken(token: string) {
  memoryToken = token;
  if (Platform.OS === "web") window.localStorage.setItem("forgefit_session", token);
  else await SecureStore.setItemAsync("forgefit_session", token);
}

export async function clearToken() {
  memoryToken = null;
  if (Platform.OS === "web") window.localStorage.removeItem("forgefit_session");
  else await SecureStore.deleteItemAsync("forgefit_session");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await readToken();
  const response = await fetch(`${baseUrl}/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) },
  });
  if (response.status === 401) {
    await clearToken();
    throw new Error("AUTH_EXPIRED");
  }
  if (!response.ok) throw new Error((await response.text()) || "Request failed");
  return response.json() as Promise<T>;
}

export async function exchangeSession(sessionId: string) {
  const response = await fetch(`${baseUrl}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!response.ok) throw new Error("Google session exchange failed");
  const data = await response.json() as { session_token: string; user: User };
  await saveToken(data.session_token);
  return data.user;
}

export function getMe() { return request<User>("/auth/me"); }
export function getState() { return request<AppState>("/state"); }
export function saveState(state: AppState) { return request<AppState>("/state", { method: "PUT", body: JSON.stringify({ state }) }); }
export function logoutRemote() { return request<{ success: boolean }>("/auth/logout", { method: "POST" }); }