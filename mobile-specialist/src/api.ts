import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Базовый URL API без суффикса /api (например https://api.treabo.ru или http://192.168.0.5:8001).
 * Задаётся в .env: EXPO_PUBLIC_API_URL
 */
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");

export type ApiNamespace = "proffi" | "root";

function resolveApiUrl(path: string, namespace: ApiNamespace = "proffi"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (namespace === "root") return `${API_BASE}/api${normalized}`;
  return `${API_BASE}/api/proffi${normalized}`;
}

/** Публичный URL файла с бэкенда Proffi */
export function fileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("blob:")) return path;
  if (path.startsWith("http")) {
    return path.replace("https://treabo.ru/api/files/", "https://api.treabo.ru/api/proffi/files/");
  }
  if (path.startsWith("/api/proffi/files/")) return `${API_BASE}${path}`;
  if (path.startsWith("/api/files/")) return `${API_BASE}/api/proffi/files/${path.replace(/^\/api\/files\/?/, "")}`;
  return `${API_BASE}/api/proffi/files/${path.replace(/^\/+/, "")}`;
}

/** Multipart загрузка (аватар, фото задания и т.п.) */
export async function apiUploadFile(uri: string, mime = "image/jpeg", filename = "upload.jpg"): Promise<{ path: string; url?: string; mime?: string | null; size?: number | null }> {
  const token = await getToken();
  if (!token) {
    throw new Error("Нужно войти в аккаунт");
  }
  const form = new FormData();
  form.append("file", { uri, name: filename, type: mime } as any);
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(resolveApiUrl("/uploads"), { method: "POST", headers, body: form });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(htmlErrorMessage(text, res.status));
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
  options: RequestInit & { auth?: boolean; namespace?: ApiNamespace } = {}
): Promise<any> {
  const { auth = true, namespace = "proffi", ...fetchOpts } = options;
  const headers = new Headers(fetchOpts.headers);
  if (fetchOpts.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = await getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(resolveApiUrl(path, namespace), { ...fetchOpts, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(htmlErrorMessage(text, res.status));
  }
  if (!res.ok) {
    throw new Error(errorMessage(data, res.status));
  }
  return data;
}

function htmlErrorMessage(text: string, status: number): string {
  if (/<html[\s>]/i.test(text) || /<!doctype html/i.test(text)) {
    return status >= 500
      ? "Сервер вернул ошибку. Проверьте API/миграции и повторите."
      : `Ошибка API HTTP ${status}`;
  }
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return clean || `HTTP ${status}`;
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
