import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as Lucide from "lucide-react";
import { api, API } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { useGeo } from "../geo";
import { Empty, SeoHead } from "../components/Layout";
import { TaskCard } from "../components/TaskCard";
import FiltersSheet from "../components/FiltersSheet";

function cityInLocative(city) {
  if (!city) return "";
  const map = {
    Москва: "Москве",
    "Санкт-Петербург": "Санкт-Петербурге",
    Майкоп: "Майкопе",
    Казань: "Казани",
    "Нижний Новгород": "Нижнем Новгороде",
  };
  return map[city] || city;
}

function StoryTile({ s, lang }) {
  const Icon = Lucide[s.icon] || Lucide.Sparkles;
  return (
    <div
      data-testid={`story-${s.id}`}
      className="relative shrink-0 w-[120px] h-[140px] rounded-3xl p-3 flex flex-col justify-between overflow-hidden cursor-pointer transition-transform hover:scale-[0.98]"
      style={{ background: s.color }}
    >
      <span className="w-2 h-2 rounded-full bg-red-500 self-end" />
      <Icon size={56} strokeWidth={1.4} className="absolute right-1 top-6 text-white/50" />
      <p className="text-sm font-extrabold leading-tight text-white drop-shadow relative z-10">
        {s.title_ru}
      </p>
    </div>
  );
}

export default function TasksList() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const { coords, status, request } = useGeo();
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { user } = useAuth();

  const category = params.get("category") || "";
  const q = params.get("q") || "";
  const city = params.get("city") || "";

  useEffect(() => {
    api.get("/stories").then((r) => setStories(r.data));
    api.get("/categories").then((r) => setCategories(r.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const queryParams = new URLSearchParams();
    if (category) queryParams.set("category", category);
    if (q) queryParams.set("q", q);
    if (city) queryParams.set("city", city);
    if (coords) {
      queryParams.set("lat", coords.lat);
      queryParams.set("lng", coords.lng);
      queryParams.set("sort", "distance");
    }
    if (favoritesOnly) queryParams.set("favorites", "1");
    api
      .get(`/tasks?${queryParams.toString()}`)
      .then((r) => setTasks(r.data))
      .finally(() => setLoading(false));
  }, [category, q, city, coords, favoritesOnly]);

  const toggleFavorite = async (task) => {
    if (!user) return;
    try {
      if (task.is_favorite) {
        await api.delete(`/favorites/${task.id}`);
      } else {
        await api.post(`/favorites/${task.id}`);
      }
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_favorite: !t.is_favorite } : t)));
    } catch { /* no-op */ }
  };

  const currentCat = categories.find((c) => c.id === category);
  const filterCount = [category, q, city].filter(Boolean).length;
  const seoTitle = currentCat
    ? `${currentCat.name_ru} — задания Treabo${city ? ` в ${cityInLocative(city)}` : ""}`
    : q
      ? `Поиск «${q}» — задания Treabo`
      : city
        ? `Задания в ${cityInLocative(city)} — Treabo`
        : "Задания для мастеров — Treabo";

  return (
    <div className="scroll-area bg-white flex flex-col" data-testid="tasks-list-page">
      <SeoHead title={seoTitle} description="Актуальные заказы от клиентов: бюджет, адрес, категория и срок выполнения." />
      <div className="px-5 pt-5 pb-2 sticky top-0 bg-white z-30 flex flex-col gap-3">
        {/* Top toggle: Список / Карта */}
        <div className="flex items-center justify-between gap-3">
          <div className="bg-lavender-100 rounded-full p-1 flex items-center" data-testid="view-toggle">
            <button
              data-testid="view-list-btn"
              className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold shadow-sm"
            >{t("list_view")}</button>
            <button
              data-testid="view-map-btn"
              onClick={() => navigate("/map" + (params.toString() ? `?${params.toString()}` : ""))}
              className="px-5 py-2 rounded-full text-neutral-500 text-sm font-bold transition-colors hover:text-black"
            >{t("map_view")}</button>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex items-center gap-2">
          <div className="input-base flex items-center gap-2 !h-12 flex-1">
            <Lucide.Search size={18} className="text-neutral-400" />
            <input
              data-testid="feed-search-input"
              placeholder={t("search_orders")}
              defaultValue={q}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const np = new URLSearchParams(params);
                  if (e.currentTarget.value) np.set("q", e.currentTarget.value);
                  else np.delete("q");
                  setParams(np);
                }
              }}
              className="bg-transparent flex-1 outline-none text-sm"
            />
          </div>
          {user?.role === "specialist" && (
            <button
              data-testid="favorites-filter-btn"
              onClick={() => setFavoritesOnly((v) => !v)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${favoritesOnly ? "bg-black text-white" : "bg-lavender-50 hover:bg-lavender-100"}`}
            >
              <Lucide.Heart size={18} className={favoritesOnly ? "fill-white" : ""} />
            </button>
          )}
          <button
            data-testid="open-filters-btn"
            onClick={() => setShowFilters(true)}
            className="w-12 h-12 bg-lavender-50 rounded-2xl flex items-center justify-center relative hover:bg-lavender-100 transition-colors"
          >
            <Lucide.SlidersHorizontal size={18} />
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">{filterCount}</span>
            )}
          </button>
        </div>

        {currentCat && (
          <div className="flex items-center gap-2 -mb-1">
            <span className="bg-black text-white rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
              {currentCat.name_ru}
              <button
                onClick={() => { const np = new URLSearchParams(params); np.delete("category"); setParams(np); }}
                className="hover:opacity-70"
                data-testid="clear-category-btn"
              ><Lucide.X size={12} /></button>
            </span>
          </div>
        )}
      </div>

      <div className="px-5 pb-1">
        <h1 className="text-xl font-extrabold tracking-tight">
          {currentCat ? currentCat.name_ru : city ? `Задания в ${city}` : "Все задания"}
        </h1>
      </div>

      {/* Stories carousel */}
      <div className="flex gap-2 px-5 py-3 overflow-x-auto" data-testid="stories-carousel">
        {stories.map((s) => <StoryTile key={s.id} s={s} lang={lang} />)}
      </div>

      {/* Geo status banner */}
      {status === "denied" && (
        <div className="mx-5 mb-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs flex items-center justify-between gap-2">
          <span className="text-amber-800">{t("geo_denied")}</span>
          <button onClick={request} className="font-bold text-black text-xs">{t("enable_geo")}</button>
        </div>
      )}

      {/* Task list */}
      <div className="px-5 pb-6 flex flex-col gap-3">
        {loading && <p className="text-sm text-neutral-400 text-center py-8">{t("loading")}</p>}
        {!loading && tasks.length === 0 && <Empty icon={Lucide.Inbox} text={t("no_tasks")} />}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            categories={categories}
            onClick={() => navigate(`/tasks/${task.id}`)}
            onFavorite={user?.role === "specialist" ? toggleFavorite : undefined}
            showLink
            dimmed={task.has_applied}
          />
        ))}
      </div>

      {showFilters && (
        <FiltersSheet
          categories={categories}
          current={{ category, city }}
          onClose={() => setShowFilters(false)}
          onApply={(next) => {
            const np = new URLSearchParams();
            if (next.category) np.set("category", next.category);
            if (next.city) np.set("city", next.city);
            if (q) np.set("q", q);
            setParams(np);
            setShowFilters(false);
          }}
        />
      )}
    </div>
  );
}
