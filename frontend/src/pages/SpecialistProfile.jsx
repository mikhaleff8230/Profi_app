import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as Lucide from "lucide-react";
import { api } from "../api";
import { useLang } from "../i18n";
import { TopBar, SeoHead } from "../components/Layout";
import { fileUrl } from "../components/TaskCard";

export default function SpecialistProfile() {
  const { id } = useParams();
  const { t } = useLang();
  const [spec, setSpec] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    api.get(`/specialists/${id}`).then((r) => setSpec(r.data));
    api.get(`/specialists/${id}/reviews`).then((r) => setReviews(r.data?.data || [])).catch(() => setReviews([]));
  }, [id]);

  if (!spec) return (
    <div className="flex flex-col h-full bg-white">
      <TopBar title="" />
      <p className="text-center py-10 text-neutral-400">{t("loading")}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white" data-testid="specialist-profile-page">
      <SeoHead
        title={`${spec.name} — мастер Treabo`}
        description={spec.bio?.slice(0, 160) || `Профиль специалиста ${spec.name} на Treabo`}
      />
      <TopBar title="" />
      <div className="scroll-area px-5 pb-8">
        <div className="flex flex-col items-center pt-2 pb-6 gap-3 border-b border-neutral-100">
          <div className="w-24 h-24 rounded-full bg-lavender-100 flex items-center justify-center text-3xl font-extrabold overflow-hidden">
            {spec.avatar ? (
              <img src={fileUrl(spec.avatar)} alt="" className="w-full h-full object-cover" />
            ) : (
              spec.name.charAt(0).toUpperCase()
            )}
          </div>
          <h1 className="text-xl font-extrabold">{spec.name}</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 font-bold">
              <Lucide.Star size={16} className="fill-black" />
              {spec.rating?.toFixed(1) || "0.0"}
            </span>
            <span className="text-neutral-500">{spec.reviews_count} {t("reviews")}</span>
          </div>
          {spec.last_seen_label && (
            <p className={`text-xs ${spec.is_online || spec.last_seen_label.startsWith("Сейчас") ? "text-emerald-600 font-semibold" : "text-neutral-400"}`}>
              {spec.last_seen_label}
            </p>
          )}
          {spec.passport_verified ? (
            <span className="text-xs font-semibold text-emerald-600">Паспорт проверен</span>
          ) : (
            <span className="text-xs text-neutral-400">Паспорт не подтвержден</span>
          )}
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

        <section className="mt-2">
          <h2 className="text-lg font-extrabold mb-3">{t("reviews")}</h2>
          {!reviews.length ? (
            <p className="text-sm text-neutral-400">Отзывов пока нет</p>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map((review) => (
                <article key={review.id} className="card-light border border-neutral-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Lucide.Star
                          key={i}
                          size={14}
                          className={i < review.rating ? "fill-black text-black" : "text-neutral-300"}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-neutral-400">{review.customer_name || "Клиент"}</span>
                  </div>
                  {review.comment ? <p className="text-sm whitespace-pre-line">{review.comment}</p> : null}
                  {review.photos?.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {review.photos.map((photo, idx) => (
                        <img
                          key={idx}
                          src={fileUrl(photo)}
                          alt=""
                          className="w-20 h-20 rounded-xl object-cover shrink-0"
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
