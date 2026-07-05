import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as Lucide from "lucide-react";
import { api } from "../api";
import { useGeo } from "../geo";
import { useLang } from "../i18n";
import { formatBudget, stripHtml, TaskCard } from "../components/TaskCard";
import { SeoHead } from "../components/Layout";

// Override default Leaflet icons (the bundled icons reference local paths that fail under webpack)
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createMarkerIcon(count, isSingle = false, label = "", budget = "") {
  const html = isSingle
    ? `<div style="background:#fff;border:1px solid #ddd;border-radius:10px;padding:4px 8px;box-shadow:0 2px 8px rgba(0,0,0,.15);max-width:150px"><div style="font-size:11px;font-weight:700;line-height:1.2;color:#111">${escapeHtml(label)}</div>${budget ? `<div style="font-size:10px;margin-top:2px;color:#444">${escapeHtml(budget)}</div>` : ""}</div>`
    : `<div style="background:#000;color:#fff;border:3px solid #fff;border-radius:9999px;min-width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;box-shadow:0 4px 14px rgba(0,0,0,.35);padding:0 6px">${count > 99 ? "99+" : count}</div>`;
  return L.divIcon({ html, className: "", iconSize: [44, 44], iconAnchor: [22, 22] });
}

function FlyToLocation({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo([coords.lat, coords.lng], 12, { duration: 0.8 });
  }, [coords, map]);
  return null;
}

export default function MapView() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { coords, request } = useGeo();
  const [params] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
  }, []);

  useEffect(() => {
    const queryParams = new URLSearchParams();
    if (params.get("category")) queryParams.set("category", params.get("category"));
    if (params.get("q")) queryParams.set("q", params.get("q"));
    if (coords) {
      queryParams.set("lat", coords.lat);
      queryParams.set("lng", coords.lng);
    }
    api.get(`/tasks?${queryParams.toString()}`).then((r) => setTasks(r.data));
  }, [params, coords]);

  const center = coords ? [coords.lat, coords.lng] : [55.7558, 37.6173]; // Moscow default
  const withCoords = tasks.filter((t) => t.lat && t.lng);

  return (
    <div className="flex flex-col h-full bg-white relative" data-testid="map-page">
      <SeoHead title="Карта заданий Treabo" description="Задания и заказы на карте" />
      {/* Toggle header overlay */}
      <div className="absolute top-5 left-5 z-[400] flex items-center gap-3">
        <div className="bg-lavender-100 rounded-full p-1 flex items-center shadow-md">
          <button
            data-testid="map-view-list-btn"
            onClick={() => navigate("/tasks" + (params.toString() ? `?${params.toString()}` : ""))}
            className="px-5 py-2 rounded-full text-neutral-500 text-sm font-bold hover:text-black"
          >{t("list_view")}</button>
          <button
            data-testid="map-view-map-btn"
            className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold shadow-sm"
          >{t("map_view")}</button>
        </div>
      </div>

      {/* Locate me button */}
      <button
        data-testid="locate-me-btn"
        onClick={request}
        className="absolute bottom-[260px] right-5 z-[400] w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-lavender-50 transition-colors"
      >
        <Lucide.Navigation size={20} className="text-black" />
      </button>

      {/* Count badge */}
      <button
        data-testid="map-list-count"
        onClick={() => navigate("/tasks" + (params.toString() ? `?${params.toString()}` : ""))}
        className="absolute bottom-[260px] left-5 z-[400] bg-white rounded-full shadow-lg px-4 h-12 flex items-center gap-2 text-sm font-bold hover:bg-lavender-50"
      >
        <Lucide.List size={18} />
        {tasks.length} {t("orders_count")}
      </button>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={center} zoom={11} className="h-full w-full" style={{ minHeight: "100%", zIndex: 1 }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png"
          />
          {coords && <FlyToLocation coords={coords} />}
          {withCoords.map((task) => (
            <Marker
              key={task.id}
              position={[task.lat, task.lng]}
              icon={createMarkerIcon(1, true, stripHtml(task.title), formatBudget(task) || "")}
              eventHandlers={{ click: () => setSelected(task) }}
            >
              <Popup>
                <div className="font-bold text-sm">{stripHtml(task.title)}</div>
                {formatBudget(task) && <div className="text-xs">{formatBudget(task)}</div>}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Bottom sheet */}
      <div className="bg-lavender-50 rounded-t-3xl shadow-2xl p-3 max-h-[240px] overflow-y-auto -mt-4 relative z-10">
        <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mb-3" />
        {selected ? (
          <div onClick={() => setSelected(null)}>
            <TaskCard task={selected} categories={categories} onClick={() => navigate(`/tasks/${selected.id}`)} showLink />
          </div>
        ) : tasks.length > 0 ? (
          <TaskCard task={tasks[0]} categories={categories} onClick={() => navigate(`/tasks/${tasks[0].id}`)} showLink />
        ) : (
          <p className="text-center text-sm text-neutral-400 py-4">{t("no_tasks")}</p>
        )}
      </div>
    </div>
  );
}
