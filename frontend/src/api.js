import axios from "axios";

function trimTrailingSlash(url) {
  return url.replace(/\/+$/, "");
}

function resolveBackendUrl() {
  const explicit = process.env.REACT_APP_API_URL?.trim() || process.env.REACT_APP_BACKEND_URL?.trim();
  if (explicit) return trimTrailingSlash(explicit);

  const backendPort = process.env.REACT_APP_API_PORT || process.env.REACT_APP_BACKEND_PORT || "8001";
  const browserHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `http://${browserHost}:${backendPort}`;
}

const BACKEND_URL = resolveBackendUrl();
export const API = `${trimTrailingSlash(BACKEND_URL)}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function formatApiError(err) {
  const d = err?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  if (d?.msg) return d.msg;
  return err?.message || "Network error";
}
