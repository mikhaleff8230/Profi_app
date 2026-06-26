import * as Lucide from "lucide-react";
import { API } from "../api";
import { useLang } from "../i18n";
import { timeAgo } from "./Layout";

export function fileUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  return `${API}/files/${path}`;
}

export function TaskCard({ task, categories = [], onClick }) {
  const { t, lang } = useLang();
  const cat = categories.find((c) => c.id === task.category);
  return (
    <button
      data-testid={`task-card-${task.id}`}
      onClick={onClick}
      className="card-light text-left hover:shadow-md transition-shadow animate-fade-in-up flex flex-col gap-2"
    >
      {/* Time + unread dot */}
      <div className="flex items-center gap-2 text-xs text-neutral-400 font-semibold">
        <span>{timeAgo(task.created_at, t)}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      </div>

      {/* Title */}
      <h3 className="font-extrabold text-lg leading-snug text-black">{task.title}</h3>

      {/* Price line */}
      {task.budget && (
        <p className="font-bold text-base">до {task.budget.toLocaleString()} {t("rub")}</p>
      )}

      {/* Description preview */}
      <p className="text-sm text-neutral-600 line-clamp-3 leading-snug">{task.description}</p>

      {/* Photo gallery (up to 2) */}
      {task.photos?.length > 0 && (
        <div className={`grid gap-1.5 mt-1 ${task.photos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {task.photos.slice(0, 2).map((p, i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl overflow-hidden bg-lavender-100">
              <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      )}

      {/* Footer info rows */}
      <div className="flex flex-col gap-1 text-sm text-neutral-700 mt-1">
        <div className="flex items-center gap-2">
          <Lucide.Home size={14} className="text-neutral-400 shrink-0" />
          <span className="truncate">
            {task.city}{task.address ? `, ${task.address}` : ""}
            {task.distance_km !== null && task.distance_km !== undefined && (
              <span className="text-neutral-400 ml-1">• {task.distance_km} {t("distance_km")}</span>
            )}
          </span>
        </div>
        {task.deadline && (
          <div className="flex items-center gap-2">
            <Lucide.Calendar size={14} className="text-neutral-400 shrink-0" />
            <span>{task.deadline}</span>
          </div>
        )}
        {cat && (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Lucide.Tag size={12} />
            <span>{cat.name_ru}</span>
            <span className="ml-auto flex items-center gap-1"><Lucide.Users size={12} /> {task.applications_count}</span>
          </div>
        )}
      </div>
    </button>
  );
}
