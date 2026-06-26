import Input from '@/components/ui/input';
import TextArea from '@/components/ui/text-area';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import Button from '@/components/ui/button';
import Description from '@/components/ui/description';
import Card from '@/components/common/card';
import Label from '@/components/ui/label';
import Radio from '@/components/ui/radio/radio';
import { useRouter } from 'next/router';
import { yupResolver } from '@hookform/resolvers/yup';
import FileInput from '@/components/ui/file-input';
import ProductCategoryInput from '../product/product-category-input';
import ProductTypeSelect from './product-type-select';
import ProductTagInput from '../product/product-tag-input';
import ProductDimensionsForm from '../product/product-dimensions-form';
import { ProductStatus, ProductGroup, Attachment } from '@/types';
import { useTranslation } from 'next-i18next';
import { useShopQuery } from '@/data/shop';
import { Config } from '@/config';
import Alert from '@/components/ui/alert';
import { useState, useEffect } from 'react';
import { getErrorMessage } from '@/utils/form-error';
import {
  useCreateProductGroupMutation,
  useUpdateProductGroupMutation,
} from '@/data/product-group';
import { formatSlug } from '@/utils/use-slug';
import { productGroupValidationSchema } from './product-group-validation-schema';
import { EditIcon } from '@/components/icons/edit';
import { toast } from 'react-toastify';

type FormValues = {
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  type_id: any;
  category: any;
  status: ProductStatus;
  main_image?: Attachment;
  gallery?: Attachment[];
  tags?: any[];
  video?: Array<{ url: string }>;
  // Габариты - ОБЯЗАТЕЛЬНЫ!
  height: number | string;
  length: number | string;
  width: number | string;
  weight: number | string;
};

const defaultValues = {
  title: '',
  slug: '',
  description: '',
  short_description: '',
  type_id: null,
  category: null,
  status: ProductStatus.Draft,
  main_image: undefined,
  gallery: [],
  tags: [],
  video: [],
  height: '',
  length: '',
  width: '',
  weight: '',
};

type ProductGroupFormProps = {
  initialValues?: ProductGroup | null;
};

