
import { useFormContext, Controller } from 'react-hook-form';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useProductEditorStore } from '@/store/useProductEditorStore';
import { useEffect } from 'react';
import YandexAddressSuggest from '@/components/form/yandex-address-suggest';
import ShippingMapPreview from './shipping-map-preview';

export default function StepShipping() {
  const { register, watch, control, setValue, formState: { errors } } =
    useFormContext<ProductEditorFormData>();
  const { updateProduct } = useProductEditorStore();

  const lat = watch('lat');
  const lng = watch('lng');

  useEffect(() => {
    const subscription = watch((value: Partial<ProductEditorFormData>) => {
      updateProduct(value as any);
    });
    return () => subscription.unsubscribe();
  }, [watch, updateProduct]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading mb-4 text-xl font-semibold">
          Доставка и габариты
        </h2>
        <p className="text-body mb-6 text-sm">
          Укажите вес и габариты для доставки. Адрес на витрине задаётся{' '}
          <strong>текстом</strong>; координаты для карты подставляются из подсказок
          Яндекса или вручную.
        </p>
      </div>

      <div className="max-w-xl space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-medium text-heading">Адрес на карте</h3>
        <p className="text-xs text-gray-500">
          Для нового товара подставляется адрес и точка магазина, если в карточке
          товара они ещё не заданы. Ключ API —{' '}
          <code className="rounded bg-gray-100 px-1">NEXT_PUBLIC_YANDEX_MAPS_API_KEY</code>{' '}
          (как на витрине).
        </p>

        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <YandexAddressSuggest
              value={field.value ?? ''}
              onAddressChange={field.onChange}
              onBlur={field.onBlur}
              textareaRef={field.ref}
              name={field.name}
              error={errors.address?.message as string | undefined}
              onCoordinates={(la, ln) => {
                setValue('lat', la, { shouldDirty: true });
                setValue('lng', ln, { shouldDirty: true });
              }}
            />
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Широта (lat), необязательно"
            type="number"
            step="any"
            {...register('lat', { valueAsNumber: true })}
            error={errors.lat?.message as string | undefined}
            variant="outline"
            floatingLabel
          />
          <Input
            label="Долгота (lng), необязательно"
            type="number"
            step="any"
            {...register('lng', { valueAsNumber: true })}
            error={errors.lng?.message as string | undefined}
            variant="outline"
            floatingLabel
          />
        </div>

        <div>
          <Label className="mb-2 block text-xs text-gray-600">Превью</Label>
          <ShippingMapPreview
            lat={typeof lat === 'number' && !Number.isNaN(lat) ? lat : undefined}
            lng={typeof lng === 'number' && !Number.isNaN(lng) ? lng : undefined}
          />
        </div>
      </div>

      <div className="grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <Input
            label="Длина упаковки, мм *"
            type="number"
            step="0.01"
            {...register('length', { valueAsNumber: true })}
            error={errors.length?.message}
            variant="outline"
            floatingLabel
          />
        </div>

        <div>
          <Input
            label="Ширина упаковки, мм *"
            type="number"
            step="0.01"
            {...register('width', { valueAsNumber: true })}
            error={errors.width?.message}
            variant="outline"
            floatingLabel
          />
        </div>

        <div>
          <Input
            label="Высота упаковки, мм *"
            type="number"
            step="0.01"
            {...register('height', { valueAsNumber: true })}
            error={errors.height?.message}
            variant="outline"
            floatingLabel
          />
        </div>

        <div>
          <Input
            label="Вес с упаковкой, г *"
            type="number"
            step="0.01"
            {...register('weight', { valueAsNumber: true })}
            error={errors.weight?.message}
            variant="outline"
            floatingLabel
          />
        </div>
      </div>

      <div className="max-w-3xl">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            Габариты и вес используются для расчёта доставки. На карте витрины точка
            появится только при валидной паре координат (из подсказки Яндекса или
            введённых вручную). Текст адреса виден покупателям независимо от координат.
          </p>
        </div>
      </div>
    </div>
  );
}
