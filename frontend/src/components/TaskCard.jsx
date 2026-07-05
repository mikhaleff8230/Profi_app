import * as Lucide from "lucide-react";
import { Link } from "react-router-dom";
import { API } from "../api";
import { useLang } from "../i18n";
import { timeAgo } from "./Layout";

export function stripHtml(value) {
  if (!value) return "";
  return String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export function formatBudget(task) {
  if (task?.budget_label) return task.budget_label;
  if (task?.budget_type === "range") {
    const min = task.budget_min;
    const max = task.budget_max;
    if (min != null && max != null) {
      return `от ${min.toLocaleString("ru-RU")} до ${max.toLocaleString("ru-RU")} ₽`;
    }
    if (min != null) return `от ${min.toLocaleString("ru-RU")} ₽`;
  }
  if (task?.budget) return `${Number(task.budget).toLocaleString("ru-RU")} ₽`;
  return null;
}

export function fileUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  return `${API}/files/${path}`;
}

export function TaskCard({ task, categories = [], onClick, onFavorite, showLink = false, dimmed = false }) {
  const { t } = useLang();
  const cat = categories.find((c) => c.id === task.category || c.id === task.category_id);
  const budgetLabel = formatBudget(task);
  const isClosed = task.is_closed || ["cancelled", "closed", "done"].includes(task.status);
  const hasApplied = task.has_applied;
  const photos = (task.photos || []).filter(Boolean);

  const cardClass = `card-light text-left transition-shadow animate-fade-in-up flex flex-col gap-2 ${
    dimmed || hasApplied ? "opacity-60 grayscale-[0.3]" : "hover:shadow-md"
  }`;

  const inner = (
    <>
      <div className="flex items-center gap-2 text-xs text-neutral-400 font-semibold">
        <span>{timeAgo(task.created_at, t)}</span>
        {onFavorite && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFavorite(task); }}
            className="ml-auto p-1"
            aria-label="Избранное"
          >
            <Lucide.Heart size={16} className={task.is_favorite ? "fill-red-500 text-red-500" : "text-neutral-300"} />
          </button>
        )}
      </div>

      {showLink ? (
        <Link to={`/tasks/${task.id}`} className="font-extrabold text-lg leading-snug text-black hover:underline" onClick={(e) => e.stopPropagation()}>
          {stripHtml(task.title)}
        </Link>
      ) : (
        <h3 className="font-extrabold text-lg leading-snug text-black">{stripHtml(task.title)}</h3>
      )}

      {budgetLabel && <p className="font-bold text-base">{budgetLabel}</p>}

      <p className="text-sm text-neutral-600 line-clamp-3 leading-snug">{stripHtml(task.description)}</p>

      {photos.length > 0 && (
        <div className={`grid gap-1.5 mt-1 ${photos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {photos.slice(0, 2).map((p, i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl overflow-hidden bg-lavender-100">
              <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 text-sm text-neutral-700 mt-1">
        <div className="flex items-center gap-2">
          <Lucide.Home size={14} className="text-neutral-400 shrink-0" />
          <span className="truncate">
            {task.city}{task.address ? `, ${task.address}` : ""}
            {task.distance_km != null && (
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
          </div>
        )}
      </div>

      {(hasApplied || isClosed) && (
        <span className={`inline-flex self-start rounded-xl px-3 py-1.5 text-xs font-semibold ${isClosed ? "bg-neutral-900 text-white" : "bg-neutral-600 text-white"}`}>
          {isClosed ? "Закрыто" : "Вы откликнулись"}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button data-testid={`task-card-${task.id}`} onClick={onClick} className={cardClass}>
        {inner}
      </button>
    );
  }

  return <div data-testid={`task-card-${task.id}`} className={cardClass}>{inner}</div>;
}
