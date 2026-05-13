import axios from "axios";

const baseURL = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

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
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);
