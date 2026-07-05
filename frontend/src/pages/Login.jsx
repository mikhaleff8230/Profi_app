import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLang } from "../i18n";
import { useAuth } from "../auth";
import { TopBar, SiteLogo } from "../components/Layout";
import { api, formatApiError } from "../api";
import { applyPhoneMask } from "../utils/phoneMask";
import { resetEcho } from "../realtime";

export default function Login() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpId, setOtpId] = useState("");
  const [emailFallback, setEmailFallback] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const phoneDigits = (phone.match(/\d/g) || []).length;
  const canSubmit = phoneDigits >= 10 && password.length >= 4;
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
      const { data } = await api.post("/auth/login", { phone, password });
      if (data.otp_id) {
        setOtpId(data.otp_id);
        setOtpStep(true);
        toast.success("Код отправлен по SMS");
        return;
      }
      if (data.status === "otp_sent" && data.email) {
        setEmailFallback(true);
        toast.success("Код отправлен на email");
        return;
      }
      finishAuth(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-lavender-50" data-testid="login-page">
      <TopBar title="" />
      <form onSubmit={onSubmit} className="flex-1 flex flex-col px-6 pb-8">
        <div className="mb-6 flex justify-center">
          <SiteLogo />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-black mb-8">
          {otpStep || emailFallback ? "Введите код" : t("your_phone")}
        </h1>

        {!otpStep && !emailFallback ? (
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
        ) : emailFallback ? (
          <div className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              className="input-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              data-testid="login-otp-input"
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
            data-testid="login-otp-input"
            type="text"
            inputMode="numeric"
            placeholder="Код из SMS"
            className="input-base"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        )}

        <div className="flex-1" />

        <div className="flex flex-col gap-3">
          <button
            data-testid="login-submit-btn"
            type="submit"
            disabled={loading || (otpStep || emailFallback ? !canVerify : !canSubmit)}
            className={(otpStep || emailFallback ? canVerify : canSubmit) && !loading ? "btn-primary" : "btn-disabled"}
          >
            {loading ? t("loading") : otpStep || emailFallback ? "Подтвердить" : t("sim_or_sms")}
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
