import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import Button from '@/components/ui/button';
import Card from '@/components/common/card';
import Description from '@/components/ui/description';
import Label from '@/components/ui/label';
import Input from '@/components/ui/input';
import SelectInput from '@/components/ui/select-input';
import ValidationError from '@/components/ui/form-validation-error';
import { useAttributesQuery } from '@/data/attributes';
import { useGenerateSkusMutation } from '@/data/product-group';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { TrashIcon } from '@/components/icons/trash';
import { cartesian } from '@/utils/cartesian';

type FormValues = {
  variations: Array<{
    attribute: any;
    value: any[];
  }>;
  base_price: number;
};

type SkuGeneratorProps = {
  productGroup: any;
  onSuccess?: () => void;
};

export default function SkuGeneratorProper({ productGroup, onSuccess }: SkuGeneratorProps) {
  const { t } = useTranslation();
  const router = useRouter();
  
  const { attributes, loading: loadingAttributes } = useAttributesQuery({
    shop_id: productGroup?.shop_id,
    language: router.locale,
    limit: 100,
  });

  // Отладочная информация
  console.log('=== SkuGeneratorProper Debug ===');
  console.log('ProductGroup:', productGroup);
  console.log('Shop ID:', productGroup?.shop_id);
  console.log('Loading attributes:', loadingAttributes);
  console.log('Attributes:', attributes);
  console.log('Attributes count:', attributes?.length || 0);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      variations: [],
      base_price: 1000,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variations',
  });

  const { mutate: generateSkus, isLoading: generating } = useGenerateSkusMutation();

  const variations = watch('variations');
  
  // Подсчет комбинаций
  const getVariationCount = () => {
    if (!variations || variations.length === 0) return 0;
    
    const validVariations = variations.filter(
      v => v.attribute && v.value && Array.isArray(v.value) && v.value.length > 0
    );
    
    if (validVariations.length === 0) return 0;
    
    return validVariations.reduce((acc, v) => acc * v.value.length, 1);
  };

  const onSubmit = (values: FormValues) => {
    console.log('=== Generating SKUs ===');
    console.log('Values:', values);
    console.log('ProductGroup ID:', productGroup?.id);

    if (!productGroup?.id) {
      toast.error('Не найден ID группы товара');
      return;
    }

    if (!values.variations || values.variations.length === 0) {
      toast.error('Необходимо выбрать хотя бы один атрибут');
      return;
    }

    // Проверяем что у каждой вариации выбраны значения
    const invalidVariations = values.variations.filter(
      v => !v.attribute || !v.value || !Array.isArray(v.value) || v.value.length === 0
    );

    if (invalidVariations.length > 0) {
      toast.error('Каждый атрибут должен иметь выбранные значения');
      return;
    }

    // Собираем ID атрибутов
    const attributeIds = values.variations.map(v => v.attribute.id.toString());

    console.log('Attribute IDs:', attributeIds);
    console.log('Base price:', values.base_price);

    generateSkus(
      {
        groupId: productGroup.id,
        data: {
          attribute_ids: attributeIds,
          base_price: parseFloat(values.base_price.toString()) || 1000,
        },
      },
      {
        onSuccess: (data) => {
          console.log('✅ SKUs generated:', data);
          toast.success(`Создано ${data?.count || 0} SKU`);
          if (onSuccess) {
            onSuccess();
          }
        },
        onError: (error: any) => {
          console.error('❌ Generation error:', error);
          const errorMsg = error?.response?.data?.message || 'Ошибка генерации';
          toast.error(errorMsg);
        },
      }
    );
  };

  const variationCount = getVariationCount();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="my-5 flex flex-wrap sm:my-8">
        <Description
          title={t('form:form-title-generate-skus')}
          details={t('form:form-description-generate-skus')}
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />

        <Card className="w-full sm:w-8/12 md:w-2/3">
          <div className="mb-5">
            <div className="border-b border-dashed border-border-200 pb-5">
              <div className="mb-4">
                <Label>{t('common:text-options')}*</Label>
                <p className="text-xs text-gray-500 mt-1">
                  {t('form:help-text-select-attributes-for-sku-generation')}
                </p>
              </div>

              <div>
                {fields.map((field, index) => {
                  const selectedAttribute = watch(`variations.${index}.attribute`);
                  
                  return (
                    <div key={field.id} className="border border-border-200 bg-gray-50 rounded p-4 mb-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Label>{t('form:input-label-attribute')}*</Label>
                          <SelectInput
                            name={`variations.${index}.attribute`}
                            control={control}
                            defaultValue={field.attribute}
                            getOptionLabel={(option: any) => option.name}
                            getOptionValue={(option: any) => option.id}
                            options={attributes}
                            isLoading={loadingAttributes}
                            placeholder={t('form:input-placeholder-select-attribute')}
                          />
                          <ValidationError
                            message={t(errors?.variations?.[index]?.attribute?.message!)}
                          />
                        </div>

                        <button
                          onClick={() => remove(index)}
                          type="button"
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-red-200 bg-red-50 text-red-600 transition-colors hover:border-red-600 hover:bg-red-100 mt-6"
                          title={t('form:button-label-remove')}
                        >
                          <TrashIcon width={14} />
                        </button>
                      </div>

                      {selectedAttribute && (
                        <div className="mt-4">
                          <Label>{t('form:input-label-attribute-value')}*</Label>
                          <SelectInput
                            isMulti
                            name={`variations.${index}.value`}
                            control={control}
                            defaultValue={field.value}
                            getOptionLabel={(option: any) => option.value}
                            getOptionValue={(option: any) => option.id}
                            options={selectedAttribute?.values || []}
                            placeholder={t('form:input-placeholder-select-attribute-values')}
                          />
                          <ValidationError
                            message={t(errors?.variations?.[index]?.value?.message!)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={(e: any) => {
                  e.preventDefault();
                  append({ attribute: null, value: [] });
                }}
                type="button"
                variant="outline"
                disabled={loadingAttributes || attributes.length === 0 || fields.length >= attributes.length}
              >
                {t('form:button-label-add-option')}
              </Button>
            </div>
          </div>

          <div className="mb-5">
            <Input
              label={t('form:input-label-base-price')}
              type="number"
              step="0.01"
              {...register('base_price', { required: true, min: 0 })}
              variant="outline"
              placeholder="1000"
              helperText={t('form:help-text-base-price-for-all-skus')}
            />
          </div>

          {variationCount > 0 && (
            <div className="mb-5 rounded border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-800">
                <strong>Будет создано:</strong> {variationCount} SKU
              </p>
            </div>
          )}

          {loadingAttributes && (
            <div className="mb-5 rounded border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <strong>Загрузка атрибутов...</strong>
              </p>
            </div>
          )}

          {!loadingAttributes && attributes.length === 0 && (
            <div className="mb-5 rounded border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">
                <strong>Ошибка:</strong> У вашего магазина нет атрибутов!
              </p>
              <p className="text-xs text-red-600 mt-2">
                Сначала создайте атрибуты (например: Цвет, Размер) в разделе "Атрибуты".
              </p>
            </div>
          )}

          {(!variations || variations.length === 0) && attributes.length > 0 && (
            <div className="mb-5 rounded border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                <strong>Внимание:</strong> Выберите атрибуты и их значения выше, чтобы создать варианты товара.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={generating}
              disabled={generating || variationCount === 0}
            >
              {t('form:button-label-generate-skus')}
            </Button>
          </div>

          <div className="mt-5 rounded border border-gray-200 bg-gray-50 p-4">
            <h4 className="mb-2 font-semibold">{t('common:text-example')}</h4>
            <p className="text-sm text-gray-600">
              {t('form:help-text-sku-generation-example')}
            </p>
            <ul className="mt-2 list-inside list-disc text-sm text-gray-600">
              <li>Атрибут "Цвет": Черный, Белый</li>
              <li>Атрибут "Размер": S, M, L</li>
              <li>Результат: 6 SKU (2 × 3)</li>
            </ul>
          </div>
        </Card>
      </div>
    </form>
  );
}

