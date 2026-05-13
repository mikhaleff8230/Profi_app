import axios from "axios";

/**
 * Если VITE_API_BASE не задан при сборке, но админка открыта на admin.*,
 * API берём с основного домена (тот же хост без префикса admin.), где Nginx отдаёт /api.
 * Пример: https://admin.proffi.sancan.ru → https://proffi.sancan.ru
 */
function resolveApiBase() {
  const env = (import.meta.env.VITE_API_BASE || "").trim().replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.startsWith("admin.")) {
      return `${window.location.protocol}//${host.slice("admin.".length)}`;
    }
  }
  return "";
}

const baseURL = resolveApiBase();

export const api = axios.create({
  baseURL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("admin_token")?.trim();
  if (t) config.headers["X-Admin-Token"] = t;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("admin_token");
      const path = window.location.pathname || "";
      if (!path.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);
