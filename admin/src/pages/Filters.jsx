import { useEffect, useState } from "react";
import { api } from "../services/api.js";

export default function Filters() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");

  async function load() {
    setErr("");
    try {
      const r = await api.get("/api/admin/filters");
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
      const body = { name: name.trim(), key: key.trim(), value: value.trim() };
      if (id.trim()) body.id = id.trim();
      await api.post("/api/admin/filters", body);
      setId("");
      setName("");
      setKey("");
      setValue("");
      await load();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  }

  function startEdit(f) {
    setEditId(f.id);
    setEditName(f.name);
    setEditKey(f.key);
    setEditValue(f.value);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.put(`/api/admin/filters/${encodeURIComponent(editId)}`, {
        name: editName,
        key: editKey,
        value: editValue,
      });
      setEditId(null);
      await load();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  }

  async function del(fid) {
    if (!confirm("Удалить фильтр?")) return;
    setErr("");
    try {
      await api.delete(`/api/admin/filters/${encodeURIComponent(fid)}`);
      await load();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 1rem", fontSize: "1.35rem", fontWeight: 600 }}>Filters</h1>
      <form className="card" onSubmit={create} style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Создать</div>
        <div className="row">
          <div className="field" style={{ flex: "0 0 160px" }}>
            <label>id (опционально)</label>
            <input value={id} onChange={(e) => setId(e.target.value)} />
          </div>
          <div className="field">
            <label>name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>key</label>
            <input value={key} onChange={(e) => setKey(e.target.value)} required />
          </div>
          <div className="field">
            <label>value</label>
            <input value={value} onChange={(e) => setValue(e.target.value)} required />
          </div>
          <button type="submit" className="primary">
            Добавить
          </button>
        </div>
      </form>
      {err ? <div className="err" style={{ marginBottom: "0.75rem" }}>{String(err)}</div> : null}

      {editId ? (
        <form className="card" onSubmit={saveEdit} style={{ marginBottom: "1rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Редактировать {editId}</div>
          <div className="row">
            <div className="field">
              <label>name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div className="field">
              <label>key</label>
              <input value={editKey} onChange={(e) => setEditKey(e.target.value)} required />
            </div>
            <div className="field">
              <label>value</label>
              <input value={editValue} onChange={(e) => setEditValue(e.target.value)} required />
            </div>
            <button type="submit" className="primary">
              Сохранить
            </button>
            <button type="button" className="ghost" onClick={() => setEditId(null)}>
              Отмена
            </button>
          </div>
        </form>
      ) : null}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>name</th>
              <th>key</th>
              <th>value</th>
              <th>created_at</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id}>
                <td className="muted" style={{ fontSize: "0.8rem", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {f.id}
                </td>
                <td>{f.name}</td>
                <td>{f.key}</td>
                <td>{f.value}</td>
                <td className="muted" style={{ fontSize: "0.8rem" }}>
                  {f.created_at || "—"}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button type="button" className="ghost" style={{ marginRight: 6 }} onClick={() => startEdit(f)}>
                    Изм.
                  </button>
                  <button type="button" className="danger" onClick={() => del(f.id)}>
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
