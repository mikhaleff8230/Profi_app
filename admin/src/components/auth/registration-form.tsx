import Alert from '@/components/ui/alert';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import PasswordInput from '@/components/ui/password-input';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Routes } from '@/config/routes';
import { useTranslation } from 'next-i18next';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Link from '@/components/ui/link';
import {
  allowedRoles,
  hasAccess,
  setAuthCredentials,
} from '@/utils/auth-utils';
import { Permission } from '@/types';
import { useRegisterMutation, useSendOtpCode, useOtpLogin } from '@/data/user';
import AuthTabs from './auth-tabs';
import PhoneInput from '@/components/ui/forms/phone-input';
import OtpCodeInput from './otp-code-input';
import { toast } from 'react-toastify';

type FormValues = {
  name: string;
  email: string;
  password: string;
  permission: Permission;
};

const registrationFormSchema = yup.object().shape({
  name: yup.string().required('form:error-name-required'),
  email: yup
    .string()
    .email('form:error-email-format')
    .required('form:error-email-required'),
  password: yup.string().required('form:error-password-required'),
  permission: yup.string().default('store_owner').oneOf(['store_owner']),
});

const RegistrationForm = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'phone' | 'email'>('phone');
  
  // Состояние для OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    resolver: yupResolver(registrationFormSchema),
    defaultValues: {
      permission: Permission.StoreOwner,
    },
  });
  
  const router = useRouter();
  const { t } = useTranslation();
  const { mutate: registerUser, isLoading: loading } = useRegisterMutation();
  const { mutate: sendOtp } = useSendOtpCode();
  const { mutate: otpLogin } = useOtpLogin();

  async function onSubmit({ name, email, password, permission }: FormValues) {
    registerUser(
      {
        name,
        email,
        password,
        permission,
      },
      {
        onSuccess: (data) => {
          if (data?.token) {
            if (hasAccess(allowedRoles, data?.permissions)) {
              setAuthCredentials(data?.token, data?.permissions);
              router.push(Routes.dashboard);
              return;
            }
            setErrorMessage('form:error-enough-permission');
          } else {
            setErrorMessage('form:error-credential-wrong');
          }
        },
        onError: (error: any) => {
          Object.keys(error?.response?.data || {}).forEach((field: any) => {
            setError(field, {
              type: 'manual',
              message: error?.response?.data[field],
            });
          });
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
    
    if (!name) {
      toast.error('Введите имя');
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

  // Обработчик проверки OTP кода и регистрации
  const handleVerifyOtp = (code: string) => {
    if (!otpId) return;
    
    setIsVerifyingOtp(true);
    setOtpError('');
    
    // Используем otpLogin для регистрации (он создаст пользователя, если его нет)
    // Передаем permission как строку 'store_owner' - точно так же, как в обычной регистрации
    const permissionValue = 'store_owner'; // Явно передаем строку
    console.log('Sending OTP registration request:', {
      otp_id: otpId,
      phone_number: phoneNumber,
      name: name,
      email: email || `${phoneNumber.replace(/\D/g, '')}@phone.auth`,
      permission: permissionValue,
    });
    
    otpLogin(
      {
        otp_id: otpId,
        code: code,
        phone_number: phoneNumber,
        name: name,
        email: email || `${phoneNumber.replace(/\D/g, '')}@phone.auth`,
        permission: permissionValue, // Передаем строку 'store_owner'
      },
      {
        onSuccess: (data) => {
          if (data?.token) {
            // Логируем для отладки
            console.log('Registration success, permissions:', data?.permissions);
            console.log('Permission details:', {
              permissions: data?.permissions,
              permissionsLength: data?.permissions?.length,
              allowedRoles: allowedRoles,
              hasStoreOwner: data?.permissions?.includes('store_owner'),
              hasCustomer: data?.permissions?.includes('customer'),
            });
            
            if (hasAccess(allowedRoles, data?.permissions)) {
              setAuthCredentials(data?.token, data?.permissions);
              router.push(Routes.dashboard);
              return;
            }
            // Если прав недостаточно, выводим более подробную ошибку
            console.error('Access denied. User permissions:', data?.permissions, 'Allowed roles:', allowedRoles);
            setOtpError('Регистрация успешна, но недостаточно прав. Обратитесь к администратору.');
            setIsVerifyingOtp(false);
          } else {
            setOtpError('Ошибка регистрации');
            setIsVerifyingOtp(false);
          }
        },
        onError: (error: any) => {
          setIsVerifyingOtp(false);
          console.error('Registration error:', error);
          setOtpError(error.response?.data?.message || 'Неверный код');
          toast.error(error.response?.data?.message || 'Неверный код');
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
    setName('');
    setEmail('');
  };

  return (
    <>
      {/* Переключатель вкладок */}
      <AuthTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Форма регистрации по телефону */}
      {activeTab === 'phone' && (
        <div className="space-y-4">
          {!otpId ? (
            <>
              {/* Поле ввода имени */}
              <div>
                <label className="mb-2 block text-sm font-medium text-heading">
                  {t('form:input-label-name')}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  variant="outline"
                  className="mb-4"
                  placeholder="(можно ваше Имя)"
                />
              </div>

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

              {/* Поле email (опционально) */}
              <div>
                <label className="mb-2 block text-sm font-medium text-heading">
                  {t('form:input-label-email')} (опционально)
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="outline"
                  className="mb-4"
                  placeholder={t('form:input-label-email')}
                />
              </div>

              <Button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || !phoneNumber || !name}
                loading={isSendingOtp}
                className="w-full mb-4"
              >
                {isSendingOtp ? 'Отправка...' : 'ПОЛУЧИТЬ КОД'}
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
        </div>
      )}

      {/* Форма регистрации по email */}
      {activeTab === 'email' && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label={t('form:input-label-name')}
            {...register('name')}
            variant="outline"
            className="mb-4"
            error={t(errors?.name?.message!)}
            placeholder="(можно ваше Имя)"
          />
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
            {...register('password')}
            error={t(errors?.password?.message!)}
            variant="outline"
            className="mb-4"
          />
          <Button className="w-full" loading={loading} disabled={loading}>
            {t('form:text-register')}
          </Button>

          {errorMessage ? (
            <Alert
              message={t(errorMessage)}
              variant="error"
              closeable={true}
              className="mt-5"
              onClose={() => setErrorMessage(null)}
            />
          ) : null}
        </form>
      )}

      <div className="relative mt-8 mb-6 flex flex-col items-center justify-center text-sm text-heading sm:mt-11 sm:mb-8">
        <hr className="w-full" />
        <span className="start-2/4 -ms-4 absolute -top-2.5 bg-light px-2">
          {t('common:text-or')}
        </span>
      </div>
      <div className="text-center text-sm text-body sm:text-base">
        {t('form:text-already-account')}{' '}
        <Link
          href={Routes.login}
          className="ms-1 font-semibold text-accent underline transition-colors duration-200 hover:text-accent-hover hover:no-underline focus:text-accent-700 focus:no-underline focus:outline-none"
        >
          {t('form:button-label-login')}
        </Link>
      </div>
    </>
  );
};

export default RegistrationForm;
