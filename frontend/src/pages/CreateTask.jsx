import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as Lucide from "lucide-react";
import { api, formatApiError } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { TopBar } from "../components/Layout";

export default function CreateTask() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    city: user?.city || "",
    address: "",
    budget: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
  }, []);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.title && form.description && form.category && form.city;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const payload = { ...form, budget: form.budget ? parseInt(form.budget, 10) : null };
      const { data } = await api.post("/tasks", payload);
      toast.success(t("success"));
      navigate(`/tasks/${data.id}`, { replace: true });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white" data-testid="create-task-page">
      <TopBar title={t("new_task")} />
      <form onSubmit={onSubmit} className="scroll-area px-5 pb-8 flex flex-col gap-4">
        <div>
          <label className="text-sm font-semibold text-neutral-600 mb-2 block">{t("task_title_label")}</label>
          <input
            data-testid="create-task-title"
            className="input-base"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={t("task_title_placeholder")}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-neutral-600 mb-2 block">{t("task_description")}</label>
          <textarea
            data-testid="create-task-description"
            className="textarea-base min-h-[120px]"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder={t("task_description_placeholder")}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-neutral-600 mb-2 block">{t("category")}</label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((c) => {
              const Icon = Lucide[c.icon] || Lucide.LayoutGrid;
              const active = form.category === c.id;
              return (
                <button
                  type="button"
                  key={c.id}
                  data-testid={`category-pick-${c.id}`}
                  onClick={() => update("category", c.id)}
                  className={`flex items-center gap-2 rounded-2xl p-3 text-left text-sm transition-all ${active ? "bg-black text-white" : "bg-lavender-50 text-black hover:bg-lavender-100"}`}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span className="font-semibold truncate">{lang === "ru" ? c.name_ru : c.name_ro}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-neutral-600 mb-2 block">{t("city")}</label>
            <input
              data-testid="create-task-city"
              className="input-base"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder={t("city_placeholder")}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-neutral-600 mb-2 block">{t("budget")}</label>
            <input
              data-testid="create-task-budget"
              className="input-base"
              inputMode="numeric"
              value={form.budget}
              onChange={(e) => update("budget", e.target.value.replace(/\D/g, ""))}
              placeholder={t("budget_placeholder")}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-neutral-600 mb-2 block">{t("address")}</label>
          <input
            data-testid="create-task-address"
            className="input-base"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder={t("address")}
          />
        </div>

        <div className="pt-4">
          <button
            data-testid="create-task-submit"
            type="submit"
            disabled={!canSubmit || loading}
            className={canSubmit && !loading ? "btn-primary" : "btn-disabled"}
          >
            {loading ? t("loading") : t("publish")}
          </button>
        </div>
      </form>
    </div>
  );
}
