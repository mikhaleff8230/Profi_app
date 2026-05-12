import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as Lucide from "lucide-react";
import { api, formatApiError } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { useGeo } from "../geo";
import { TopBar } from "../components/Layout";
import { fileUrl } from "../components/TaskCard";

export default function CreateTask() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { coords, request, status } = useGeo();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    city: user?.city || "",
    address: "",
    budget: "",
    lat: null,
    lng: null,
    photos: [],
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      const payload = {
        ...form,
        budget: form.budget ? parseInt(form.budget, 10) : null,
      };
      const { data } = await api.post("/tasks", payload);
      toast.success(t("success"));
      navigate(`/tasks/${data.id}`, { replace: true });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files.slice(0, 5 - form.photos.length)) {
        const fd = new FormData();
        fd.append("file", file);
        const { data } = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setForm((f) => ({ ...f, photos: [...f.photos, data.path] }));
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removePhoto = (path) => setForm((f) => ({ ...f, photos: f.photos.filter((p) => p !== path) }));

  const attachLocation = () => {
    if (coords) {
      setForm((f) => ({ ...f, lat: coords.lat, lng: coords.lng }));
      toast.success(t("location_added"));
    } else {
      request();
      toast.info(t("loading"));
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

        {/* Photos */}
        <div>
          <label className="text-sm font-semibold text-neutral-600 mb-2 block">{t("photos")}</label>
          <div className="grid grid-cols-3 gap-2">
            {form.photos.map((p) => (
              <div key={p} className="relative aspect-square rounded-2xl overflow-hidden bg-lavender-50">
                <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  data-testid={`remove-photo-${p}`}
                  onClick={() => removePhoto(p)}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center"
                ><Lucide.X size={14} /></button>
              </div>
            ))}
            {form.photos.length < 5 && (
              <label
                data-testid="add-photo-btn"
                className="aspect-square rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-black text-neutral-500"
              >
                {uploading ? (
                  <Lucide.Loader2 size={22} className="animate-spin" />
                ) : (
                  <>
                    <Lucide.Plus size={22} />
                    <span className="text-[10px] font-semibold">{t("add_photo")}</span>
                  </>
                )}
                <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
              </label>
            )}
          </div>
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

        <button
          type="button"
          data-testid="attach-location-btn"
          onClick={attachLocation}
          className={`flex items-center justify-center gap-2 rounded-2xl h-12 text-sm font-semibold transition-colors ${form.lat ? "bg-green-50 text-green-700" : "bg-lavender-50 hover:bg-lavender-100 text-black"}`}
        >
          <Lucide.MapPin size={18} />
          {form.lat ? t("location_added") : (status === "denied" ? t("enable_geo") : t("use_my_location"))}
        </button>

        <div className="pt-2">
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