export default function ProductGroupForm({
  initialValues,
}: ProductGroupFormProps) {
  const router = useRouter();
  const { locale } = router;
  const { t } = useTranslation();
  const [isSlugDisable, setIsSlugDisable] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSlugEditable = router?.query?.action === 'edit' && router?.locale === Config.defaultLanguage;

  const { data: shopData, isLoading: loadingShop } = useShopQuery(
    { slug: router.query.shop as string },
    {
      enabled: !!router.query.shop,
    }
  );
  const shopId = shopData?.id!;

  const methods = useForm<FormValues>({
    resolver: yupResolver(productGroupValidationSchema),
    shouldUnregister: true,
    // @ts-ignore
    defaultValues: initialValues
      ? {
          ...initialValues,
          type_id: initialValues.type
            ? { id: initialValues.type.id, name: initialValues.type.name }
            : null,
          category: initialValues.category
            ? { id: initialValues.category.id, name: initialValues.category.name }
            : null,
        }
      : defaultValues,
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    watch,
    getValues,
    formState: { errors },
  } = methods;

  const { mutate: createProductGroup, isLoading: creating } =
    useCreateProductGroupMutation();
  const { mutate: updateProductGroup, isLoading: updating } =
    useUpdateProductGroupMutation();

  const statusList = [
    {
      label: 'form:input-label-publish',
      id: 'publish',
      value: ProductStatus.Publish,
    },
    {
      label: 'form:input-label-draft',
      id: 'draft',
      value: ProductStatus.Draft,
    },
  ];

  const watchTitle = watch('title');
  const isTranslation = router.locale !== Config.defaultLanguage;

  useEffect(() => {
    if (!initialValues && watchTitle) {
      setValue('slug', formatSlug(watchTitle));
    }
  }, [watchTitle, initialValues, setValue]);

  const onSubmit = async (values: FormValues) => {
    console.log('=== ProductGroupForm onSubmit ===');
    console.log('Values:', values);
    console.log('ShopId:', shopId);
    
    setErrorMessage(null);

    // Валидация на клиенте
    if (!values.title) {
      setError('title', {
        type: 'manual',
        message: 'form:error-title-required',
      });
      toast.error(t('form:error-title-required'));
      return;
    }

    if (!values.type_id || !values.type_id.id) {
      setError('type_id', {
        type: 'manual',
        message: 'form:error-type-required',
      });
      toast.error(t('form:error-type-required'));
      return;
    }

    if (!values.category || !values.category.id) {
      setError('category', {
        type: 'manual',
        message: 'form:error-category-required',
      });
      toast.error(t('form:error-category-required'));
      return;
    }

    if (!shopId) {
      toast.error(t('form:error-shop-id-required'));
      return;
    }

    // Валидация габаритов
    if (!values.height || Number(values.height) < 1) {
      setError('height', { type: 'manual', message: 'form:error-height-required' });
      toast.error(t('form:error-height-required'));
      return;
    }

    if (!values.length || Number(values.length) < 1) {
      setError('length', { type: 'manual', message: 'form:error-length-required' });
      toast.error(t('form:error-length-required'));
      return;
    }

    if (!values.width || Number(values.width) < 1) {
      setError('width', { type: 'manual', message: 'form:error-width-required' });
      toast.error(t('form:error-width-required'));
      return;
    }

    if (!values.weight || Number(values.weight) < 1) {
      setError('weight', { type: 'manual', message: 'form:error-weight-required' });
      toast.error(t('form:error-weight-required'));
      return;
    }

    // Получаем slug из формы принудительно (т.к. поле может быть disabled)
    const currentSlug = getValues('slug');
    
    // Безопасное извлечение ID из объектов
    const getIdFromValue = (value: any): number | null => {
      if (!value) return null;
      if (typeof value === 'number') return value;
      if (typeof value === 'object' && value.id) return Number(value.id);
      return null;
    };
    
    // Формируем данные для отправки
    const input: any = {
      language: router.locale,
      title: values.title,
      description: values.description || '',
      short_description: values.short_description || '',
      type_id: getIdFromValue(values.type_id),
      category_id: getIdFromValue(values.category),
      status: values.status,
      main_image: values.main_image,
      gallery: values.gallery,
      video: values.video,
      tags: values.tags?.map((t: any) => getIdFromValue(t)).filter(Boolean),
      shop_id: shopId,
      // Габариты - приводим к числу и проверяем что не NaN
      height: Number(values.height) || null,
      length: Number(values.length) || null,
      width: Number(values.width) || null,
      weight: Number(values.weight) || null,
    };
    
    // При обновлении передаем текущий slug (даже если поле disabled)
    if (initialValues && currentSlug) {
      input.slug = currentSlug;
    }
    // При создании НЕ передаем slug - пусть бэкенд сам генерирует

    console.log('Submitting input:', input);
    console.log('Is update?', !!initialValues);

    if (initialValues) {
      updateProductGroup({
        ...input,
        id: initialValues.id,
      });
    } else {
      createProductGroup(input);
    }
  };

  return (
    <>
      {errorMessage && (
        <Alert
          message={t(errorMessage)}
          variant="error"
          closeable={true}
          className="mt-5"
          onClose={() => setErrorMessage(null)}
        />
      )}
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Основная информация */}
          <div className="my-5 flex flex-wrap sm:my-8">
            <Description
              title={t('form:form-title-group-information')}
              details={t('form:product-group-form-info-help-text')}
              className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
            />

            <Card className="w-full sm:w-8/12 md:w-2/3">
              <Input
                label={`${t('form:input-label-title')}*`}
                {...register('title')}
                error={t(errors.title?.message!)}
                variant="outline"
                className="mb-5"
              />

              <div className="relative mb-5">
                <Input
                  label={t('form:input-label-slug')}
                  {...register('slug')}
                  error={t(errors.slug?.message!)}
                  variant="outline"
                  disabled={isSlugDisable}
                />
                {isSlugEditable && (
                  <button
                    className="absolute top-[27px] right-px z-10 flex h-[46px] w-11 items-center justify-center rounded-tr rounded-br border-l border-solid border-border-base bg-white px-2 text-body transition duration-200 hover:text-heading focus:outline-none"
                    type="button"
                    title={t('common:text-edit')}
                    onClick={() => setIsSlugDisable(!isSlugDisable)}
                  >
                    <EditIcon width={14} />
                  </button>
                )}
              </div>

              <TextArea
                label={t('form:input-label-short-description')}
                {...register('short_description')}
                variant="outline"
                className="mb-5"
                rows={3}
              />

              <div className="mb-5">
                <Label>{t('form:input-label-description')}</Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <RichTextEditor
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div>
                <Label>{t('form:input-label-status')}</Label>
                <div className="space-y-3.5">
                  {statusList?.map((status: any) => (
                    <Radio
                      key={status.id}
                      {...register('status')}
                      label={t(status.label)}
                      id={status.id}
                      value={status.value}
                      className="mb-2"
                    />
                  ))}
                </div>
                {errors.status && (
                  <p className="my-2 text-xs text-red-500">
                    {t(errors.status?.message!)}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Тип товара */}
          <div className="my-5 flex flex-wrap sm:my-8">
            <Description
              title={t('form:form-title-product-type')}
              details={t('form:form-description-group-type')}
              className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
            />

            <Card className="w-full sm:w-8/12 md:w-2/3">
              <ProductTypeSelect 
                control={control} 
                error={errors.type_id?.message}
              />
            </Card>
          </div>

          {/* Изображения */}
          <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
            <Description
              title={t('form:featured-image-title')}
              details={t('form:featured-image-help-text')}
              className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
            />

            <Card className="w-full sm:w-8/12 md:w-2/3">
              <FileInput 
                name="main_image" 
                control={control} 
                multiple={false}
              />
            </Card>
          </div>

          <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
            <Description
              title={t('form:gallery-title')}
              details={t('form:gallery-help-text')}
              className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
            />

            <Card className="w-full sm:w-8/12 md:w-2/3">
              <FileInput 
                name="gallery" 
                control={control}
              />
            </Card>
          </div>

          {/* Категории и теги */}
          <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
            <Description
              title={t('form:form-title-categories-tags')}
              details={t('form:form-description-categories-tags')}
              className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
            />

            <Card className="w-full sm:w-8/12 md:w-2/3">
              <ProductCategoryInput control={control} />
              {errors.category && (
                <p className="mb-5 text-xs text-red-500">
                  {t(errors.category?.message!)}
                </p>
              )}
              <div className="mt-5">
                <ProductTagInput control={control} setValue={setValue} />
              </div>
            </Card>
          </div>

          {/* Габариты и вес - ОБЯЗАТЕЛЬНО! */}
          <ProductDimensionsForm />

          <div className="mb-4 text-end">
            <Button 
              type="submit"
              loading={creating || updating} 
              disabled={creating || updating || !shopId || loadingShop}
              className="text-sm h-12 md:text-base"
            >
              {initialValues
                ? t('form:button-label-update-group')
                : t('form:button-label-create-group')}
            </Button>
          </div>
        </form>
      </FormProvider>
    </>
  );
}
