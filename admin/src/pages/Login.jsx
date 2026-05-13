import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";

export default function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState("admin");
  const [password, setPassword] = useState(() => import.meta.env.VITE_ADMIN_TOKEN || "admin");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("admin_token")?.trim();
    if (!t) return;
    let cancelled = false;
    (async () => {
      try {
        await api.get("/api/admin/stats");
        if (!cancelled) navigate("/", { replace: true });
      } catch {
        localStorage.removeItem("admin_token");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (user.trim() !== "admin") {
      setErr("Неверный логин");
      return;
    }
    const token = password.trim();
    if (!token) {
      setErr("Введите пароль (токен)");
      return;
    }
    setLoading(true);
    try {
      localStorage.setItem("admin_token", token);
      await api.get("/api/admin/stats");
      navigate("/", { replace: true });
    } catch (ex) {
      localStorage.removeItem("admin_token");
      const status = ex.response?.status;
      const detail = ex.response?.data?.detail;
      if (status === 401) {
        setErr("Неверный токен — должен совпадать с ADMIN_TOKEN в .env бэкенда.");
      } else if (!ex.response) {
        setErr(
          "Нет ответа от API. Убедитесь, что основной сайт доступен и CORS разрешает admin-домен, либо задайте VITE_API_BASE при сборке."
        );
      } else {
        setErr(typeof detail === "string" ? detail : ex.message || "Ошибка запроса");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100%", display: "grid", placeItems: "center", padding: 24 }}>
      <form className="card" onSubmit={submit} style={{ width: "min(380px, 100%)" }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem" }}>Вход</h1>
        <p className="muted" style={{ margin: "0 0 1.25rem", fontSize: "0.9rem" }}>
          Логин <code>admin</code>, пароль = токен бэкенда (<code>ADMIN_TOKEN</code>).
        </p>
        <div className="field" style={{ marginBottom: "0.75rem" }}>
          <label>Логин</label>
          <input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" />
        </div>
        <div className="field" style={{ marginBottom: "1rem" }}>
          <label>Пароль (токен)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {err ? <div className="err">{err}</div> : null}
        <button type="submit" className="primary" style={{ width: "100%", marginTop: "1rem" }} disabled={loading}>
          {loading ? "Проверка…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
