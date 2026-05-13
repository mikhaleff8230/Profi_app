import * as SecureStore from "expo-secure-store";

/**
 * Базовый URL API без суффикса /api (например https://proffi.sancan.ru или http://192.168.0.5:8001).
 * Задаётся в .env: EXPO_PUBLIC_API_URL
 */
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");

const TOKEN_KEY = "proffi_jwt";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
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
    const d = data?.detail;
    const msg =
      typeof d === "string"
        ? d
        : Array.isArray(d)
          ? d.map((x: any) => x?.msg || JSON.stringify(x)).join(", ")
          : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
