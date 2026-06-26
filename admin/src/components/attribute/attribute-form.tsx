import Input from '@/components/ui/input';
import { useFieldArray, useForm } from 'react-hook-form';
import Button from '@/components/ui/button';
import Description from '@/components/ui/description';
import Card from '@/components/common/card';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Attribute } from '@/types';
import { useShopQuery } from '@/data/shop';
import { useMeQuery } from '@/data/user';
import { useState } from 'react';
import Alert from '@/components/ui/alert';
import { animateScroll } from 'react-scroll';
import {
  useCreateAttributeMutation,
  useUpdateAttributeMutation,
} from '@/data/attributes';
import { yupResolver } from '@hookform/resolvers/yup';
import { attributeValidationSchema } from '@/components/attribute/attribute.validation-schema';
import SelectInput from '@/components/ui/select-input';
import Label from '@/components/ui/label';
import Checkbox from '@/components/ui/checkbox/checkbox';
import { EditIcon } from '@/components/icons/edit';
import { Config } from '@/config';
import TextArea from '@/components/ui/text-area';

// Типы атрибутов
const attributeTypes = [
  { id: 'text', name: 'Text', label: 'form:attribute-type-text' },
  { id: 'number', name: 'Number', label: 'form:attribute-type-number' },
  { id: 'select', name: 'Select', label: 'form:attribute-type-select' },
  { id: 'multiselect', name: 'Multi Select', label: 'form:attribute-type-multiselect' },
  { id: 'color', name: 'Color', label: 'form:attribute-type-color' },
  { id: 'image', name: 'Image', label: 'form:attribute-type-image' },
  { id: 'boolean', name: 'Yes/No', label: 'form:attribute-type-boolean' },
];

// Способы отображения
const displayTypes = [
  { id: 'input', name: 'Input Field', label: 'form:display-type-input' },
  { id: 'dropdown', name: 'Dropdown', label: 'form:display-type-dropdown' },
  { id: 'radio', name: 'Radio Buttons', label: 'form:display-type-radio' },
  { id: 'checkbox', name: 'Checkboxes', label: 'form:display-type-checkbox' },
  { id: 'color_swatch', name: 'Color Swatches', label: 'form:display-type-color-swatch' },
  { id: 'image_swatch', name: 'Image Swatches', label: 'form:display-type-image-swatch' },
  { id: 'toggle', name: 'Toggle Switch', label: 'form:display-type-toggle' },
  { id: 'range', name: 'Range (От-До)', label: 'form:display-type-range' },
];

type FormValues = {
	name?: string | null;
	slug?: string;
	type?: string | any;
	display_type?: string | any;
	values: any;
	is_common?: boolean;
	description?: string | null;
};

