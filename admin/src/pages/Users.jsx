import { useEffect, useState } from "react";
import { api } from "../services/api.js";

export default function Users() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("customer");
  const [city, setCity] = useState("");

  async function load() {
    setErr("");
    try {
      const r = await api.get("/api/admin/users");
      setRows(r.data);
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/api/admin/users", { phone, password, name, role, city: city || null });
      setPhone("");
      setPassword("");
      setName("");
      setCity("");
      await load();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  }

  async function del(id) {
    if (!confirm("Удалить пользователя?")) return;
    setErr("");
    try {
      await api.delete(`/api/admin/users/${encodeURIComponent(id)}`);
      await load();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 1rem", fontSize: "1.35rem", fontWeight: 600 }}>Users</h1>
      <form className="card" onSubmit={create} style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Создать</div>
        <div className="row">
          <div className="field">
            <label>Телефон</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+373..." required />
          </div>
          <div className="field">
            <label>Пароль</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} />
          </div>
          <div className="field">
            <label>Имя</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field" style={{ flex: "0 0 140px" }}>
            <label>Роль</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="customer">customer</option>
              <option value="specialist">specialist</option>
            </select>
          </div>
          <div className="field">
            <label>Город</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <button type="submit" className="primary">
            Добавить
          </button>
        </div>
      </form>
      {err ? <div className="err" style={{ marginBottom: "0.75rem" }}>{String(err)}</div> : null}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>phone</th>
              <th>name</th>
              <th>role</th>
              <th>city</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="muted" style={{ fontSize: "0.8rem", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {u.id}
                </td>
                <td>{u.phone}</td>
                <td>{u.name}</td>
                <td>{u.role}</td>
                <td>{u.city || "—"}</td>
                <td style={{ width: 90 }}>
                  <button type="button" className="danger" onClick={() => del(u.id)}>
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
