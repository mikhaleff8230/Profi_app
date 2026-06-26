import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Базовый URL API без суффикса /api (например https://api.treabo.ru или http://192.168.0.5:8001).
 * Задаётся в .env: EXPO_PUBLIC_API_URL
 */
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");

/** Публичный URL файла с бэкенда (как на веб: /api/files/...) */
export function fileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  return `${API_BASE}/api/files/${path}`;
}

/** Multipart загрузка (аватар и т.п.) */
export async function apiUploadFile(uri: string, mime = "image/jpeg", filename = "upload.jpg"): Promise<{ path: string }> {
  const token = await getToken();
  const form = new FormData();
  form.append("file", { uri, name: filename, type: mime } as any);
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/uploads`, { method: "POST", headers, body: form });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!res.ok) {
    const msg = errorMessage(data, res.status);
    throw new Error(msg);
  }
  return data;
}

const TOKEN_KEY = "proffi_jwt";

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (Platform.OS === "web") {
    if (token) {
      globalThis.localStorage?.setItem(TOKEN_KEY, token);
    } else {
      globalThis.localStorage?.removeItem(TOKEN_KEY);
    }
    return;
  }
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      /* key missing */
    }
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<any> {
  const { auth = true, ...fetchOpts } = options;
  const headers = new Headers(fetchOpts.headers);
  if (fetchOpts.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = await getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API_BASE}/api${path}`, { ...fetchOpts, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(errorMessage(data, res.status));
  }
  return data;
}

function errorMessage(data: any, status: number): string {
  const d = data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x: any) => x?.msg || JSON.stringify(x)).join(", ");
  if (typeof data?.message === "string") return data.message;
  if (data?.errors && typeof data.errors === "object") {
    const parts = Object.values(data.errors).flat().filter(Boolean).map(String);
    if (parts.length) return parts.join(", ");
  }
  return `HTTP ${status}`;
}
