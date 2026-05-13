import { useEffect, useState } from "react";
import { api } from "../services/api.js";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get("/api/admin/stats")
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.detail || e.message || "Ошибка"));
  }, []);

  return (
    <div>
      <h1 style={{ margin: "0 0 1rem", fontSize: "1.35rem", fontWeight: 600 }}>Dashboard</h1>
      {err ? <div className="err">{String(err)}</div> : null}
      {data ? (
        <div className="grid-stats">
          <div className="stat">
            <div className="num">{data.users}</div>
            <div className="lbl">Users</div>
          </div>
          <div className="stat">
            <div className="num">{data.categories}</div>
            <div className="lbl">Categories (DB)</div>
          </div>
          <div className="stat">
            <div className="num">{data.filters}</div>
            <div className="lbl">Filters</div>
          </div>
        </div>
      ) : !err ? (
        <p className="muted">Загрузка…</p>
      ) : null}
    </div>
  );
}
