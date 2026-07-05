import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import * as Lucide from "lucide-react";
import { api, formatApiError } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { TopBar, Badge, timeAgo, SeoHead } from "../components/Layout";
import { formatBudget, stripHtml } from "../components/TaskCard";

function CustomerCard({ customer, t }) {
  if (!customer) return null;
  const last = customer.last_seen ? timeAgo(customer.last_seen, t) : "";
  const label = customer.name ? `Заказчик ${customer.name}` : "Заказчик";
  return (
    <div className="flex items-center gap-3 py-3 border-y border-neutral-100" data-testid="customer-card">
      <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center font-bold text-white text-lg">
        {customer.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-normal text-neutral-600 truncate">{label}</p>
        {last ? <p className="text-xs text-neutral-400 mt-0.5">{t("online_ago")} {last}</p> : null}
      </div>
      <Lucide.ChevronRight size={18} className="text-neutral-300" />
    </div>
  );
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [task, setTask] = useState(null);
  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [specInfo, setSpecInfo] = useState(null);
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
    if (user?.role === "specialist") {
      try {
        const si = await api.get(`/tasks/${id}/specialist-info`);
        setSpecInfo(si.data);
      } catch { /* no-op */ }
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
  const hasApplied = specInfo?.has_applied;

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

  const isClosed = task.is_closed || ["cancelled", "closed", "done"].includes(task.status);
  const budgetLabel = formatBudget(task);
  const statusVariant = { open: "default", in_progress: "warning", completed: "success" }[task.status] || "muted";
  const shortOrderId = task.id.replace(/-/g, "").slice(0, 8).toUpperCase();

  return (
    <div className="flex flex-col h-full bg-white" data-testid="task-detail-page">
      <SeoHead
        title={`${task.title} — Treabo`}
        description={stripHtml(task.description)?.slice(0, 160) || "Детали задания на Treabo"}
      />
      <TopBar
        title={isSpecialist ? task.title : ""}
        right={isOwner && task.status === "open" ? (
          <button onClick={deleteTask} data-testid="task-delete-btn" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-lavender-50">
            <Lucide.MoreHorizontal size={22} className="text-neutral-500" />
          </button>
        ) : (
          <button data-testid="task-more-btn" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-lavender-50">
            <Lucide.MoreHorizontal size={22} className="text-neutral-500" />
          </button>
        )}
      />

      <div className="scroll-area pb-32">
        {/* Title (specialist sees the title in the top bar instead) */}
        {!isSpecialist && (
          <div className="px-5 pt-2 pb-4">
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight">{task.title}</h1>
          </div>
        )}
        {isSpecialist && (
          <div className="px-5 pt-2 pb-4">
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight">{task.title}</h1>
          </div>
        )}

        {/* Photo carousel */}
        {task.photos?.length > 0 && (
          <div className="px-5 mb-5">
            <PhotoCarousel photos={task.photos} />
          </div>
        )}

        {/* Specialist-only meta block */}
        {isSpecialist && (
          <div className="px-5 mb-5 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-extrabold">{t("order_no")} {shortOrderId}</h2>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Lucide.Clock size={14} />
                <span>{t("order_left_at")} {new Date(task.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <Lucide.RefreshCw size={14} />
                <span>{t("updated_ago")} {timeAgo(task.created_at, t)}</span>
              </div>
            </div>

            {/* Info banner: rank */}
            <div className="bg-lavender-100 rounded-2xl px-4 py-3 flex items-start gap-3" data-testid="rank-banner">
              <Lucide.Info size={18} className="shrink-0 mt-0.5 text-neutral-600" />
              <p className="text-sm text-neutral-800">
                {specInfo?.rank === 1
                  ? t("rank_first")
                  : t("rank_position").replace("{n}", specInfo?.rank ?? "—")}
              </p>
            </div>

            {/* Warning: no contacts shared */}
            <div className="bg-amber-50 rounded-2xl px-4 py-3 flex items-start gap-3" data-testid="contacts-banner">
              <Lucide.UserX size={18} className="shrink-0 mt-0.5 text-amber-700" />
              <p className="text-sm text-neutral-800">{t("client_no_contacts")}</p>
            </div>

            {/* Customer card */}
            {specInfo?.customer && <CustomerCard customer={specInfo.customer} t={t} />}
          </div>
        )}

        {/* Description */}
        <div className="px-5 mb-5">
          <h3 className="text-xl font-extrabold mb-3">{t("description_label")}</h3>
          <p className="text-base text-neutral-800 whitespace-pre-line leading-relaxed">{stripHtml(task.description)}</p>
        </div>

        {/* Meta block */}
        <div className="px-5">
          <div className="card-light bg-lavender-50 border-0 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={statusVariant}>{t(task.status)}</Badge>
              {budgetLabel && <Badge>{budgetLabel}</Badge>}
            </div>
            {cat && (
              <div className="flex items-center gap-2 text-sm">
                <Lucide.Tag size={16} className="text-neutral-500" />
                <span className="font-semibold">{cat.name_ru}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Lucide.MapPin size={16} className="text-neutral-500" />
              <span>{task.city}{task.address ? `, ${task.address}` : ""}{task.distance_km != null && (<span className="text-neutral-400"> · {task.distance_km} {t("distance_km")}</span>)}</span>
            </div>
            {task.deadline && (
              <div className="flex items-center gap-2 text-sm">
                <Lucide.Calendar size={16} className="text-neutral-500" />
                <span>{task.deadline}</span>
              </div>
            )}
          </div>
        </div>

        {task.lat != null && task.lng != null && (
          <div className="px-5 mt-6">
            <h3 className="text-xl font-extrabold mb-3">{t("map_view")}</h3>
            <div className="rounded-2xl overflow-hidden border border-neutral-100">
              <img
                alt="Карта задания"
                className="w-full h-48 object-cover"
                src={`https://static-maps.yandex.ru/v1?ll=${task.lng},${task.lat}&z=14&size=650,320&l=map&pt=${task.lng},${task.lat},pm2rdm&lang=ru_RU`}
              />
            </div>
          </div>
        )}

        {/* Owner: applications */}
        {isOwner && (
          <section className="px-5 mt-6">
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
                    {a.price && <span className="font-bold">{a.price.toLocaleString()} {t("rub")}</span>}
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

        {/* Specialist apply form (inline above CTA) */}
        {isSpecialist && showApply && (
          <div className="px-5 mt-4" data-testid="apply-form">
            <h3 className="font-extrabold text-lg mb-2">{t("fits_question")}</h3>
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
          </div>
        )}
      </div>

      {/* Sticky CTA bar */}
      {isSpecialist && task.status === "open" && !isClosed && (
        <div className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-neutral-100 z-20">
          {!hasApplied && !showApply && (
            <button
              data-testid="apply-task-btn"
              className="btn-primary"
              onClick={() => setShowApply(true)}
            >
              <Lucide.MessageSquare size={18} className="mr-2" /> {t("message_client")}
            </button>
          )}
          {showApply && (
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
          )}
          {hasApplied && (
            <button
              data-testid="open-chat-btn"
              className="btn-secondary bg-neutral-600 text-white border-0"
              disabled
            >
              Вы откликнулись
            </button>
          )}
        </div>
      )}
      {isSpecialist && isClosed && (
        <div className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-neutral-100 z-20">
          <button className="btn-secondary bg-neutral-900 text-white border-0 w-full" disabled>
            Закрыто
          </button>
        </div>
      )}
    </div>
  );
}
