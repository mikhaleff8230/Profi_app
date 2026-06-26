import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/ui/button';
import Description from '@/components/ui/description';
import Card from '@/components/common/card';
import { useSetPinCode } from '@/data/user';
import { useTranslation } from 'next-i18next';
import PinCodeInput from './pin-code-input';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

type FormValues = {
  pin_code: string;
};

const pinCodeSchema = yup.object().shape({
  pin_code: yup
    .string()
    .required('PIN-код обязателен')
    .min(4, 'PIN-код должен содержать 4 цифры')
    .max(4, 'PIN-код должен содержать 4 цифры')
    .matches(/^\d{4}$/, 'PIN-код должен состоять из 4 цифр'),
});

export default function PinCodeSetForm() {
  const { t } = useTranslation();
  const { mutate: setPinCode, isLoading: loading } = useSetPinCode();
  const [pinCode, setPinCodeValue] = useState('');
  const [error, setError] = useState('');

  const {
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormValues>({
    resolver: yupResolver(pinCodeSchema),
    defaultValues: {
      pin_code: '',
    },
  });

  const handlePinCodeChange = (value: string) => {
    setPinCodeValue(value);
    setValue('pin_code', value, { shouldValidate: true });
    setError('');
  };

  async function onSubmit(values: FormValues) {
    if (values.pin_code.length !== 4) {
      setError('PIN-код должен содержать 4 цифры');
      return;
    }

    setPinCode(
      {
        pin_code: values.pin_code,
      },
      {
        onSuccess: () => {
          setPinCodeValue('');
          setValue('pin_code', '');
          setError('');
        },
        onError: (error: any) => {
          const errorMessage = error?.response?.data?.message || error?.message || 'Ошибка установки PIN-кода';
          setError(errorMessage);
        },
      }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
        <Description
          title="PIN-код"
          details="Установите PIN-код для быстрого входа в систему. PIN-код должен состоять из 4 цифр."
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />

        <Card className="mb-5 w-full sm:w-8/12 md:w-2/3">
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold leading-none text-body-dark">
              Введите PIN-код (4 цифры)
            </label>
            <PinCodeInput
              length={4}
              value={pinCode}
              onChange={handlePinCodeChange}
              disabled={loading}
              error={error || (errors.pin_code?.message as string)}
            />
          </div>

          <div className="text-end">
            <Button type="submit" loading={loading} disabled={loading || pinCode.length !== 4}>
              {t('form:button-label-save')}
            </Button>
          </div>
        </Card>
      </div>
    </form>
  );
}

