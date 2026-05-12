import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import * as Lucide from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { Badge, timeAgo, Empty, LangSwitcher } from "../components/Layout";

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const url = user.role === "customer" ? "/tasks/mine" : "/applications/mine";
    api.get(url).then((r) => setItems(r.data)).finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;
  if (user.role === "specialist") {
    return <Navigate to="/tasks" replace />;
  }

  return (
    <div className="scroll-area bg-white flex flex-col" data-testid="orders-page">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between bg-white sticky top-0 z-20">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {user.role === "customer" ? t("my_tasks") : t("my_applications")}
        </h1>
        <LangSwitcher />
      </div>

      {user.role === "customer" && (
        <div className="px-5 mb-3">
          <button
            data-testid="orders-create-task-btn"
            className="btn-primary !h-12 text-sm"
            onClick={() => navigate("/create-task")}
          >
            <Lucide.Plus size={18} className="mr-2" /> {t("create_task")}
          </button>
        </div>
      )}

      <div className="px-5 pb-6 flex flex-col gap-3">
        {loading && <p className="text-center py-8 text-neutral-400">{t("loading")}</p>}
        {!loading && items.length === 0 && (
          <Empty
            icon={Lucide.Inbox}
            text={user.role === "customer" ? t("no_tasks") : t("no_applications")}
          />
        )}
        {user.role === "customer" && items.map((task) => (
          <button
            key={task.id}
            data-testid={`my-task-${task.id}`}
            onClick={() => navigate(`/tasks/${task.id}`)}
            className="card-light text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-bold text-base leading-snug flex-1">{task.title}</h4>
              <Badge variant={task.status === "open" ? "default" : task.status === "in_progress" ? "warning" : "muted"}>
                {t(task.status)}
              </Badge>
            </div>
            <p className="text-sm text-neutral-500 line-clamp-1 mb-3">{task.description}</p>
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="flex items-center gap-1"><Lucide.Users size={12} /> {task.applications_count}</span>
              <span>•</span>
              <span>{timeAgo(task.created_at, t)}</span>
              {task.budget && <span className="ml-auto font-bold text-black">{task.budget} {t("rub")}</span>}
            </div>
          </button>
        ))}
        {user.role === "specialist" && items.map((a) => (
          <button
            key={a.id}
            data-testid={`my-application-${a.id}`}
            onClick={() => navigate(`/tasks/${a.task_id}`)}
            className="card-light text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-bold text-base leading-snug flex-1">{a.task_title}</h4>
              <Badge variant={a.status === "accepted" ? "success" : a.status === "rejected" ? "muted" : "default"}>
                {t(a.status)}
              </Badge>
            </div>
            <p className="text-sm text-neutral-500 line-clamp-2 mb-2">{a.message}</p>
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>{timeAgo(a.created_at, t)}</span>
              {a.price && <span className="font-bold text-black">{a.price} {t("rub")}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
