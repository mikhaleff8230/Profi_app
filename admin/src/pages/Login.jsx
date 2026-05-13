import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState("admin");
  const [password, setPassword] = useState(() => import.meta.env.VITE_ADMIN_TOKEN || "admin");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (localStorage.getItem("admin_token")?.trim()) navigate("/", { replace: true });
  }, [navigate]);

  function submit(e) {
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
    localStorage.setItem("admin_token", token);
    navigate("/", { replace: true });
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
        <button type="submit" className="primary" style={{ width: "100%", marginTop: "1rem" }}>
          Войти
        </button>
      </form>
    </div>
  );
}
