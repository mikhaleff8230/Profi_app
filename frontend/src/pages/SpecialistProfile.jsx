import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as Lucide from "lucide-react";
import { api } from "../api";
import { useLang } from "../i18n";
import { TopBar } from "../components/Layout";

export default function SpecialistProfile() {
  const { id } = useParams();
  const { t } = useLang();
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    api.get(`/specialists/${id}`).then((r) => setSpec(r.data));
  }, [id]);

  if (!spec) return (
    <div className="flex flex-col h-full bg-white">
      <TopBar title="" />
      <p className="text-center py-10 text-neutral-400">{t("loading")}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white" data-testid="specialist-profile-page">
      <TopBar title="" />
      <div className="scroll-area px-5 pb-8">
        <div className="flex flex-col items-center pt-2 pb-6 gap-3 border-b border-neutral-100">
          <div className="w-24 h-24 rounded-full bg-lavender-100 flex items-center justify-center text-3xl font-extrabold">
            {spec.name.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-extrabold">{spec.name}</h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 font-bold">
              <Lucide.Star size={16} className="fill-black" />
              {spec.rating?.toFixed(1) || "0.0"}
            </span>
            <span className="text-neutral-500">{spec.reviews_count} {t("reviews")}</span>
          </div>
        </div>

        <div className="py-5 flex flex-col gap-4">
          {spec.city && (
            <div className="flex items-center gap-3 text-sm">
              <Lucide.MapPin size={18} className="text-neutral-500" />
              <span>{spec.city}</span>
            </div>
          )}
          {spec.bio && (
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase mb-1">{t("bio")}</p>
              <p className="text-sm whitespace-pre-line">{spec.bio}</p>
            </div>
          )}
          {spec.services?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">{t("services")}</p>
              <div className="flex flex-wrap gap-2">
                {spec.services.map((s, i) => (
                  <span key={i} className="bg-lavender-100 rounded-full px-3 py-1 text-xs font-semibold">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
