import { useState, useEffect } from "react";
import * as Lucide from "lucide-react";
import { useLang } from "../i18n";

export default function FiltersSheet({ categories, current, onClose, onApply }) {
  const { t, lang } = useLang();
  const [category, setCategory] = useState(current?.category || "");
  const [city, setCity] = useState(current?.city || "");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="absolute inset-0 z-50 bg-black/40 flex flex-col justify-end animate-fade-in-up"
      onClick={onClose}
      data-testid="filters-sheet-backdrop"
    >
      <div
        className="bg-white rounded-t-3xl flex flex-col max-h-[85%]"
        onClick={(e) => e.stopPropagation()}
        data-testid="filters-sheet"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h3 className="font-extrabold text-lg">{t("filters")}</h3>
          <button data-testid="close-filters-btn" onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-lavender-50">
            <Lucide.X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold text-neutral-600 mb-2">{t("city")}</p>
            <input
              data-testid="filter-city-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("city_placeholder")}
              className="input-base"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-600 mb-2">{t("category")}</p>
            <div className="flex flex-wrap gap-2">
              <button
                data-testid="filter-cat-all"
                onClick={() => setCategory("")}
                className={`px-3 py-2 rounded-full text-sm font-semibold ${!category ? "bg-black text-white" : "bg-lavender-50 text-black"}`}
              >{t("all_categories")}</button>
              {categories.map((c) => {
                const Icon = Lucide[c.icon] || Lucide.Tag;
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    data-testid={`filter-cat-${c.id}`}
                    onClick={() => setCategory(active ? "" : c.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold ${active ? "bg-black text-white" : "bg-lavender-50 text-black"}`}
                  >
                    <Icon size={14} />
                    {lang === "ru" ? c.name_ru : c.name_ro}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-neutral-100 flex gap-2">
          <button
            data-testid="reset-filters-btn"
            onClick={() => { setCategory(""); setCity(""); onApply({}); }}
            className="btn-secondary flex-1 !h-12 text-sm"
          >{t("reset_filters")}</button>
          <button
            data-testid="apply-filters-btn"
            onClick={() => onApply({ category, city })}
            className="btn-primary flex-1 !h-12 text-sm"
          >{t("apply_filters")}</button>
        </div>
      </div>
    </div>
  );
}
