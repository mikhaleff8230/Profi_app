import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Lucide from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { timeAgo, Badge, SeoHead } from "../components/Layout";
import { fileUrl, formatBudget } from "../components/TaskCard";

function CategoryTile({ cat, onClick }) {
  const Icon = Lucide[cat.icon] || Lucide.LayoutGrid;
  const imageUrl = fileUrl(cat.image);
  return (
    <button
      data-testid={`category-${cat.id}`}
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-lavender-50 transition-colors"
    >
      <div className="w-14 h-14 rounded-2xl bg-lavender-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon size={26} strokeWidth={1.6} className="text-black" />
        )}
      </div>
      <span className="text-xs font-semibold text-center text-black leading-tight">
        {cat.name_ru}
      </span>
    </button>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [categories, setCategories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");

  const [stats, setStats] = useState(null);
  const [topSpecialists, setTopSpecialists] = useState([]);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
    api.get("/tasks").then((r) => setTasks(r.data.slice(0, 8)));
    api.get("/home/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/home/top-specialists", { params: { limit: 3 } }).then((r) => setTopSpecialists(r.data)).catch(() => {});
  }, []);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/tasks?q=${encodeURIComponent(search)}`);
  };

  return (
    <div className="scroll-area bg-white" data-testid="home-page">
      <SeoHead
        title="Treabo — заказ услуг мастеров рядом"
        description="Найдите проверенных мастеров для ремонта, покраски, электрики и других работ в вашем городе."
      />
      <div className="px-5 pt-6 pb-3 flex items-center justify-between sticky top-0 bg-white z-20">
        <div>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            {user?.role === "customer" ? t("customer") : t("specialist")}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {user?.role === "customer" ? t("home_title_customer") : t("home_title_specialist")}
          </h1>
        </div>
      </div>

      <form onSubmit={onSearchSubmit} className="px-5 mb-5">
        <div className="input-base flex items-center gap-2 !h-12">
          <Lucide.Search size={18} className="text-neutral-400" />
          <input
            data-testid="home-search-input"
            placeholder={t("search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent flex-1 outline-none text-sm"
          />
        </div>
      </form>

      {stats && (
        <section className="px-5 mb-6 grid grid-cols-3 gap-2">
          <div className="card-light text-center py-4">
            <p className="text-2xl font-extrabold">{stats.categories_count}+</p>
            <p className="text-xs text-neutral-500 mt-1">категорий услуг</p>
          </div>
          <div className="card-light text-center py-4">
            <p className="text-2xl font-extrabold">{stats.average_rating || "—"}</p>
            <p className="text-xs text-neutral-500 mt-1">средняя оценка</p>
          </div>
          <div className="card-light text-center py-4">
            <p className="text-2xl font-extrabold">24/7</p>
            <p className="text-xs text-neutral-500 mt-1">чат с исполнителем</p>
          </div>
        </section>
      )}

      {topSpecialists.length > 0 && (
        <section className="px-5 mb-6">
          <h3 className="text-base font-bold mb-3">Лучшие мастера</h3>
          <div className="flex flex-col gap-3">
            {topSpecialists.map((s) => (
              <button key={s.id} className="card-light text-left flex items-center gap-3" onClick={() => navigate(`/specialists/${s.id}`)}>
                <div className="w-12 h-12 rounded-full bg-lavender-100 flex items-center justify-center font-bold overflow-hidden">
                  {s.avatar ? <img src={s.avatar} alt="" className="w-full h-full object-cover" /> : s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{s.name}</p>
                  <p className="text-xs text-neutral-500 truncate">{s.services?.[0] || s.bio || "Мастер Treabo"}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold">★ {s.rating}</p>
                  <p className="text-xs text-neutral-400">{s.reviews_count} отзывов</p>
                  {s.min_price ? (
                    <p className="text-xs text-neutral-500 mt-0.5">от {s.min_price.toLocaleString("ru-RU")} ₽</p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {user?.role === "customer" && (
        <div className="px-5 mb-5">
          <button
            data-testid="home-create-task-btn"
            className="btn-primary !h-12 text-sm"
            onClick={() => navigate("/create-task")}
          >
            <Lucide.Plus size={18} className="mr-2" /> {t("create_task")}
          </button>
        </div>
      )}

      <section className="px-5 mb-6">
        <h3 className="text-base font-bold mb-3">{t("categories")}</h3>
        <div className="grid grid-cols-4 gap-2">
          {categories.map((c) => (
            <CategoryTile key={c.id} cat={c} onClick={() => navigate(`/tasks?category=${c.id}`)} />
          ))}
        </div>
      </section>

      <section className="px-5 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold">{t("open_tasks")}</h3>
          <button
            data-testid="home-view-all-tasks"
            onClick={() => navigate("/tasks")}
            className="text-xs font-semibold text-neutral-500 hover:text-black"
          >{t("view_all")} →</button>
        </div>
        <div className="flex flex-col gap-3">
          {tasks.length === 0 && (
            <p className="text-sm text-neutral-400 py-6 text-center">{t("no_tasks")}</p>
          )}
          {tasks.map((task) => {
            const cat = categories.find((c) => c.id === task.category);
            return (
              <button
                key={task.id}
                data-testid={`task-card-${task.id}`}
                className="card-light text-left hover:shadow-md transition-shadow"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-bold text-base leading-snug">{task.title}</h4>
                  {formatBudget(task) && (
                    <Badge variant="default">{formatBudget(task)}</Badge>
                  )}
                </div>
                <p className="text-sm text-neutral-500 line-clamp-2 mb-3">{task.description}</p>
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  {cat && <span className="font-semibold">{cat.name_ru}</span>}
                  <span>•</span>
                  <span className="flex items-center gap-1"><Lucide.MapPin size={12} /> {task.city}</span>
                  <span className="ml-auto">{timeAgo(task.created_at, t)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
