import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import PasswordInput from '@/components/ui/password-input';
import { useTranslation } from 'next-i18next';
import * as yup from 'yup';
import Link from '@/components/ui/link';
import Form from '@/components/ui/forms/form';
import { Routes } from '@/config/routes';
import { useLogin, useSendOtpCode, useOtpLogin, useVerifyPinCode } from '@/data/user';
import type { LoginInput, OtpLoginInput, PinLoginInput } from '@/types';
import { useState } from 'react';
import Alert from '@/components/ui/alert';
import Router from 'next/router';
import {
  allowedRoles,
  hasAccess,
  setAuthCredentials,
} from '@/utils/auth-utils';
import AuthTabs from './auth-tabs';
import PhoneInput from '@/components/ui/forms/phone-input';
import OtpCodeInput from './otp-code-input';
import PinCodeInput from './pin-code-input';
import { toast } from 'react-toastify';

function goToDashboard() {
  if (typeof window !== 'undefined') {
    window.location.assign(Routes.dashboard);
    return;
  }
  Router.push(Routes.dashboard);
}

const loginFormSchema = yup.object().shape({
  email: yup
    .string()
    .email('form:error-email-format')
    .required('form:error-email-required'),
  password: yup.string().required('form:error-password-required'),
});

const LoginForm = () => {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'phone' | 'email'>('phone');
  
  // Состояние для OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  
  // Состояние для PIN
  const [pinCode, setPinCode] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [showPinForm, setShowPinForm] = useState(false);
  
  const { mutate: login, isLoading } = useLogin();
  const { mutate: sendOtp } = useSendOtpCode();
  const { mutate: otpLogin } = useOtpLogin();
  const { mutate: verifyPin } = useVerifyPinCode();

  function onSubmit({ email, password }: LoginInput) {
    login(
      {
        email,
        password,
      },
      {
        onSuccess: (data) => {
          if (data?.token) {
            if (hasAccess(allowedRoles, data?.permissions)) {
              setAuthCredentials(data?.token, data?.permissions);
              goToDashboard();
              return;
            }
            setErrorMessage('form:error-enough-permission');
          } else {
            setErrorMessage('form:error-credential-wrong');
          }
        },
        onError: (error: any) => {
          const message =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            'Не удалось войти. Проверьте email/пароль и что API доступен (api.treabo.md).';
          setErrorMessage(message);
          toast.error(message);
        },
      }
    );
  }

  // Обработчик отправки OTP
  const handleSendOtp = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    
    setIsSendingOtp(true);
    setOtpError('');
    sendOtp(
      { phone_number: phoneNumber },
      {
        onSuccess: (data: any) => {
          if (data.success && data.id) {
            setOtpId(data.id);
            setIsSendingOtp(false);
            toast.success(`Код отправлен на ${phoneNumber}`);
          } else {
            setIsSendingOtp(false);
            toast.error('Ошибка отправки кода');
          }
        },
        onError: (error: any) => {
          setIsSendingOtp(false);
          toast.error(error.response?.data?.message || 'Ошибка отправки кода');
        },
      }
    );
  };

  // Обработчик проверки OTP кода
  const handleVerifyOtp = (code: string) => {
    if (!otpId) return;
    
    setIsVerifyingOtp(true);
    setOtpError('');
    otpLogin(
      {
        otp_id: otpId,
        code: code,
        phone_number: phoneNumber,
      },
      {
        onSuccess: (data) => {
          if (data?.token) {
            if (hasAccess(allowedRoles, data?.permissions)) {
              setAuthCredentials(data?.token, data?.permissions);
              goToDashboard();
              return;
            }
            setOtpError('Недостаточно прав доступа');
            setIsVerifyingOtp(false);
          } else {
            setOtpError('Ошибка входа');
            setIsVerifyingOtp(false);
          }
        },
        onError: (error: any) => {
          setIsVerifyingOtp(false);
          setOtpError(error.response?.data?.message || 'Неверный код');
          toast.error(error.response?.data?.message || 'Неверный код');
        },
      }
    );
  };

  // Обработчик проверки PIN кода
  const handleVerifyPin = (code: string) => {
    if (!phoneNumber) {
      setPinError('Введите номер телефона');
      return;
    }
    
    setIsVerifyingPin(true);
    setPinError('');
    verifyPin(
      {
        phone_number: phoneNumber,
        pin_code: code,
      },
      {
        onSuccess: (data) => {
          if (data?.token) {
            if (hasAccess(allowedRoles, data?.permissions)) {
              setAuthCredentials(data?.token, data?.permissions);
              goToDashboard();
              return;
            }
            setPinError('Недостаточно прав доступа');
            setIsVerifyingPin(false);
          } else {
            setPinError('Ошибка входа');
            setIsVerifyingPin(false);
          }
        },
        onError: (error: any) => {
          setIsVerifyingPin(false);
          setPinError(error.response?.data?.message || 'Неверный PIN-код');
          toast.error(error.response?.data?.message || 'Неверный PIN-код');
        },
      }
    );
  };

  // Сброс состояния при смене вкладки
  const handleTabChange = (tab: 'phone' | 'email') => {
    setActiveTab(tab);
    setOtpId(null);
    setOtpCode('');
    setOtpError('');
    setPhoneNumber('');
    setShowPinForm(false);
    setPinCode('');
    setPinError('');
  };

  return (
    <>
      {/* Переключатель вкладок */}
      <AuthTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Форма входа по телефону */}
      {activeTab === 'phone' && (
        <div className="space-y-4">
          {!showPinForm ? (
            <>
              {!otpId ? (
                <>
                  {/* Поле ввода телефона */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-heading">
                      Телефон
                    </label>
                    <PhoneInput
                      country="ru"
                      value={phoneNumber}
                      onChange={setPhoneNumber}
                      className="mb-4"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || !phoneNumber}
                    loading={isSendingOtp}
                    className="w-full mb-4"
                  >
                    {isSendingOtp ? 'Отправка...' : 'ПОЛУЧИТЬ КОД'}
                  </Button>

                  <div className="relative my-4 flex flex-col items-center justify-center text-sm text-heading">
                    <hr className="w-full" />
                    <span className="absolute -top-2.5 bg-light px-2 -ms-4 start-2/4">
                      {t('common:text-or')}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPinForm(true)}
                    className="w-full"
                  >
                    Войти по PIN-коду
                  </Button>
                </>
              ) : (
                <>
                  {/* Поле ввода OTP кода */}
                  <div>
                    <p className="mb-4 text-center text-sm text-body">
                      Введите код из SMS, отправленный на {phoneNumber}
                    </p>
                    <OtpCodeInput
                      length={6}
                      value={otpCode}
                      onChange={setOtpCode}
                      onComplete={handleVerifyOtp}
                      disabled={isVerifyingOtp}
                      error={otpError}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setOtpId(null);
                        setOtpCode('');
                        setOtpError('');
                      }}
                      disabled={isVerifyingOtp}
                      className="flex-1"
                    >
                      Изменить номер
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || isVerifyingOtp}
                      className="flex-1"
                    >
                      Отправить снова
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Форма входа по PIN-коду */}
              <div>
                <label className="mb-2 block text-sm font-medium text-heading">
                  Телефон
                </label>
                <PhoneInput
                  country="ru"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  className="mb-4"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-heading">
                  PIN-код
                </label>
                <PinCodeInput
                  length={4}
                  value={pinCode}
                  onChange={setPinCode}
                  onComplete={handleVerifyPin}
                  disabled={isVerifyingPin}
                  error={pinError}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPinForm(false);
                  setPinCode('');
                  setPinError('');
                }}
                disabled={isVerifyingPin}
                className="w-full"
              >
                Вернуться к SMS
              </Button>
            </>
          )}
        </div>
      )}

      {/* Форма входа по email */}
      {activeTab === 'email' && (
        <Form<LoginInput> validationSchema={loginFormSchema} onSubmit={onSubmit}>
          {({ register, formState: { errors } }) => (
            <>
              <Input
                label={t('form:input-label-email')}
                {...register('email')}
                type="email"
                variant="outline"
                className="mb-4"
                error={t(errors?.email?.message!)}
              />
              <PasswordInput
                label={t('form:input-label-password')}
                forgotPassHelpText={t('form:input-forgot-password-label')}
                {...register('password')}
                error={t(errors?.password?.message!)}
                variant="outline"
                className="mb-4"
                forgotPageLink={Routes.forgotPassword}
              />
              <Button className="w-full" loading={isLoading} disabled={isLoading}>
                {t('form:button-label-login')}
              </Button>

              <div className="relative mt-8 mb-6 flex flex-col items-center justify-center text-sm text-heading sm:mt-11 sm:mb-8">
                <hr className="w-full" />
                <span className="absolute -top-2.5 bg-light px-2 -ms-4 start-2/4">
                  {t('common:text-or')}
                </span>
              </div>

              <div className="text-center text-sm text-body sm:text-base">
                {t('form:text-no-account')}{' '}
                <Link
                  href={Routes.register}
                  className="font-semibold text-accent underline transition-colors duration-200 ms-1 hover:text-accent-hover hover:no-underline focus:text-accent-700 focus:no-underline focus:outline-none"
                >
                  {t('form:link-register-shop-owner')}
                </Link>
              </div>
            </>
          )}
        </Form>
      )}
      
      {errorMessage ? (
        <Alert
          message={t(errorMessage)}
          variant="error"
          closeable={true}
          className="mt-5"
          onClose={() => setErrorMessage(null)}
        />
      ) : null}
    </>
  );
};

export default LoginForm;