type IProps = {
	initialValues?: Attribute | null;
};
export default function CreateOrUpdateAttributeForm({ initialValues }: IProps) {
	const router = useRouter();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSlugDisable, setIsSlugDisable] = useState<boolean>(true);

  const {
    query: { shop },
  } = router;
  const { t } = useTranslation();
  const { data: me } = useMeQuery();
  
  // Получаем shop_id из разных источников:
  // 1. Из URL параметра shop (если есть)
  // 2. Из первого магазина пользователя (если есть)
  // 3. Из managed_shop пользователя (если есть)
  
  const { data: shopData, isLoading: shopLoading, error: shopError } = useShopQuery(
    {
      slug: shop as string,
    },
    { enabled: !!shop }
  );

  // Определяем shopId: сначала из URL, потом из магазинов пользователя
  let shopId = shopData?.id;
  
  // Если shopId не определен из URL, пробуем получить из магазинов пользователя
  if (!shopId && me) {
    // Пробуем первый магазин пользователя
    if (me.shops && me.shops.length > 0) {
      shopId = me.shops[0].id;
    }
    // Или managed_shop
    else if (me.managed_shop?.id) {
      shopId = me.managed_shop.id;
    }
  }
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: initialValues ? {
      ...initialValues,
      slug: initialValues.slug || '',
      type: attributeTypes.find(t => t.id === initialValues.type) || attributeTypes[0],
      display_type: displayTypes.find(d => d.id === initialValues.display_type) || displayTypes[0],
      values: initialValues.values || [],
      is_common: initialValues.is_common || false,
      description: initialValues.description || '',
    } : { 
      name: '', 
      slug: '',
      type: attributeTypes[0], 
      display_type: displayTypes[0], 
      values: [],
      is_common: false,
      description: '',
    },
    resolver: yupResolver(attributeValidationSchema),
  });
  
  const isSlugEditable = router?.query?.action === 'edit' && router?.locale === Config.defaultLanguage;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'values',
  });
  const { mutate: createAttribute, isLoading: creating } =
    useCreateAttributeMutation();
  const { mutate: updateAttribute, isLoading: updating } =
    useUpdateAttributeMutation();
  const onSubmit = (values: FormValues) => {
    // Проверяем загрузку shopData
    if (shopLoading) {
      setErrorMessage('Loading shop data... Please wait.');
      animateScroll.scrollToTop();
      return;
    }

    // Проверяем ошибку загрузки shopData
    if (shopError || (shop && !shopData)) {
      setErrorMessage('Shop not found. Please check the URL or ensure you have access to this shop.');
      animateScroll.scrollToTop();
      return;
    }

    // Извлекаем значения из селектов
    const typeValue = typeof values.type === 'object' ? values.type?.id : values.type;
    const displayTypeValue = typeof values.display_type === 'object' ? values.display_type?.id : values.display_type;
    
    // Определяем shop_id для отправки: сначала из URL, потом из initialValues, потом из магазинов пользователя
    let finalShopId = shopId || initialValues?.shop_id;
    
    // Если shopId не определен, пробуем получить из магазинов пользователя
    if (!finalShopId && me) {
      if (me.shops && me.shops.length > 0) {
        finalShopId = me.shops[0].id;
      } else if (me.managed_shop?.id) {
        finalShopId = me.managed_shop.id;
      }
    }
    
    // Проверяем наличие shop_id перед отправкой
    if (!finalShopId) {
      const errorMsg = shop 
        ? 'Shop not found. Please check the URL or ensure you have access to this shop.'
        : 'Shop ID is required. Please access this page through a shop URL or ensure you have a shop assigned.';
      setErrorMessage(errorMsg);
      animateScroll.scrollToTop();
      return;
    }
    
    // Подготовка данных для отправки
    const payload: any = {
      language: router.locale,
      name: values.name!,
      type: typeValue || 'text',
      display_type: displayTypeValue || 'input',
      is_common: values.is_common || false,
      shop_id: Number(finalShopId), // Обязательно передаем shop_id
      description: values.description || null,
      values: (values?.values || []).filter((v: any) => v?.value && v.value.trim() !== '')?.map(({ id, value, meta }: any) => ({
        id: id || null, // Передаем id для обновления существующих значений
        language: router.locale || 'en',
        value: value || '',
        meta: meta || null,
      })) || [],
    };

    // Добавляем slug если он был изменен (как для товаров)
    if (values.slug && values.slug !== initialValues?.slug) {
      payload.slug = values.slug;
    } else if (initialValues?.slug) {
      // При обновлении перевода сохраняем существующий slug
      payload.slug = initialValues.slug;
    }
    
    if (
      !initialValues ||
      !initialValues.translated_languages?.includes(router.locale!)
    ) {
      // Создание нового атрибута
      // Логируем payload для отладки
      console.log('Creating attribute with payload:', payload);
      
      createAttribute(payload, {
        onError: (error: any) => {
          console.error('Error creating attribute:', error);
          console.error('Error response:', error?.response?.data);
          console.error('Payload sent:', payload);
          
          // Обработка ошибок валидации (422)
          if (error?.response?.status === 422) {
            const validationErrors = error?.response?.data?.errors || error?.response?.data;
            console.error('Validation errors:', validationErrors);
            
            if (validationErrors && typeof validationErrors === 'object') {
              const errorMessages = Object.keys(validationErrors).map(key => {
                const messages = Array.isArray(validationErrors[key]) 
                  ? validationErrors[key].join(', ') 
                  : validationErrors[key];
                return `${key}: ${messages}`;
              }).join('\n');
              setErrorMessage(errorMessages);
            } else {
              setErrorMessage(error?.response?.data?.message || 'Validation failed. Please check all required fields.');
            }
          } else {
            const errorMessage = error?.response?.data?.message || 
                               error?.response?.data?.errors || 
                               error?.message || 
                               'Failed to create attribute';
            setErrorMessage(typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage);
          }
          animateScroll.scrollToTop();
        },
      });
    } else {
      // Обновление существующего атрибута
      updateAttribute({
        ...payload,
        id: initialValues.id!,
      });
    }
  };
  return (
    <>
      {errorMessage ? (
        <Alert
          message={errorMessage.includes(':') ? t(errorMessage) : errorMessage}
          variant="error"
          closeable={true}
          className="mt-5"
          onClose={() => setErrorMessage(null)}
        />
      ) : null}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
          <Description
            title={t('common:attribute')}
            details={`${
              initialValues
                ? t('form:item-description-update')
                : t('form:item-description-add')
            } ${t('form:form-description-attribute-name')}`}
            className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
          />

          <Card className="w-full sm:w-8/12 md:w-2/3">
            <Input
              label={t('form:input-label-name')}
              {...register('name', { required: 'Name is required' })}
              error={t(errors.name?.message!)}
              variant="outline"
              className="mb-5"
            />
            
            {isSlugEditable ? (
              <div className="relative mb-5">
                <Input
                  label={`${t('Slug')}`}
                  {...register('slug')}
                  error={t(errors.slug?.message!)}
                  variant="outline"
                  disabled={isSlugDisable}
                />
                <button
                  className="absolute top-[27px] right-px z-10 flex h-[46px] w-11 items-center justify-center rounded-tr rounded-br border-l border-solid border-border-base bg-white px-2 text-body transition duration-200 hover:text-heading focus:outline-none"
                  type="button"
                  title={t('common:text-edit')}
                  onClick={() => setIsSlugDisable(false)}
                >
                  <EditIcon width={14} />
                </button>
              </div>
            ) : (
              <Input
                label={`${t('Slug')}`}
                {...register('slug')}
                value={initialValues?.slug || ''}
                variant="outline"
                className="mb-5"
                disabled
              />
            )}
            
            <div className="mb-5">
              <Label>{t('form:input-label-attribute-type')}</Label>
              <SelectInput
                name="type"
                control={control}
                getOptionLabel={(option: any) => option?.label ? t(option.label) : option?.name || option?.id}
                getOptionValue={(option: any) => option?.id || option}
                options={attributeTypes}
                isClearable={false}
              />
              {errors.type && (
                <p className="my-2 text-xs text-red-500">{t(errors.type?.message!)}</p>
              )}
            </div>

            <div className="mb-5">
              <Label>{t('form:input-label-display-type')}</Label>
              <SelectInput
                name="display_type"
                control={control}
                getOptionLabel={(option: any) => option?.label ? t(option.label) : option?.name || option?.id}
                getOptionValue={(option: any) => option?.id || option}
                options={displayTypes}
                isClearable={false}
              />
              {errors.display_type && (
                <p className="my-2 text-xs text-red-500">{t(errors.display_type?.message!)}</p>
              )}
            </div>

            <div className="mb-5">
              <Checkbox
                {...register('is_common')}
                label={t('form:input-label-is-common')}
                helper={t('form:input-help-is-common')}
              />
            </div>

            {/* Поле для заметки/описания атрибута */}
            <div className="mb-5">
              <Label>Описание атрибута (заметка)</Label>
              <TextArea
                {...register('description')}
                placeholder="Опишите для чего создан этот атрибут..."
                variant="outline"
                rows={3}
              />
              <p className="mt-1 text-xs text-body">
                Внутренняя заметка для вашего понимания назначения атрибута
              </p>
            </div>
          </Card>
        </div>

        <div className="my-5 flex flex-wrap sm:my-8">
          <Description
            title={t('common:attribute-values')}
            details={`${
              initialValues
                ? t('form:item-description-update')
                : t('form:item-description-add')
            } ${t('form:form-description-attribute-value')}`}
            className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
          />

          <Card className="w-full sm:w-8/12 md:w-2/3">
            <div>
              {fields.map((item: any & { id: string }, index) => (
                <div
                  className="border-b border-dashed border-border-200 py-5 last:border-0 md:py-8"
                  key={item.id}
                >
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-5">
                    <Input
                      className="sm:col-span-2"
                      label={t('form:input-label-value')}
                      variant="outline"
                      {...register(`values.${index}.value` as const)}
                      defaultValue={item.value!} // make sure to set up defaultValue
                      // @ts-ignore
                      error={t(errors?.values?.[index]?.value?.message)}
                    />
                    <Input
                      className="sm:col-span-2"
                      label={t('form:input-label-meta')}
                      placeholder={t('form:input-placeholder-meta')}
                      variant="outline"
                      {...register(`values.${index}.meta` as const)}
                      defaultValue={item.meta!} // make sure to set up defaultValue
                      // @ts-ignore
                      error={t(errors?.values?.[index]?.meta?.message)}
                    />
                    <button
                      onClick={() => remove(index)}
                      type="button"
                      className="text-sm text-red-500 transition-colors duration-200 hover:text-red-700 focus:outline-none sm:col-span-1 sm:mt-4"
                    >
                      {t('form:button-label-remove')}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              onClick={() => append({ value: '', meta: '' })}
              className="w-full sm:w-auto"
            >
              {t('form:button-label-add-value')}
            </Button>
          </Card>
        </div>

        {/* Инструкция по типам атрибутов */}
        <div className="my-5 flex flex-wrap border-t border-dashed border-border-base pt-8 sm:my-8">
          <Card className="w-full">
            <div className="rounded-lg bg-light-50 dark:bg-dark-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-dark-100 dark:text-light">
                📋 Инструкция по атрибутам
              </h3>
              <div className="space-y-4 text-xs text-body dark:text-light-600">
                {/* Типы атрибутов */}
                <div>
                  <p className="mb-2 font-semibold text-sm">🎯 Тип атрибута (определяет поведение):</p>
                  <div className="ml-2 space-y-2">
                    <div>
                      <p className="mb-1 font-medium">1. Типы с ТОЛЬКО предустановленными значениями:</p>
                      <ul className="ml-4 list-disc space-y-1">
                        <li><strong>select</strong> - выбор одного значения из списка</li>
                        <li><strong>multiselect</strong> - выбор нескольких значений из списка</li>
                        <li>✅ <strong>ОБЯЗАТЕЛЬНО</strong> наличие предустановленных значений</li>
                        <li>✅ Можно выбрать <strong>ТОЛЬКО</strong> из предустановленных значений</li>
                      </ul>
                    </div>
                    
                    <div>
                      <p className="mb-1 font-medium">2. Типы с ЛЮБЫМИ значениями:</p>
                      <ul className="ml-4 list-disc space-y-1">
                        <li><strong>text</strong> - текстовое поле (любое значение)</li>
                        <li><strong>number</strong> - числовое поле (любое число)</li>
                        <li>✅ Можно ввести <strong>любое</strong> значение</li>
                      </ul>
                    </div>

                    <div>
                      <p className="mb-1 font-medium">3. Специальный тип: Boolean</p>
                      <ul className="ml-4 list-disc space-y-1">
                        <li><strong>boolean</strong> - да/нет</li>
                        <li>✅ Всегда показывается Select с опциями "Да" / "Нет"</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Способы отображения */}
                <div>
                  <p className="mb-2 font-semibold text-sm">🎨 Способ отображения (как выглядит на фронтенде):</p>
                  <div className="ml-2 space-y-2">
                    <ul className="ml-4 list-disc space-y-1">
                      <li><strong>Поле ввода (input)</strong> - обычное текстовое поле</li>
                      <li><strong>Выпадающий список (dropdown)</strong> - список с выбором при наведении</li>
                      <li><strong>Переключатели (radio)</strong> - круглые кнопки для выбора одного значения</li>
                      <li><strong>Галочки (checkbox)</strong> - квадратные чекбоксы для множественного выбора</li>
                      <li><strong>Цветовые образцы (color_swatch)</strong> - цветные кружочки (для атрибутов цвета)</li>
                      <li><strong>Изображения-образцы (image_swatch)</strong> - миниатюры изображений</li>
                      <li><strong>Переключатель (toggle)</strong> - переключатель Вкл/Выкл (как на скриншоте)</li>
                      <li><strong>Диапазон (range)</strong> - поля "От" и "До" для числовых значений</li>
                    </ul>
                    <p className="mt-2 text-xs italic">
                      💡 <strong>Важно:</strong> Способ отображения определяет только внешний вид на фронтенде. 
                      Логика работы (один выбор / множественный выбор) определяется типом атрибута.
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-1 font-medium">🔄 Логика отображения в форме товара:</p>
                  <ul className="ml-4 list-disc space-y-1">
                    <li><strong>Select</strong> показывается если: тип = <code>select</code>/<code>multiselect</code> ИЛИ есть предустановленные значения</li>
                    <li><strong>Input/TextArea</strong> показывается если: тип = <code>text</code>/<code>number</code>/<code>textarea</code> И нет предустановленных значений</li>
                  </ul>
                </div>

                <div className="mt-3 rounded bg-light-100 dark:bg-dark-300 p-2">
                  <p className="mb-1 font-medium">✅ Итоговая логика:</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-200">
                        <th className="p-1 text-left">Тип</th>
                        <th className="p-1 text-left">Есть values?</th>
                        <th className="p-1 text-left">Поле</th>
                        <th className="p-1 text-left">Свое значение?</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border-200">
                        <td className="p-1"><code>select</code></td>
                        <td className="p-1">✅ Да</td>
                        <td className="p-1">Select</td>
                        <td className="p-1">❌ Нет</td>
                      </tr>
                      <tr className="border-b border-border-200">
                        <td className="p-1"><code>multiselect</code></td>
                        <td className="p-1">✅ Да</td>
                        <td className="p-1">MultiSelect</td>
                        <td className="p-1">❌ Нет</td>
                      </tr>
                      <tr className="border-b border-border-200">
                        <td className="p-1"><code>text</code></td>
                        <td className="p-1">❌ Нет</td>
                        <td className="p-1">Input</td>
                        <td className="p-1">✅ Да</td>
                      </tr>
                      <tr className="border-b border-border-200">
                        <td className="p-1"><code>number</code></td>
                        <td className="p-1">❌ Нет</td>
                        <td className="p-1">Input</td>
                        <td className="p-1">✅ Да</td>
                      </tr>
                      <tr>
                        <td className="p-1"><code>boolean</code></td>
                        <td className="p-1">-</td>
                        <td className="p-1">Select</td>
                        <td className="p-1">❌ Нет</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-4 text-end">
          {initialValues && (
            <Button
              variant="outline"
              onClick={router.back}
              className="me-4"
              type="button"
            >
              {t('form:button-label-back')}
            </Button>
          )}

          <Button loading={creating || updating} type="submit">
            {initialValues
              ? t('form:button-label-update')
              : t('form:button-label-save')}{' '}
            {t('common:attribute')}
          </Button>
        </div>
      </form>
    </>
  );
}
