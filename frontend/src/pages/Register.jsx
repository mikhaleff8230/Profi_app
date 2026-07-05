import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useLang } from "../i18n";
import { useAuth } from "../auth";
import { TopBar, SiteLogo } from "../components/Layout";
import { api, formatApiError } from "../api";
import { applyPhoneMask } from "../utils/phoneMask";
import { resetEcho } from "../realtime";

export default function Register() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setUser } = useAuth();

  const [role, setRole] = useState(params.get("role") || "customer");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpId, setOtpId] = useState("");
  const [emailFallback, setEmailFallback] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const phoneDigits = (phone.match(/\d/g) || []).length;
  const canSubmit = phoneDigits >= 10 && password.length >= 4 && name.trim().length >= 1;
  const canVerify = otpCode.trim().length >= 4;

  const finishAuth = (data) => {
    resetEcho();
    localStorage.setItem("token", data.token);
    setUser(data.user);
    toast.success(t("success"));
    navigate(data.user.role === "customer" ? "/home" : "/orders", { replace: true });
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (emailFallback) {
      if (!email.trim() || !otpCode.trim()) return;
      setLoading(true);
      try {
        await api.post("/auth/register", { email, role, name: name || "Клиент" });
        const { data } = await api.post("/auth/verify", { email, otp_code: otpCode });
        finishAuth(data);
      } catch (err) {
        toast.error(formatApiError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (otpStep) {
      if (!canVerify) return;
      setLoading(true);
      try {
        const { data } = await api.post("/auth/phone/verify-otp", {
          phone,
          otp_id: otpId,
          code: otpCode,
        });
        finishAuth(data);
      } catch (err) {
        toast.error(formatApiError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!canSubmit) return;
    setLoading(true);
    try {
      const { data } = await api.post("/auth/phone/send-otp", {
        phone,
        password,
        name,
        city,
        role,
        purpose: "register",
      });
      if (data.otp_id) {
        setOtpId(data.otp_id);
        setOtpStep(true);
        toast.success("Код отправлен по SMS");
        return;
      }
      if (data.token) {
        finishAuth(data);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string" && detail.toLowerCase().includes("email")) {
        setEmailFallback(true);
        toast.message("Попробуйте регистрацию по email");
      } else {
        toast.error(formatApiError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-lavender-50" data-testid="register-page">
      <TopBar title="" />
      <form onSubmit={onSubmit} className="flex-1 flex flex-col px-6 pb-8">
        <div className="mb-4 flex justify-center">
          <SiteLogo />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-black mb-6">
          {otpStep || emailFallback ? "Введите код" : t("register")}
        </h1>

        {!otpStep && !emailFallback && (
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
        )}

        {!otpStep && !emailFallback ? (
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
        ) : emailFallback ? (
          <div className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              className="input-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              data-testid="register-otp-input"
              type="text"
              inputMode="numeric"
              placeholder="Код из email"
              className="input-base"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
        ) : (
          <input
            data-testid="register-otp-input"
            type="text"
            inputMode="numeric"
            placeholder="Код из SMS"
            className="input-base"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        )}

        {!otpStep && !emailFallback && !canSubmit && !loading ? (
          <p className="text-xs text-neutral-500 mt-3 leading-relaxed" data-testid="register-submit-hint">
            {t("register_submit_hint")}
          </p>
        ) : null}

        <div className="flex-1" />

        <div className="flex flex-col gap-3">
          <button
            data-testid="register-submit-btn"
            type="submit"
            disabled={loading || (otpStep || emailFallback ? !canVerify : !canSubmit)}
            className={(otpStep || emailFallback ? canVerify : canSubmit) && !loading ? "btn-primary" : "btn-disabled"}
          >
            {loading ? t("loading") : otpStep || emailFallback ? "Подтвердить" : t("continue")}
          </button>
          {(otpStep || emailFallback) && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setOtpStep(false);
                setEmailFallback(false);
                setOtpCode("");
              }}
            >
              Назад
            </button>
          )}
          {!otpStep && !emailFallback && (
            <button
              type="button"
              className="text-sm text-neutral-500 underline"
              onClick={() => setEmailFallback(true)}
            >
              Регистрация по email
            </button>
          )}
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
