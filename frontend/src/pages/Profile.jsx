import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as Lucide from "lucide-react";
import { api, formatApiError } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";

import { fileUrl } from "../components/TaskCard";

function Stat({ label, value }) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-2xl font-extrabold">{value}</span>
      <span className="text-xs text-neutral-500 font-semibold">{label}</span>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuth();
  const { t } = useLang();
  const [stats, setStats] = useState(null);
  const [editingBio, setEditingBio] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [bio, setBio] = useState(user?.bio || "");
  const [name, setName] = useState(user?.name || "");
  const [city, setCity] = useState(user?.city || "");
  const [services, setServices] = useState((user?.services || []).join(", "));
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get("/auth/stats").then((r) => setStats(r.data));
  }, []);

  if (!user) return null;

  const onLogout = () => { logout(); navigate("/", { replace: true }); };

  const saveBio = async () => {
    try {
      const { data } = await api.patch("/auth/profile", { bio });
      setUser(data);
      setEditingBio(false);
      toast.success(t("success"));
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const saveName = async () => {
    try {
      const { data } = await api.patch("/auth/profile", {
        name,
        city,
        services: services.split(",").map(s => s.trim()).filter(Boolean),
      });
      setUser(data);
      setEditingName(false);
      toast.success(t("success"));
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data: upload } = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const { data } = await api.patch("/auth/profile", { avatar: upload.path });
      setUser(data);
      toast.success(t("success"));
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const isSpecialist = user.role === "specialist";

  return (
    <div className="scroll-area bg-white" data-testid="profile-page">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between bg-white sticky top-0 z-20">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("profile_title")}</h1>
        <div className="flex items-center gap-2">
          <button onClick={onLogout} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-lavender-50" data-testid="profile-logout-btn">
            <Lucide.Settings size={20} className="text-neutral-500" />
          </button>
        </div>
      </div>

      <div className="px-5 pb-8 flex flex-col gap-5">
        {/* Avatar + rating row */}
        <div className="flex items-start gap-4">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-lavender-100 shrink-0">
            {user.avatar ? (
              <img src={fileUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-extrabold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              data-testid="avatar-upload-btn"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-white/95 flex items-center justify-center shadow"
            >
              {uploading ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Camera size={14} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
          </div>

          {isSpecialist && (
            <div className="flex flex-col gap-2 pt-1 flex-1">
              <div className="flex items-center gap-2">
                <Lucide.Star size={20} className="fill-black text-black" />
                <span className="text-xl font-extrabold">{(user.rating || 0).toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Lucide.MessageSquare size={18} className="text-neutral-500" />
                <span>{user.reviews_count || 0} {t("reviews")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <Lucide.PlusCircle size={18} />
                <span>{t("highly_rated")}</span>
              </div>
            </div>
          )}
        </div>

        {/* Name + verification */}
        {!editingName ? (
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight">{user.name}</h2>
            <button
              data-testid="edit-name-btn"
              onClick={() => setEditingName(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-lavender-50 shrink-0"
            >
              <Lucide.Pencil size={18} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2" data-testid="edit-name-form">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-base" data-testid="profile-name-input" placeholder={t("name_placeholder")} />
            <input value={city} onChange={(e) => setCity(e.target.value)} className="input-base" data-testid="profile-city-input" placeholder={t("city_placeholder")} />
            {isSpecialist && (
              <input value={services} onChange={(e) => setServices(e.target.value)} className="input-base" placeholder={t("services")} data-testid="profile-services-input" />
            )}
            <div className="flex gap-2">
              <button onClick={() => setEditingName(false)} className="btn-secondary flex-1 !h-11 text-sm">{t("cancel")}</button>
              <button onClick={saveName} className="btn-primary flex-1 !h-11 text-sm" data-testid="profile-save-name-btn">{t("save")}</button>
            </div>
          </div>
        )}

        {isSpecialist && (
          <div className="bg-lavender-100 self-start rounded-full px-3 py-1.5 flex items-center gap-2 text-sm font-semibold">
            <Lucide.Shield size={14} />
            Верификация паспорта — только в мобильном приложении мастера
          </div>
        )}

        {/* Statistics row */}
        <button
          className="card-light bg-lavender-50 border-0 flex items-center justify-between text-left hover:bg-lavender-100 transition-colors"
          data-testid="my-stats-row"
        >
          <h3 className="font-extrabold text-lg">{t("my_statistics")}</h3>
          <Lucide.ChevronRight size={20} className="text-neutral-400" />
        </button>

        {stats && (
          <div className="grid grid-cols-3 gap-3" data-testid="stats-grid">
            {stats.role === "specialist" ? (
              <>
                <Stat label={t("stat_applied")} value={stats.applied} />
                <Stat label={t("stat_accepted")} value={stats.accepted} />
                <Stat label={t("stat_chats")} value={stats.active_chats} />
              </>
            ) : (
              <>
                <Stat label={t("stat_posted")} value={stats.posted} />
                <Stat label={t("stat_open")} value={stats.open} />
                <Stat label={t("stat_in_progress")} value={stats.in_progress} />
              </>
            )}
          </div>
        )}

        {/* О себе */}
        <div>
          <h3 className="font-extrabold text-lg mb-2">{t("about_me")}</h3>
          {!editingBio ? (
            <div className="flex items-start gap-2">
              <p className="text-base text-neutral-700 flex-1 whitespace-pre-line">
                {user.bio || <span className="text-neutral-400">{t("about_me_placeholder")}</span>}
              </p>
              <button data-testid="edit-bio-btn" onClick={() => { setBio(user.bio || ""); setEditingBio(true); }} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-lavender-50 shrink-0">
                <Lucide.Pencil size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2" data-testid="edit-bio-form">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="textarea-base min-h-[120px]" data-testid="profile-bio-input" placeholder={t("bio_placeholder")} />
              <div className="flex gap-2">
                <button onClick={() => setEditingBio(false)} className="btn-secondary flex-1 !h-11 text-sm">{t("cancel")}</button>
                <button onClick={saveBio} className="btn-primary flex-1 !h-11 text-sm" data-testid="profile-save-bio-btn">{t("save")}</button>
              </div>
            </div>
          )}
        </div>

        {/* Services chips */}
        {isSpecialist && user.services?.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-neutral-400 uppercase mb-2">{t("services")}</p>
            <div className="flex flex-wrap gap-2">
              {user.services.map((s, i) => (
                <span key={i} className="bg-lavender-100 rounded-full px-3 py-1 text-sm font-semibold">{s}</span>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-neutral-100 pt-4 flex items-center gap-3 text-sm text-neutral-500">
          <Lucide.Phone size={16} />
          <span>{user.phone}</span>
          {user.city && (
            <>
              <span>•</span>
              <Lucide.MapPin size={16} />
              <span>{user.city}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
