import { useEffect, useState } from "react";
import { api } from "../services/api.js";

export default function Categories() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [id, setId] = useState("");
  const [icon, setIcon] = useState("Wrench");
  const [nameRu, setNameRu] = useState("");
  const [nameRo, setNameRo] = useState("");

  async function load() {
    setErr("");
    try {
      const r = await api.get("/api/admin/categories");
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
      await api.post("/api/admin/categories", {
        id: id.trim(),
        icon: icon.trim() || "MoreHorizontal",
        name_ru: nameRu.trim(),
        name_ro: nameRo.trim(),
      });
      setId("");
      setIcon("Wrench");
      setNameRu("");
      setNameRo("");
      await load();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  }

  async function del(cid) {
    if (!confirm("Удалить категорию из БД?")) return;
    setErr("");
    try {
      await api.delete(`/api/admin/categories/${encodeURIComponent(cid)}`);
      await load();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 1rem", fontSize: "1.35rem", fontWeight: 600 }}>Categories</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Документы в MongoDB <code>categories</code>. Пустая коллекция → публичный <code>/api/categories</code> отдаёт статический список.
      </p>
      <form className="card" onSubmit={create} style={{ margin: "1rem 0 1.5rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Добавить</div>
        <div className="row">
          <div className="field" style={{ flex: "0 0 140px" }}>
            <label>id</label>
            <input value={id} onChange={(e) => setId(e.target.value)} required />
          </div>
          <div className="field" style={{ flex: "0 0 140px" }}>
            <label>icon</label>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} />
          </div>
          <div className="field">
            <label>name_ru</label>
            <input value={nameRu} onChange={(e) => setNameRu(e.target.value)} required />
          </div>
          <div className="field">
            <label>name_ro</label>
            <input value={nameRo} onChange={(e) => setNameRo(e.target.value)} required />
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
              <th>icon</th>
              <th>name_ru</th>
              <th>name_ro</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td className="muted">{c.icon}</td>
                <td>{c.name_ru}</td>
                <td>{c.name_ro}</td>
                <td style={{ width: 90 }}>
                  <button type="button" className="danger" onClick={() => del(c.id)}>
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
