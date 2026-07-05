import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as Lucide from "lucide-react";
import { api, formatApiError } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { Badge, timeAgo, Empty } from "../components/Layout";
import { formatBudget } from "../components/TaskCard";

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTask, setEditTask] = useState(null);
  const [budgetForm, setBudgetForm] = useState({ budget_type: "fixed", budget: "", budget_min: "", budget_max: "" });

  const load = () => {
    if (!user) return;
    setLoading(true);
    api.get("/tasks/mine").then((r) => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  const openEdit = (task) => {
    setEditTask(task);
    setBudgetForm({
      budget_type: task.budget_type || "fixed",
      budget: task.budget ? String(task.budget) : "",
      budget_min: task.budget_min ? String(task.budget_min) : "",
      budget_max: task.budget_max ? String(task.budget_max) : "",
    });
  };

  const saveBudget = async () => {
    try {
      const payload = { budget_type: budgetForm.budget_type };
      if (budgetForm.budget_type === "range") {
        payload.budget_min = budgetForm.budget_min ? parseInt(budgetForm.budget_min, 10) : null;
        payload.budget_max = budgetForm.budget_max ? parseInt(budgetForm.budget_max, 10) : null;
      } else {
        payload.budget = budgetForm.budget ? parseInt(budgetForm.budget, 10) : null;
      }
      await api.patch(`/tasks/${editTask.id}/budget`, payload);
      toast.success(t("success"));
      setEditTask(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const closeTask = async (task) => {
    if (!window.confirm("Снять задачу с публикации?")) return;
    try {
      await api.post(`/tasks/${task.id}/close`);
      toast.success("Задача закрыта");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  if (!user) return null;

  return (
    <div className="scroll-area bg-white flex flex-col" data-testid="orders-page">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between bg-white sticky top-0 z-20">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("my_tasks")}</h1>
      </div>

      <div className="px-5 mb-3">
        <button
          data-testid="orders-create-task-btn"
          className="btn-primary !h-12 text-sm"
          onClick={() => navigate("/create-task")}
        >
          <Lucide.Plus size={18} className="mr-2" /> {t("create_task")}
        </button>
      </div>

      <div className="px-5 pb-6 flex flex-col gap-3">
        {loading && <p className="text-center py-8 text-neutral-400">{t("loading")}</p>}
        {!loading && items.length === 0 && <Empty icon={Lucide.Inbox} text={t("no_tasks")} />}
        {items.map((task) => (
          <div key={task.id} className="card-light" data-testid={`my-task-${task.id}`}>
            <button onClick={() => navigate(`/tasks/${task.id}`)} className="w-full text-left">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-bold text-base leading-snug flex-1">{task.title}</h4>
                <Badge variant={task.status === "open" ? "default" : "muted"}>{t(task.status)}</Badge>
              </div>
              <p className="text-sm text-neutral-500 line-clamp-1 mb-3">{task.description}</p>
              <div className="flex items-center gap-3 text-xs text-neutral-400">
                <span>{timeAgo(task.created_at, t)}</span>
                {formatBudget(task) && <span className="ml-auto font-bold text-black">{formatBudget(task)}</span>}
              </div>
            </button>
            {task.status === "open" && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
                <button type="button" className="btn-secondary flex-1 !h-10 text-xs" onClick={() => openEdit(task)}>
                  Редактировать
                </button>
                <button type="button" className="btn-secondary flex-1 !h-10 text-xs" onClick={() => closeTask(task)}>
                  Снять задачу
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {editTask && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 flex flex-col gap-3">
            <h3 className="font-extrabold text-lg">Изменить можно только бюджет</h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => setBudgetForm((f) => ({ ...f, budget_type: "fixed" }))} className={`flex-1 rounded-2xl p-2 text-sm font-semibold ${budgetForm.budget_type === "fixed" ? "bg-black text-white" : "bg-lavender-50"}`}>Точная сумма</button>
              <button type="button" onClick={() => setBudgetForm((f) => ({ ...f, budget_type: "range" }))} className={`flex-1 rounded-2xl p-2 text-sm font-semibold ${budgetForm.budget_type === "range" ? "bg-black text-white" : "bg-lavender-50"}`}>Интервал</button>
            </div>
            {budgetForm.budget_type === "fixed" ? (
              <input className="input-base" inputMode="numeric" value={budgetForm.budget} onChange={(e) => setBudgetForm((f) => ({ ...f, budget: e.target.value.replace(/\D/g, "") }))} placeholder="Сумма" />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input className="input-base" inputMode="numeric" value={budgetForm.budget_min} onChange={(e) => setBudgetForm((f) => ({ ...f, budget_min: e.target.value.replace(/\D/g, "") }))} placeholder="От" />
                <input className="input-base" inputMode="numeric" value={budgetForm.budget_max} onChange={(e) => setBudgetForm((f) => ({ ...f, budget_max: e.target.value.replace(/\D/g, "") }))} placeholder="До" />
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setEditTask(null)}>{t("cancel")}</button>
              <button type="button" className="btn-primary flex-1" onClick={saveBudget}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
