import { useNavigate } from "react-router-dom";
import { Telescope } from "lucide-react";
import { useLang } from "../i18n";
import { LangSwitcher } from "../components/Layout";

export default function Onboarding() {
  const navigate = useNavigate();
  const { t } = useLang();
  return (
    <div className="flex flex-col h-full px-6 pb-8 pt-6 bg-white" data-testid="onboarding-page">
      <div className="flex justify-end">
        <LangSwitcher />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-fade-in-up">
        <div className="relative">
          <Telescope size={140} strokeWidth={1.2} className="text-black" />
          <div className="absolute -right-4 -top-2 text-3xl">✦</div>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-black text-center leading-tight">
          {t("onboarding_title")}
        </h1>
        <p className="text-neutral-500 text-center text-base max-w-xs">{t("onboarding_subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          data-testid="onboarding-specialist-btn"
          className="btn-primary"
          onClick={() => navigate("/register?role=specialist")}
        >
          {t("onboarding_specialist_cta")}
        </button>
        <button
          data-testid="onboarding-customer-btn"
          className="text-black font-semibold py-4 hover:opacity-70 transition-opacity"
          onClick={() => navigate("/register?role=customer")}
        >
          {t("onboarding_customer_cta")}
        </button>
        <button
          data-testid="onboarding-login-btn"
          className="text-neutral-500 text-sm font-semibold py-2 hover:text-black transition-colors"
          onClick={() => navigate("/login")}
        >
          {t("back_to_login")}
        </button>
      </div>
    </div>
  );
}
