import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLang } from "../i18n";
import { useAuth } from "../auth";
import { TopBar, LangSwitcher } from "../components/Layout";
import { formatApiError } from "../api";
import { applyPhoneMask } from "../utils/phoneMask";

export default function Login() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const phoneDigits = (phone.match(/\d/g) || []).length;
  const canSubmit = phoneDigits >= 10 && password.length >= 4;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const u = await login(phone, password);
      toast.success(t("success"));
      navigate(u.role === "customer" ? "/home" : "/orders", { replace: true });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-lavender-50" data-testid="login-page">
      <TopBar title="" right={<LangSwitcher />} />
      <form onSubmit={onSubmit} className="flex-1 flex flex-col px-6 pb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-black mb-8">{t("your_phone")}</h1>

        <div className="flex flex-col gap-4">
          <div className="input-base flex items-center gap-3">
            <span className="text-xl">🇷🇺</span>
            <input
              data-testid="login-phone-input"
              type="tel"
              inputMode="tel"
              placeholder={t("phone_placeholder")}
              value={phone}
              onChange={(e) => setPhone(applyPhoneMask(e.target.value))}
              className="bg-transparent flex-1 outline-none"
            />
          </div>
          <input
            data-testid="login-password-input"
            type="password"
            placeholder={t("password_placeholder")}
            className="input-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex-1" />

        <div className="flex flex-col gap-3">
          <button
            data-testid="login-submit-btn"
            type="submit"
            disabled={!canSubmit || loading}
            className={canSubmit && !loading ? "btn-primary" : "btn-disabled"}
          >
            {loading ? t("loading") : t("sim_or_sms")}
          </button>
          <button
            data-testid="login-to-register-btn"
            type="button"
            className="btn-secondary"
            onClick={() => navigate("/register")}
          >
            {t("go_to_register")}
          </button>
          <p className="text-center text-xs text-neutral-400 mt-2">{t("works_all_carriers")}</p>
        </div>
      </form>
    </div>
  );
}
