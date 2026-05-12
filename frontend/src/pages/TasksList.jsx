import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as Lucide from "lucide-react";
import { api } from "../api";
import { useLang } from "../i18n";
import { TopBar, Badge, timeAgo, Empty } from "../components/Layout";

export default function TasksList() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const [params] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const category = params.get("category") || "";
  const q = params.get("q") || "";

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const queryParams = new URLSearchParams();
    if (category) queryParams.set("category", category);
    if (q) queryParams.set("q", q);
    api
      .get(`/tasks?${queryParams.toString()}`)
      .then((r) => setTasks(r.data))
      .finally(() => setLoading(false));
  }, [category, q]);

  const currentCat = categories.find((c) => c.id === category);
  const title = currentCat
    ? lang === "ru" ? currentCat.name_ru : currentCat.name_ro
    : q ? `"${q}"` : t("open_tasks");

  return (
    <div className="flex flex-col h-full bg-white" data-testid="tasks-list-page">
      <TopBar title={title} />
      <div className="scroll-area px-5 py-3">
        {loading && <p className="text-sm text-neutral-400 text-center py-8">{t("loading")}</p>}
        {!loading && tasks.length === 0 && <Empty icon={Lucide.Inbox} text={t("no_tasks")} />}
        <div className="flex flex-col gap-3 pb-6">
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
                  {task.budget && <Badge>{task.budget} {t("rub")}</Badge>}
                </div>
                <p className="text-sm text-neutral-500 line-clamp-2 mb-3">{task.description}</p>
                <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
                  {cat && <span className="font-semibold">{lang === "ru" ? cat.name_ru : cat.name_ro}</span>}
                  <span>•</span>
                  <span className="flex items-center gap-1"><Lucide.MapPin size={12} /> {task.city}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Lucide.Users size={12} /> {task.applications_count}</span>
                  <span className="ml-auto">{timeAgo(task.created_at, t)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
