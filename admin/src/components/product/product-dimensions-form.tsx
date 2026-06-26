import { Control } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import Card from '@/components/common/card';
import Description from '@/components/ui/description';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import { useFormContext } from 'react-hook-form';

interface ProductDimensionsFormProps {
  control: Control<any>;
  initialValues?: any;
}

export default function ProductDimensionsForm({
  control,
  initialValues,
}: ProductDimensionsFormProps) {
  const { t } = useTranslation();
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="my-5 flex flex-wrap sm:my-8">
      <Description
        title="Габариты товара"
        details="Укажите габариты товара для расчета стоимости доставки. Все поля обязательны для заполнения."
        className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
      />

      <Card className="w-full sm:w-8/12 md:w-2/3">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Вес */}
          <div>
            <Label>
              Вес (граммы) <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              {...register('weight', {
                required: 'Вес обязателен для заполнения',
                valueAsNumber: true,
                min: {
                  value: 1,
                  message: 'Вес должен быть больше 0'
                },
                validate: (value) => {
                  if (!value || value <= 0) {
                    return 'Вес должен быть больше 0';
                  }
                  return true;
                }
              })}
              type="number"
              step="0.01"
              min="0"
              defaultValue={initialValues?.weight || ''}
              error={errors.weight?.message as string}
              variant="outline"
              placeholder="1000"
            />
            <p className="mt-1 text-xs text-gray-500">
              Укажите вес товара в граммах (например: 1000 для 1 кг)
            </p>
          </div>

          {/* Длина */}
          <div>
            <Label>
              Длина (см) <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              {...register('length', {
                required: 'Длина обязательна для заполнения',
                valueAsNumber: true,
                min: {
                  value: 1,
                  message: 'Длина должна быть больше 0'
                },
                validate: (value) => {
                  if (!value || value <= 0) {
                    return 'Длина должна быть больше 0';
                  }
                  return true;
                }
              })}
              type="number"
              step="0.01"
              min="0"
              defaultValue={initialValues?.length || ''}
              error={errors.length?.message as string}
              variant="outline"
              placeholder="30"
            />
            <p className="mt-1 text-xs text-gray-500">
              Укажите длину товара в сантиметрах
            </p>
          </div>

          {/* Ширина */}
          <div>
            <Label>
              Ширина (см) <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              {...register('width', {
                required: 'Ширина обязательна для заполнения',
                valueAsNumber: true,
                min: {
                  value: 1,
                  message: 'Ширина должна быть больше 0'
                },
                validate: (value) => {
                  if (!value || value <= 0) {
                    return 'Ширина должна быть больше 0';
                  }
                  return true;
                }
              })}
              type="number"
              step="0.01"
              min="0"
              defaultValue={initialValues?.width || ''}
              error={errors.width?.message as string}
              variant="outline"
              placeholder="20"
            />
            <p className="mt-1 text-xs text-gray-500">
              Укажите ширину товара в сантиметрах
            </p>
          </div>

          {/* Высота */}
          <div>
            <Label>
              Высота (см) <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              {...register('height', {
                required: 'Высота обязательна для заполнения',
                valueAsNumber: true,
                min: {
                  value: 1,
                  message: 'Высота должна быть больше 0'
                },
                validate: (value) => {
                  if (!value || value <= 0) {
                    return 'Высота должна быть больше 0';
                  }
                  return true;
                }
              })}
              type="number"
              step="0.01"
              min="0"
              defaultValue={initialValues?.height || ''}
              error={errors.height?.message as string}
              variant="outline"
              placeholder="10"
            />
            <p className="mt-1 text-xs text-gray-500">
              Укажите высоту товара в сантиметрах
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

