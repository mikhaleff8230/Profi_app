import { useForm, useFieldArray } from 'react-hook-form';
import Input from '@/components/ui/input';
import TextArea from '@/components/ui/text-area';
import Button from '@/components/ui/button';
import { useTranslation } from 'next-i18next';
import { ProductSku } from '@/types';
import FileInput from '@/components/ui/file-input';
import Label from '@/components/ui/label';
import { useUpdateProductSkuMutation, useCreateProductSkuMutation } from '@/data/product-group';
import { useAttributesQuery } from '@/data/attributes';
import { useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';
import SelectInput from '@/components/ui/select-input';
import ValidationError from '@/components/ui/form-validation-error';
import { TrashIcon } from '@/components/icons/trash';

type FormValues = {
  title?: string;
  sku?: string;
  price: number;
  old_price?: number;
  quantity: number;
  barcode?: string;
  image?: any;
  is_active: boolean;
  description?: string;
  property_values: Array<{
    attribute: any;
    value: any;
  }>;
};

type SkuFormProps = {
  productGroup: any;
  initialValues?: ProductSku | null;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function SkuForm({ productGroup, initialValues, onSuccess, onCancel }: SkuFormProps) {
  const { t } = useTranslation();
  const router = useRouter();

  if (!productGroup?.id) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800">Ошибка: Группа товаров не загружена</p>
      </div>
    );
  }

  // Защита от undefined initialValues
  if (initialValues === undefined) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-800">Загрузка данных SKU...</p>
      </div>
    );
  }

  // Загружаем атрибуты
  const { attributes, loading: loadingAttributes } = useAttributesQuery({
    shop_id: productGroup?.shop_id,
    language: router.locale,
    limit: 100,
  });

  // Преобразуем propertyValues в формат для формы
  // ВАЖНО: SKU может иметь только ОДНО значение каждого атрибута!
  // Если в данных есть несколько значений одного атрибута - берем только первое
  const initialPropertyValues = useMemo(() => {
    // Проверяем оба варианта имени поля
    const propertyValues = (initialValues as any)?.property_values || initialValues?.propertyValues;
    
    if (!propertyValues || !Array.isArray(propertyValues) || propertyValues.length === 0) {
      return [];
    }
    
    // Группируем по атрибутам - для каждого атрибута берем только одно значение
    const grouped: { [key: string]: { attribute: any; value: any } } = {};
    
    propertyValues.forEach((pv: any) => {
      const attrId = pv.attribute?.id || pv.pivot?.property_id;
      if (attrId) {
        // Если атрибут уже есть - пропускаем (берем только первое значение)
        if (!grouped[attrId]) {
          // Сохраняем полный объект атрибута с его значениями (если есть)
          const attributeObj = pv.attribute || { id: attrId };
          grouped[attrId] = {
            attribute: attributeObj, // Полный объект атрибута
            value: pv, // Объект AttributeValue с полями id, value, attribute и т.д.
          };
        }
      }
    });
    
    // Преобразуем в массив для useFieldArray
    return Object.values(grouped);
  }, [initialValues, attributes]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: initialValues
      ? {
          title: initialValues.title || '',
          sku: initialValues.sku || '',
          price: initialValues.price || 0,
          old_price: (initialValues as any).sale_price || (initialValues as any).old_price || undefined,
          quantity: initialValues.quantity || 0,
          barcode: initialValues.barcode || '',
          image: initialValues.image,
          is_active: initialValues.is_active ?? true,
          description: initialValues.description || '',
          property_values: initialPropertyValues,
        }
      : {
          title: '',
          sku: '',
          price: 1000,
          old_price: undefined,
          quantity: 0,
          barcode: '',
          image: undefined,
          is_active: true,
          description: '',
          property_values: [],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'property_values',
  });

  const { mutate: updateSku, isLoading: updating } = useUpdateProductSkuMutation();
  const { mutate: createSku, isLoading: creating } = useCreateProductSkuMutation();

  useEffect(() => {
    if (initialValues) {
      reset({
        title: initialValues.title || '',
        sku: initialValues.sku || '',
        price: initialValues.price || 0,
        old_price: (initialValues as any).sale_price || (initialValues as any).old_price || undefined,
        quantity: initialValues.quantity || 0,
        barcode: initialValues.barcode || '',
        image: initialValues.image,
        is_active: initialValues.is_active ?? true,
        description: initialValues.description || '',
        property_values: initialPropertyValues,
      });
    }
  }, [initialValues, reset, initialPropertyValues]);

  const onSubmit = (values: FormValues) => {
    if (!productGroup?.id) {
      toast.error('Группа товаров не найдена');
      return;
    }

    const input: any = {
      title: values.title?.trim() || '',
      sku: values.sku?.trim() || '',
      price: parseFloat(String(values.price)) || 0,
      quantity: parseInt(String(values.quantity), 10) || 0,
      is_active: values.is_active ?? true,
    };

    if (values.old_price !== undefined && values.old_price !== null && values.old_price !== '') {
      input.sale_price = parseFloat(String(values.old_price));
    }

    if (values.barcode?.trim()) input.barcode = values.barcode.trim();
    if (values.description?.trim()) input.description = values.description.trim();
    if (values.image) {
      input.image = Array.isArray(values.image) ? values.image : [values.image];
    } else {
      input.image = null;
    }

    // Преобразуем property_values в properties
    // ВАЖНО: SKU может иметь только ОДНО значение каждого атрибута!
    if (values.property_values && Array.isArray(values.property_values) && values.property_values.length > 0) {
      const properties: any[] = [];
      const usedAttributes = new Set<number>();
      
      values.property_values.forEach((pv: any) => {
        if (!pv.attribute || !pv.value) return;
        
        // pv.attribute - это объект Attribute с полем id
        // pv.value - это объект AttributeValue с полем id
        const attributeId = typeof pv.attribute === 'object' ? pv.attribute.id : pv.attribute;
        const valueId = typeof pv.value === 'object' ? pv.value.id : pv.value;
        
        // Проверяем, не используется ли уже этот атрибут
        if (usedAttributes.has(attributeId)) {
          toast.warning(`Атрибут "${typeof pv.attribute === 'object' ? pv.attribute.name : 'Unknown'}" уже используется. SKU может иметь только одно значение каждого атрибута.`);
          return;
        }
        
        if (valueId && attributeId) {
          usedAttributes.add(attributeId);
          properties.push({
            attribute_id: attributeId,
            attribute_value_id: valueId,
          });
        }
      });
      
      if (properties.length > 0) {
        input.properties = properties;
      }
    }

    if (initialValues) {
      updateSku(
        { ...input, id: initialValues.id.toString() },
        {
          onSuccess: async (data: any) => {
            // Проверяем, изменился ли slug, и обновляем URL если нужно
            const newSlug = data?.slug;
            const currentSlug = router.query.skuId as string;
            
            if (newSlug && newSlug !== currentSlug && router.pathname.includes('/edit')) {
              // Slug изменился - обновляем URL без перезагрузки страницы
              const newPath = router.asPath.replace(`/${currentSlug}/edit`, `/${newSlug}/edit`);
              await router.replace(newPath, undefined, { shallow: true });
            }
            
            // Обновляем форму с новыми данными
            // ВАЖНО: API возвращает property_values (с подчеркиванием), а не propertyValues!
            // ВАЖНО: SKU может иметь только ОДНО значение каждого атрибута!
            const propertyValues = data?.property_values || data?.propertyValues;
            if (propertyValues && Array.isArray(propertyValues)) {
              // Группируем по атрибутам - для каждого атрибута берем только одно значение
              const grouped: { [key: string]: { attribute: any; value: any } } = {};
              propertyValues.forEach((pv: any) => {
                const attrId = pv.attribute?.id || pv.pivot?.property_id;
                if (attrId) {
                  // Если атрибут уже есть - пропускаем (берем только первое значение)
                  if (!grouped[attrId]) {
                    grouped[attrId] = {
                      attribute: pv.attribute || { id: attrId },
                      value: pv, // Объект AttributeValue
                    };
                  }
                }
              });
              
              const updatedPropertyValues = Object.values(grouped);
              
              reset({
                title: data.title || '',
                sku: data.sku || '',
                price: data.price || 0,
                old_price: (data as any).sale_price || (data as any).old_price || undefined,
                quantity: data.quantity || 0,
                barcode: data.barcode || '',
                image: data.image,
                is_active: data.is_active ?? true,
                description: data.description || '',
                property_values: updatedPropertyValues,
              });
            }
            if (onSuccess) onSuccess();
          },
          onError: (error: any) => {
            const errorData = error?.response?.data;
            if (errorData?.errors) {
              const firstError = Object.values(errorData.errors).flat()[0];
              if (firstError) toast.error(String(firstError));
            } else if (errorData?.message) {
              toast.error(errorData.message);
            } else {
              toast.error('Ошибка обновления SKU');
            }
          },
        }
      );
    } else {
      createSku(
        { ...input, product_group_id: productGroup.id.toString() },
        {
          onSuccess: () => {
            reset();
            if (onSuccess) onSuccess();
          },
          onError: (error: any) => {
            const errorData = error?.response?.data;
            if (errorData?.errors) {
              const firstError = Object.values(errorData.errors).flat()[0];
              if (firstError) toast.error(String(firstError));
            } else if (errorData?.message) {
              toast.error(errorData.message);
            } else {
              toast.error('Ошибка создания SKU');
            }
          },
        }
      );
    }
  };

  const onError = (errors: any) => {
    const firstError = Object.values(errors)[0];
    if (firstError && (firstError as any).message) {
      toast.error((firstError as any).message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-5">
      {/* Простой вывод сохраненных атрибутов */}
      {initialValues && (() => {
        // ВАЖНО: API возвращает property_values (с подчеркиванием), а не propertyValues!
        const propertyValues = (initialValues as any)?.property_values || initialValues?.propertyValues;
        const hasAttributes = propertyValues && Array.isArray(propertyValues) && propertyValues.length > 0;
        
        // Проверяем, есть ли дубликаты атрибутов (несколько значений одного атрибута)
        const attributeCounts: { [key: number]: number } = {};
        if (hasAttributes) {
          propertyValues.forEach((pv: any) => {
            const attrId = pv.attribute?.id || pv.pivot?.property_id;
            if (attrId) {
              attributeCounts[attrId] = (attributeCounts[attrId] || 0) + 1;
            }
          });
        }
        const hasDuplicates = Object.values(attributeCounts).some(count => count > 1);
        
        return (
          <div className={`border-2 rounded-lg p-4 ${hasAttributes ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            {/* Информация о SKU: название, артикул, цена */}
            <div className="mb-3 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold text-gray-800">
                  {initialValues.title || 'Без названия'}
                </span>
                {initialValues.sku && (
                  <span className="text-gray-600">
                    {t('form:input-label-sku')}: <span className="font-medium">{initialValues.sku}</span>
                  </span>
                )}
                {initialValues.price && (
                  <span className="text-gray-600">
                    {t('form:input-label-price')}: <span className="font-medium">{initialValues.price} ₽</span>
                  </span>
                )}
              </div>
            </div>
            
            <h3 className={`font-bold text-lg mb-2 ${hasAttributes ? 'text-green-800' : 'text-red-800'}`}>
              {hasAttributes 
                ? `✅ Атрибуты SKU (${propertyValues.length}):` 
                : '❌ Атрибуты НЕ найдены!'}
            </h3>
            {hasDuplicates && (
              <div className="mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
                ⚠️ Внимание: В данных есть несколько значений одного атрибута. SKU может иметь только одно значение каждого атрибута. В форме будет показано только первое значение.
              </div>
            )}
            {hasAttributes && (
              <div className="flex flex-wrap gap-2">
                {propertyValues.map((pv: any, idx: number) => {
                  const attrId = pv.attribute?.id || pv.pivot?.property_id;
                  const isDuplicate = attrId && attributeCounts[attrId] > 1;
                  return (
                    <span 
                      key={idx} 
                      className={`px-3 py-1 bg-white rounded border text-sm ${isDuplicate ? 'border-yellow-300 bg-yellow-50' : 'border-green-200'}`}
                      title={isDuplicate ? 'Дубликат атрибута - будет показано только первое значение' : ''}
                    >
                      <strong>{pv.attribute?.name || `ID: ${pv.pivot?.property_id || 'unknown'}`}</strong>: {pv.value || `ID: ${pv.pivot?.property_value_id || 'unknown'}`}
                      {isDuplicate && ' ⚠️'}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      <div className="grid grid-cols-2 gap-5">
        <Input
          label={`${t('form:input-label-title')}*`}
          {...register('title', { required: t('form:error-title-required') || 'Название обязательно' })}
          error={errors.title?.message}
          variant="outline"
        />
        <Input
          label={`${t('form:input-label-sku')}*`}
          {...register('sku', { required: t('form:error-sku-required') || 'Артикул обязателен' })}
          error={errors.sku?.message}
          variant="outline"
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Input
          label={`${t('form:input-label-price')}*`}
          type="number"
          step="0.01"
          {...register('price', { required: true, min: 0 })}
          error={errors.price?.message}
          variant="outline"
        />
        <Input
          label={t('form:input-label-sale-price')}
          type="number"
          step="0.01"
          {...register('old_price', { min: 0 })}
          variant="outline"
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Input
          label={`${t('form:input-label-quantity')}*`}
          type="number"
          {...register('quantity', { required: true, min: 0 })}
          error={errors.quantity?.message}
          variant="outline"
        />
        <Input
          label={t('form:input-label-barcode')}
          {...register('barcode')}
          variant="outline"
        />
      </div>

      <TextArea
        label={t('form:input-label-description')}
        {...register('description')}
        variant="outline"
        rows={3}
      />

      {/* Секция выбора атрибутов */}
      <div className="border border-border-200 rounded-lg p-5 bg-gray-50">
        <div className="mb-4">
          <Label>{t('common:text-options')}</Label>
          <p className="text-xs text-gray-500 mt-1">
            {t('form:help-text-select-attributes-for-sku') || 'Выберите атрибуты для этого SKU'}
          </p>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => {
            // Получаем выбранный атрибут из формы (watch) или из field (defaultValue)
            const watchedAttribute = watch(`property_values.${index}.attribute`);
            const fieldAttribute = field.attribute;
            
            // Определяем выбранный атрибут - приоритет у watch, но если его нет, берем из field
            let selectedAttribute = watchedAttribute;
            if (!selectedAttribute && fieldAttribute) {
              selectedAttribute = fieldAttribute;
            }
            
            // Находим объект атрибута с полным списком values
            let attributeObj: any = null;
            if (selectedAttribute) {
              let attrId: number | null = null;
              
              // Определяем ID атрибута
              if (typeof selectedAttribute === 'object' && selectedAttribute?.id) {
                attrId = selectedAttribute.id;
              } else if (typeof selectedAttribute === 'number' || typeof selectedAttribute === 'string') {
                attrId = Number(selectedAttribute);
              }
              
              // Ищем полный объект атрибута в списке attributes (там есть values)
              if (attrId && attributes) {
                attributeObj = attributes.find((a: any) => a.id === attrId);
              }
              
              // Если не нашли в списке, но selectedAttribute - это объект с values, используем его
              if (!attributeObj && typeof selectedAttribute === 'object' && selectedAttribute?.values) {
                attributeObj = selectedAttribute;
              }
            }
            
            // Получаем все выбранные атрибуты из других полей (для валидации)
            const allPropertyValues = getValues('property_values') || [];
            const allSelectedAttributes = allPropertyValues.map((pv: any, idx: number) => {
              if (idx === index) return null; // Текущее поле пропускаем
              const attr = pv?.attribute;
              return typeof attr === 'object' ? attr?.id : attr;
            }).filter(Boolean) || [];
            
            // Фильтруем доступные атрибуты - исключаем уже выбранные
            const availableAttributes = (attributes || []).filter((attr: any) => {
              // Если это текущий выбранный атрибут - показываем его
              const currentAttrId = typeof selectedAttribute === 'object' ? selectedAttribute?.id : selectedAttribute;
              if (attr.id === currentAttrId) return true;
              // Иначе проверяем, не выбран ли он в другом поле
              return !allSelectedAttributes.includes(attr.id);
            });
            
            return (
              <div key={field.id} className="border border-border-200 bg-white rounded p-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label>{t('form:input-label-attribute')}</Label>
                    <SelectInput
                      name={`property_values.${index}.attribute`}
                      control={control}
                      defaultValue={
                        // Если field.attribute - это объект, используем его, иначе ищем в options
                        typeof field.attribute === 'object' && field.attribute?.id
                          ? field.attribute
                          : field.attribute
                          ? attributes?.find((a: any) => a.id === field.attribute)
                          : undefined
                      }
                      getOptionLabel={(option: any) => option.name}
                      getOptionValue={(option: any) => option.id}
                      options={availableAttributes}
                      isLoading={loadingAttributes}
                      placeholder={t('form:input-placeholder-select-attribute') || 'Выберите атрибут'}
                    />
                    <ValidationError message={t(errors?.property_values?.[index]?.attribute?.message!)} />
                    {allSelectedAttributes.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('form:help-text-sku-single-attribute') || 'Каждый атрибут может быть выбран только один раз'}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => remove(index)}
                    type="button"
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-red-200 bg-red-50 text-red-600 transition-colors hover:border-red-600 hover:bg-red-100 mt-6"
                    title={t('form:button-label-remove') || 'Удалить'}
                  >
                    <TrashIcon width={14} />
                  </button>
                </div>

                {/* Поле значения атрибута - показываем всегда, если атрибут выбран */}
                {attributeObj && attributeObj.values && Array.isArray(attributeObj.values) && attributeObj.values.length > 0 && (
                  <div className="mt-4">
                    <Label>{t('form:input-label-attribute-value')}</Label>
                    <SelectInput
                      name={`property_values.${index}.value`}
                      control={control}
                      defaultValue={
                        // field.value может быть объектом AttributeValue с полями id, value, attribute и т.д.
                        // Нужно найти соответствующий объект в options по ID
                        (() => {
                          if (!field.value) return undefined;
                          
                          // Если это объект с id, используем его
                          if (typeof field.value === 'object' && field.value.id) {
                            // Ищем в options объект с таким же id
                            const found = attributeObj.values.find((v: any) => v.id === field.value.id);
                            return found || field.value;
                          }
                          
                          // Если это просто ID (число или строка)
                          if (typeof field.value === 'number' || typeof field.value === 'string') {
                            return attributeObj.values.find((v: any) => v.id === Number(field.value) || v.id === field.value);
                          }
                          
                          return undefined;
                        })()
                      }
                      getOptionLabel={(option: any) => {
                        if (typeof option === 'object') {
                          return option.value || option.name || String(option.id || '');
                        }
                        return String(option);
                      }}
                      getOptionValue={(option: any) => {
                        if (typeof option === 'object') {
                          return String(option.id || '');
                        }
                        return String(option);
                      }}
                      options={attributeObj.values || []}
                      placeholder={t('form:input-placeholder-select-attribute-value') || 'Выберите значение'}
                    />
                    <ValidationError message={t(errors?.property_values?.[index]?.value?.message!)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button
          onClick={(e: any) => {
            e.preventDefault();
            append({ attribute: null, value: null });
          }}
          type="button"
          variant="outline"
          className="mt-4"
          disabled={loadingAttributes || !attributes || attributes.length === 0}
        >
          + {t('form:button-label-add-option') || 'Добавить опцию'}
        </Button>
      </div>

      <div>
        <Label>{t('form:input-label-image')}</Label>
        <FileInput
          control={control}
          name="image"
          multiple={false}
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_active"
          {...register('is_active')}
          className="h-5 w-5 cursor-pointer rounded border-gray-300 text-accent focus:ring-accent"
        />
        <label htmlFor="is_active" className="ml-3 cursor-pointer text-sm text-body">
          {t('form:input-label-is-active')}
        </label>
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} type="button">
            {t('form:button-label-cancel')}
          </Button>
        )}
        <Button 
          type="submit"
          loading={updating || creating} 
          disabled={updating || creating}
        >
          {initialValues ? t('form:button-label-update-sku') : t('form:button-label-create')}
        </Button>
      </div>
    </form>
  );
}
