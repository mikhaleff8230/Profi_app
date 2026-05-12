import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import * as Lucide from "lucide-react";
import { api, formatApiError } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { TopBar, Badge, timeAgo } from "../components/Layout";

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [task, setTask] = useState(null);
  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showApply, setShowApply] = useState(false);
  const [applyMsg, setApplyMsg] = useState("");
  const [applyPrice, setApplyPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const tRes = await api.get(`/tasks/${id}`);
    setTask(tRes.data);
    if (user?.role === "customer" && tRes.data.customer_id === user.id) {
      const a = await api.get(`/tasks/${id}/applications`);
      setApps(a.data);
    }
  };

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!task) return (
    <div className="flex flex-col h-full bg-white">
      <TopBar title="" />
      <p className="text-center py-10 text-neutral-400">{t("loading")}</p>
    </div>
  );

  const cat = categories.find((c) => c.id === task.category);
  const isOwner = user?.role === "customer" && task.customer_id === user.id;
  const isSpecialist = user?.role === "specialist";

  const submitApplication = async () => {
    if (!applyMsg.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/tasks/${id}/applications`, {
        message: applyMsg,
        price: applyPrice ? parseInt(applyPrice, 10) : null,
      });
      toast.success(t("success"));
      setShowApply(false);
      setApplyMsg("");
      setApplyPrice("");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const acceptApp = async (appId) => {
    try {
      await api.post(`/applications/${appId}/accept`);
      toast.success(t("success"));
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const deleteTask = async () => {
    if (!window.confirm(t("confirm_delete"))) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success(t("success"));
      navigate("/orders", { replace: true });
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const statusVariant = { open: "default", in_progress: "warning", completed: "success" }[task.status] || "muted";

  return (
    <div className="flex flex-col h-full bg-white" data-testid="task-detail-page">
      <TopBar
        title=""
        right={isOwner && task.status === "open" ? (
          <button onClick={deleteTask} data-testid="task-delete-btn" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-lavender-50">
            <Lucide.Trash2 size={20} className="text-neutral-500" />
          </button>
        ) : null}
      />
      <div className="scroll-area px-5 pb-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={statusVariant}>{t(task.status)}</Badge>
          {task.budget && <Badge>{task.budget} {t("rub")}</Badge>}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-3">{task.title}</h1>
        <p className="text-base text-neutral-700 mb-4 whitespace-pre-line">{task.description}</p>

        <div className="card-light bg-lavender-50 border-0 flex flex-col gap-3 mb-5">
          {cat && (
            <div className="flex items-center gap-2 text-sm">
              <Lucide.Tag size={16} className="text-neutral-500" />
              <span className="font-semibold">{lang === "ru" ? cat.name_ru : cat.name_ro}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Lucide.MapPin size={16} className="text-neutral-500" />
            <span>{task.city}{task.address ? `, ${task.address}` : ""}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Lucide.User size={16} className="text-neutral-500" />
            <span>{task.customer_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Lucide.Clock size={16} />
            <span>{timeAgo(task.created_at, t)}</span>
          </div>
        </div>

        {/* Specialist: apply */}
        {isSpecialist && task.status === "open" && !showApply && (
          <button
            data-testid="apply-task-btn"
            className="btn-primary"
            onClick={() => setShowApply(true)}
          >
            <Lucide.Send size={18} className="mr-2" /> {t("apply_to_task")}
          </button>
        )}

        {isSpecialist && showApply && (
          <div className="card-light border border-lavender-200 mb-4" data-testid="apply-form">
            <h3 className="font-bold mb-3">{t("your_offer")}</h3>
            <textarea
              data-testid="apply-message-input"
              placeholder={t("message_placeholder")}
              value={applyMsg}
              onChange={(e) => setApplyMsg(e.target.value)}
              className="textarea-base min-h-[100px] mb-3"
            />
            <input
              data-testid="apply-price-input"
              placeholder={t("your_price")}
              inputMode="numeric"
              value={applyPrice}
              onChange={(e) => setApplyPrice(e.target.value.replace(/\D/g, ""))}
              className="input-base mb-3"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowApply(false)}
                className="btn-secondary flex-1 !h-12 text-sm"
              >{t("cancel")}</button>
              <button
                data-testid="apply-submit-btn"
                type="button"
                onClick={submitApplication}
                disabled={submitting || !applyMsg.trim()}
                className={applyMsg.trim() ? "btn-primary flex-1 !h-12 text-sm" : "btn-disabled flex-1 !h-12 text-sm"}
              >{submitting ? t("loading") : t("submit_application")}</button>
            </div>
          </div>
        )}

        {/* Owner: applications list */}
        {isOwner && (
          <section className="mt-2">
            <h3 className="font-bold text-lg mb-3">
              {t("applications")} <span className="text-neutral-400 font-normal">({apps.length})</span>
            </h3>
            {apps.length === 0 && <p className="text-sm text-neutral-400 py-4">{t("no_applications")}</p>}
            <div className="flex flex-col gap-3">
              {apps.map((a) => (
                <div key={a.id} className="card-light" data-testid={`application-${a.id}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <button
                      onClick={() => navigate(`/specialists/${a.specialist_id}`)}
                      className="flex items-center gap-3 text-left"
                      data-testid={`view-specialist-${a.specialist_id}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-lavender-100 flex items-center justify-center font-bold">
                        {a.specialist_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{a.specialist_name}</p>
                        <p className="text-xs text-neutral-400">{a.specialist_city || ""}</p>
                      </div>
                    </button>
                    {a.status === "accepted" && <Badge variant="success">{t("accepted")}</Badge>}
                    {a.status === "rejected" && <Badge variant="muted">{t("rejected")}</Badge>}
                  </div>
                  <p className="text-sm text-neutral-700 mb-3">{a.message}</p>
                  <div className="flex items-center justify-between">
                    {a.price && <span className="font-bold">{a.price} {t("rub")}</span>}
                    {task.status === "open" && a.status === "pending" && (
                      <button
                        data-testid={`accept-application-${a.id}`}
                        onClick={() => acceptApp(a.id)}
                        className="ml-auto bg-black text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-neutral-800"
                      >{t("accept")}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
