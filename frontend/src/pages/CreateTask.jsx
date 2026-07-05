import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as Lucide from "lucide-react";
import { api, formatApiError } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { useGeo } from "../geo";
import { TopBar } from "../components/Layout";
import { fileUrl } from "../components/TaskCard";

const YANDEX_KEY = process.env.REACT_APP_YANDEX_MAPS_API_KEY || "";
let ymapsPromise = null;

function loadYmapsScript() {
  if (typeof window === "undefined") return Promise.reject();
  if (window.ymaps) return new Promise((r) => window.ymaps.ready(r));
  if (ymapsPromise) return ymapsPromise;
  ymapsPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(YANDEX_KEY)}&lang=ru_RU`;
    s.onload = () => window.ymaps?.ready(resolve) || reject();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return ymapsPromise;
}

function YandexAddressMap({ lat, lng, onChange }) {
  const ref = useRef(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let map;
    loadYmapsScript().then(() => {
      const center = lat && lng ? [lat, lng] : [55.7522, 37.6156];
      map = new window.ymaps.Map(ref.current, { center, zoom: 14, controls: ["zoomControl"] });
      const pm = new window.ymaps.Placemark(center, {}, { draggable: true });
      map.geoObjects.add(pm);
      const pick = async (coords) => {
        let address = "";
        try {
          const res = await window.ymaps.geocode(coords);
          address = res.geoObjects.get(0)?.getAddressLine() || "";
        } catch { /* no-op */ }
        onChange?.({ lat: coords[0], lng: coords[1], address });
      };
      pm.events.add("dragend", () => pick(pm.geometry.getCoordinates()));
      map.events.add("click", (e) => { pm.geometry.setCoordinates(e.get("coords")); pick(e.get("coords")); });
    }).catch(() => setErr("Карта не загрузилась. Уточните адрес вручную."));
    return () => map?.destroy?.();
  }, []);
  if (err) return <div className="rounded-2xl bg-amber-50 text-amber-800 text-sm p-4">{err}</div>;
  return <div ref={ref} className="rounded-2xl overflow-hidden border border-neutral-100 h-[220px]" />;
}

const DRAFT_KEY = "treabo-create-task-draft";
const STEPS = ["prompt", "details", "category", "work", "questions", "deadline", "address", "budget", "media", "finish"];

const defaultDraft = () => ({
  prompt: "",
  title: "",
  description: "",
  city: "",
  category: "",
  category_id: "",
  work_id: null,
  work_answers: {},
  deadline: "",
  address: "",
  lat: null,
  lng: null,
  budget_type: "fixed",
  budget: "",
  budget_min: "",
  budget_max: "",
  photos: [],
  pendingFiles: [],
});

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...defaultDraft(), ...JSON.parse(raw) } : defaultDraft();
  } catch {
    return defaultDraft();
  }
}

export default function CreateTask() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { user, login, register } = useAuth();
  const { coords, request: requestGeo } = useGeo();

  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState(loadDraft);
  const [categories, setCategories] = useState([]);
  const [works, setWorks] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [emailFallback, setEmailFallback] = useState(false);

  const step = STEPS[stepIndex];

  const update = useCallback((key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  useEffect(() => {
    const { pendingFiles, ...serializable } = draft;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(serializable));
  }, [draft]);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!draft.category_id) {
      setWorks([]);
      return;
    }
    api.get("/works", { params: { category_id: draft.category_id } })
      .then((r) => setWorks(r.data || []))
      .catch(() => setWorks([]));
  }, [draft.category_id]);

  useEffect(() => {
    if (!draft.work_id) {
      setQuestions([]);
      return;
    }
    api.get("/questions", { params: { work_id: draft.work_id } })
      .then((r) => setQuestions(r.data || []))
      .catch(() => setQuestions([]));
  }, [draft.work_id]);

  useEffect(() => {
    if (user?.city && !draft.city) update("city", user.city);
  }, [user, draft.city, update]);

  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const skipIfEmpty = (targetStep) => {
    if (targetStep === "work" && works.length === 0) return skipIfEmpty("questions");
    if (targetStep === "questions" && questions.length === 0) return skipIfEmpty("deadline");
    const idx = STEPS.indexOf(targetStep);
    if (idx >= 0) setStepIndex(idx);
  };

  const goNextFrom = (current) => {
    const idx = STEPS.indexOf(current);
    let nextIdx = idx + 1;
    while (nextIdx < STEPS.length) {
      const nextStep = STEPS[nextIdx];
      if (nextStep === "work" && works.length === 0) { nextIdx++; continue; }
      if (nextStep === "questions" && questions.length === 0) { nextIdx++; continue; }
      break;
    }
    setStepIndex(nextIdx);
  };

  const runAiCheck = async () => {
    const text = [draft.title, draft.description, draft.prompt].filter(Boolean).join("\n");
    if (!text.trim()) return;
    setAiLoading(true);
    try {
      const { data } = await api.post("/ai/job-draft", { text });
      if (data.success && data.data) {
        if (data.data.title) update("title", data.data.title);
        if (data.data.description) update("description", data.data.description);
        toast.success("Текст проверен");
      } else {
        toast.error(data.message || "Не удалось проверить текст");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || formatApiError(err);
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files.slice(0, 10 - draft.photos.length)) {
        const fd = new FormData();
        fd.append("file", file);
        const { data } = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
        uploaded.push(data.path);
      }
      update("photos", [...draft.photos, ...uploaded]);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const buildPayload = () => {
    const payload = {
      title: draft.title || draft.prompt || "Заявка",
      description: draft.description || draft.prompt,
      category: draft.category_id || draft.category,
      category_id: draft.category_id || draft.category,
      work_id: draft.work_id || null,
      city: draft.city,
      address: draft.address || null,
      lat: draft.lat,
      lng: draft.lng,
      deadline: draft.deadline || null,
      photos: draft.photos,
      ai_details: Object.keys(draft.work_answers).length ? draft.work_answers : null,
      budget_type: draft.budget_type,
    };
    if (draft.budget_type === "range") {
      payload.budget_min = draft.budget_min ? parseInt(draft.budget_min, 10) : null;
      payload.budget_max = draft.budget_max ? parseInt(draft.budget_max, 10) : null;
    } else {
      payload.budget = draft.budget ? parseInt(draft.budget, 10) : null;
    }
    return payload;
  };

  const submitTask = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/tasks", buildPayload());
      localStorage.removeItem(DRAFT_KEY);
      toast.success(t("success"));
      navigate(`/tasks/${data.id}`, { replace: true });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const finishWithAuth = async () => {
    if (user) {
      await submitTask();
      return;
    }
    setSubmitting(true);
    try {
      if (emailFallback) {
        await api.post("/auth/register", { email, role: "customer", name: name || "Клиент" });
        const verify = await api.post("/auth/verify", { email, otp_code: otpCode });
        localStorage.setItem("token", verify.data.token);
        await submitTask();
        return;
      }
      if (otpStep) {
        const verify = await api.post("/auth/phone/verify-otp", {
          phone,
          otp_id: window.__treaboOtpId,
          code: otpCode,
        });
        localStorage.setItem("token", verify.data.token);
        await submitTask();
        return;
      }
      const sent = await api.post("/auth/phone/send-otp", {
        phone,
        password,
        name: name || "Клиент",
        role: "customer",
        purpose: "register",
      });
      if (sent.data?.otp_id) {
        window.__treaboOtpId = sent.data.otp_id;
        setOtpStep(true);
        toast.success("Код отправлен по SMS");
      } else if (sent.data?.token) {
        localStorage.setItem("token", sent.data.token);
        await submitTask();
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (step === "work" && works.length === 0) goNextFrom("work");
    if (step === "questions" && questions.length === 0) goNextFrom("questions");
  }, [step, works.length, questions.length]);

  return (
    <div className="flex flex-col h-full bg-white" data-testid="create-task-page">
      <TopBar title={t("new_task")} onBack={stepIndex > 0 ? back : () => navigate(-1)} />
      <div className="px-5 pb-2">
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div className="h-full bg-black transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="scroll-area px-5 pb-8 flex flex-col gap-4">
        {step === "prompt" && (
          <>
            <h2 className="text-xl font-extrabold">Опишите задачу</h2>
            <textarea
              className="textarea-base min-h-[140px]"
              value={draft.prompt}
              onChange={(e) => update("prompt", e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (draft.prompt.trim()) goNextFrom("prompt"); } }}
              placeholder="Например: нужен мастер для покраски стен в двухкомнатной квартире"
              data-testid="wizard-prompt"
            />
            <button type="button" className="btn-primary" disabled={!draft.prompt.trim()} onClick={() => goNextFrom("prompt")}>
              Продолжить
            </button>
          </>
        )}

        {step === "details" && (
          <>
            <h2 className="text-xl font-extrabold">Уточните заявку</h2>
            <input className="input-base" placeholder="Заголовок" value={draft.title} onChange={(e) => update("title", e.target.value)} />
            <textarea className="textarea-base min-h-[120px]" placeholder="Описание" value={draft.description || draft.prompt} onChange={(e) => update("description", e.target.value)} />
            <input className="input-base" placeholder="Город" value={draft.city} onChange={(e) => update("city", e.target.value)} />
            <button type="button" className="btn-secondary" disabled={aiLoading} onClick={runAiCheck}>
              {aiLoading ? t("loading") : "Проверить"}
            </button>
            <button type="button" className="btn-primary" disabled={!draft.city} onClick={() => goNextFrom("details")}>Продолжить</button>
          </>
        )}

        {step === "category" && (
          <>
            <h2 className="text-xl font-extrabold">Какая услуга нужна?</h2>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { update("category", c.id); update("category_id", c.id); }}
                  className={`rounded-2xl p-3 text-left text-sm font-semibold ${draft.category_id === c.id ? "bg-black text-white" : "bg-lavender-50"}`}
                >
                  {c.name_ru}
                </button>
              ))}
            </div>
            <button type="button" className="btn-primary" disabled={!draft.category_id} onClick={() => goNextFrom("category")}>Продолжить</button>
          </>
        )}

        {step === "work" && works.length > 0 && (
          <>
            <h2 className="text-xl font-extrabold">Работы Treabo</h2>
            {works.map((w) => (
              <button key={w.id} type="button" onClick={() => update("work_id", w.id)} className={`w-full rounded-2xl p-3 text-left ${draft.work_id === w.id ? "bg-black text-white" : "bg-lavender-50"}`}>
                {w.title}
              </button>
            ))}
            <button type="button" className="btn-primary" onClick={() => goNextFrom("work")}>Продолжить</button>
          </>
        )}

        {step === "questions" && questions.length > 0 && (
          <>
            <h2 className="text-xl font-extrabold">Уточняющие вопросы</h2>
            {questions.map((q) => (
              <div key={q.id}>
                <label className="text-sm font-semibold text-neutral-600 mb-1 block">{q.question || q.title}</label>
                <input
                  className="input-base"
                  value={draft.work_answers[q.id] || ""}
                  onChange={(e) => update("work_answers", { ...draft.work_answers, [q.id]: e.target.value })}
                />
              </div>
            ))}
            <button type="button" className="btn-primary" onClick={() => goNextFrom("questions")}>Продолжить</button>
          </>
        )}

        {step === "deadline" && (
          <>
            <h2 className="text-xl font-extrabold">Когда нужна услуга?</h2>
            {["Как можно скорее", "В ближайшие дни", "В течение недели", "Не срочно"].map((opt) => (
              <button key={opt} type="button" onClick={() => update("deadline", opt)} className={`w-full rounded-2xl p-3 text-left ${draft.deadline === opt ? "bg-black text-white" : "bg-lavender-50"}`}>
                {opt}
              </button>
            ))}
            <button type="button" className="btn-primary" onClick={() => goNextFrom("deadline")}>Продолжить</button>
          </>
        )}

        {step === "address" && (
          <>
            <h2 className="text-xl font-extrabold">Адрес</h2>
            <input className="input-base" placeholder="Адрес" value={draft.address} onChange={(e) => update("address", e.target.value)} />
            <button type="button" className="btn-secondary" onClick={() => {
              if (coords) {
                update("lat", coords.lat);
                update("lng", coords.lng);
              } else requestGeo();
            }}>
              <Lucide.MapPin size={16} className="inline mr-1" /> Использовать моё местоположение
            </button>
            <YandexAddressMap
              lat={draft.lat}
              lng={draft.lng}
              onChange={({ lat, lng, address }) => {
                update("lat", lat);
                update("lng", lng);
                if (address) update("address", address);
              }}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={draft.address && (!draft.lat || !draft.lng)}
              onClick={() => goNextFrom("address")}
            >
              Продолжить
            </button>
          </>
        )}

        {step === "budget" && (
          <>
            <h2 className="text-xl font-extrabold">Бюджет</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => update("budget_type", "fixed")} className={`flex-1 rounded-2xl p-3 font-semibold ${draft.budget_type === "fixed" ? "bg-black text-white" : "bg-lavender-50"}`}>Точная сумма</button>
              <button type="button" onClick={() => update("budget_type", "range")} className={`flex-1 rounded-2xl p-3 font-semibold ${draft.budget_type === "range" ? "bg-black text-white" : "bg-lavender-50"}`}>Интервал</button>
            </div>
            {draft.budget_type === "fixed" ? (
              <input className="input-base" inputMode="numeric" placeholder="Сумма, ₽" value={draft.budget} onChange={(e) => update("budget", e.target.value.replace(/\D/g, ""))} />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input className="input-base" inputMode="numeric" placeholder="От" value={draft.budget_min} onChange={(e) => update("budget_min", e.target.value.replace(/\D/g, ""))} />
                <input className="input-base" inputMode="numeric" placeholder="До" value={draft.budget_max} onChange={(e) => update("budget_max", e.target.value.replace(/\D/g, ""))} />
              </div>
            )}
            <button type="button" className="btn-primary" onClick={() => goNextFrom("budget")}>Продолжить</button>
          </>
        )}

        {step === "media" && (
          <>
            <h2 className="text-xl font-extrabold">Добавьте фото или документ для задания</h2>
            <div className="grid grid-cols-3 gap-2">
              {draft.photos.map((p) => (
                <div key={p} className="aspect-square rounded-2xl overflow-hidden bg-lavender-50">
                  <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {draft.photos.length < 10 && (
                <label className="aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer">
                  {uploading ? <Lucide.Loader2 className="animate-spin" /> : <Lucide.Plus />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
                </label>
              )}
            </div>
            <button type="button" className="btn-primary" onClick={() => goNextFrom("media")}>
              {draft.photos.length ? "Продолжить" : "Пропустить"}
            </button>
          </>
        )}

        {step === "finish" && (
          <>
            <h2 className="text-xl font-extrabold">До создания заявки осталось чуть-чуть</h2>
            {user ? (
              <button type="button" className="btn-primary" disabled={submitting} onClick={submitTask}>
                {submitting ? t("loading") : "Создать заявку"}
              </button>
            ) : (
              <>
                {!emailFallback && !otpStep && (
                  <>
                    <input className="input-base" placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <input className="input-base" placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} />
                    <input className="input-base" type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" className="btn-primary" disabled={submitting} onClick={finishWithAuth}>Подтвердить по SMS</button>
                    <button type="button" className="text-sm text-neutral-500 underline" onClick={() => setEmailFallback(true)}>
                      Регистрация через e-mail, если СМС не приходит
                    </button>
                  </>
                )}
                {emailFallback && (
                  <>
                    <input className="input-base" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input className="input-base" placeholder="Код из письма" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
                    <button type="button" className="btn-secondary" onClick={async () => {
                      try {
                        await api.post("/auth/register", { email, role: "customer", name: name || "Клиент" });
                        toast.success("Код отправлен на e-mail");
                      } catch (err) { toast.error(formatApiError(err)); }
                    }}>Отправить код</button>
                    <button type="button" className="btn-primary" disabled={submitting} onClick={finishWithAuth}>Подтвердить и создать</button>
                  </>
                )}
                {otpStep && (
                  <>
                    <input className="input-base" placeholder="Код из SMS" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
                    <button type="button" className="btn-primary" disabled={submitting} onClick={finishWithAuth}>Подтвердить</button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
