import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useLang } from "../i18n";
import { useAuth } from "../auth";
import { TopBar, LangSwitcher } from "../components/Layout";
import { formatApiError } from "../api";
import { applyPhoneMask } from "../utils/phoneMask";

export default function Register() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { register } = useAuth();

  const [role, setRole] = useState(params.get("role") || "customer");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  const phoneDigits = (phone.match(/\d/g) || []).length;
  const canSubmit =
    phoneDigits >= 10 && password.length >= 4 && name.trim().length >= 1;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const u = await register({ phone, password, name, city, role });
      toast.success(t("success"));
      navigate(u.role === "customer" ? "/home" : "/orders", { replace: true });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-lavender-50" data-testid="register-page">
      <TopBar title="" right={<LangSwitcher />} />
      <form onSubmit={onSubmit} className="flex-1 flex flex-col px-6 pb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-black mb-6">{t("register")}</h1>

        <div className="flex bg-white rounded-full p-1 mb-5 border border-neutral-100">
          <button
            data-testid="role-customer-btn"
            type="button"
            onClick={() => setRole("customer")}
            className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${role === "customer" ? "bg-black text-white" : "text-neutral-500"}`}
          >{t("role_customer")}</button>
          <button
            data-testid="role-specialist-btn"
            type="button"
            onClick={() => setRole("specialist")}
            className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${role === "specialist" ? "bg-black text-white" : "text-neutral-500"}`}
          >{t("role_specialist")}</button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            data-testid="register-name-input"
            placeholder={t("name_placeholder")}
            className="input-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="input-base flex items-center gap-3">
            <span className="text-xl">🇷🇺</span>
            <input
              data-testid="register-phone-input"
              type="tel"
              inputMode="tel"
              placeholder={t("phone_placeholder")}
              value={phone}
              onChange={(e) => setPhone(applyPhoneMask(e.target.value))}
              className="bg-transparent flex-1 outline-none"
            />
          </div>
          <input
            data-testid="register-password-input"
            type="password"
            placeholder={t("password_placeholder")}
            className="input-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            data-testid="register-city-input"
            placeholder={t("city_placeholder")}
            className="input-base"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        {!canSubmit && !loading ? (
          <p className="text-xs text-neutral-500 mt-3 leading-relaxed" data-testid="register-submit-hint">
            {t("register_submit_hint")}
          </p>
        ) : null}

        <div className="flex-1" />

        <div className="flex flex-col gap-3">
          <button
            data-testid="register-submit-btn"
            type="submit"
            disabled={!canSubmit || loading}
            className={canSubmit && !loading ? "btn-primary" : "btn-disabled"}
          >
            {loading ? t("loading") : t("continue")}
          </button>
          <button
            data-testid="register-to-login-btn"
            type="button"
            className="text-black font-semibold py-2 hover:opacity-70 transition-opacity"
            onClick={() => navigate("/login")}
          >
            {t("back_to_login")}
          </button>
        </div>
      </form>
    </div>
  );
}
