import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as Lucide from "lucide-react";
import { api, formatApiError } from "../api";
import { useAuth } from "../auth";
import { useLang } from "../i18n";
import { LangSwitcher } from "../components/Layout";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuth();
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    city: user?.city || "",
    bio: user?.bio || "",
    services: (user?.services || []).join(", "),
  });
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const onLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        city: form.city,
        bio: form.bio,
        services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const { data } = await api.patch("/auth/profile", payload);
      setUser(data);
      toast.success(t("success"));
      setEditing(false);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="scroll-area bg-white" data-testid="profile-page">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between bg-white sticky top-0 z-20">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("profile")}</h1>
        <LangSwitcher />
      </div>

      <div className="px-5 pb-8">
        <div className="flex flex-col items-center pt-2 pb-6 gap-3 border-b border-neutral-100">
          <div className="w-24 h-24 rounded-full bg-lavender-100 flex items-center justify-center text-3xl font-extrabold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-extrabold">{user.name}</h2>
            <p className="text-sm text-neutral-500">{user.role === "customer" ? t("customer") : t("specialist")}</p>
          </div>
          {user.role === "specialist" && (
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 font-bold">
                <Lucide.Star size={16} className="fill-black" />
                {user.rating?.toFixed(1) || "0.0"}
              </span>
              <span className="text-neutral-500">{user.reviews_count} {t("reviews")}</span>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="py-5 flex flex-col gap-4">
            <Row icon={Lucide.Phone} label={user.phone} />
            {user.city && <Row icon={Lucide.MapPin} label={user.city} />}
            {user.bio && (
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase mb-1">{t("bio")}</p>
                <p className="text-sm">{user.bio}</p>
              </div>
            )}
            {user.role === "specialist" && user.services?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">{t("services")}</p>
                <div className="flex flex-wrap gap-2">
                  {user.services.map((s, i) => (
                    <span key={i} className="bg-lavender-100 rounded-full px-3 py-1 text-xs font-semibold">{s}</span>
                  ))}
                </div>
              </div>
            )}
            <button
              data-testid="profile-edit-btn"
              onClick={() => setEditing(true)}
              className="btn-secondary mt-2"
            >
              <Lucide.Pencil size={16} className="mr-2" /> {t("edit_profile")}
            </button>
            <button
              data-testid="profile-logout-btn"
              onClick={onLogout}
              className="text-red-600 font-semibold py-3 hover:opacity-70"
            >{t("logout")}</button>
          </div>
        ) : (
          <div className="py-5 flex flex-col gap-3">
            <input
              className="input-base"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("name_placeholder")}
              data-testid="profile-name-input"
            />
            <input
              className="input-base"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder={t("city_placeholder")}
              data-testid="profile-city-input"
            />
            <textarea
              className="textarea-base min-h-[100px]"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder={t("bio_placeholder")}
              data-testid="profile-bio-input"
            />
            {user.role === "specialist" && (
              <input
                className="input-base"
                value={form.services}
                onChange={(e) => setForm({ ...form, services: e.target.value })}
                placeholder="Уборка, Окна, Кухня"
                data-testid="profile-services-input"
              />
            )}
            <div className="flex gap-2 mt-2">
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1 !h-12 text-sm">{t("cancel")}</button>
              <button
                data-testid="profile-save-btn"
                onClick={save}
                disabled={saving}
                className="btn-primary flex-1 !h-12 text-sm"
              >{saving ? t("loading") : t("save")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon size={18} className="text-neutral-500" />
      <span>{label}</span>
    </div>
  );
}
