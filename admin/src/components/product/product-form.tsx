import Input from '@/components/ui/input';
import TextArea from '@/components/ui/text-area';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { useForm, useFieldArray, FormProvider, Controller } from 'react-hook-form';
import Button from '@/components/ui/button';
import Description from '@/components/ui/description';
import Card from '@/components/common/card';
import Label from '@/components/ui/label';
import Radio from '@/components/ui/radio/radio';
import { useRouter } from 'next/router';
import { yupResolver } from '@hookform/resolvers/yup';
import FileInput from '@/components/ui/file-input';
import { productValidationSchema } from './product-validation-schema';
import ProductVariableForm from './product-variable-form';
import ProductSimpleForm from './product-simple-form';
import ProductGroupInput from './product-group-input';
import ProductCategoryInput from './product-category-input';
import ProductTypeInput from './product-type-input';
import { ProductType, Product, ProductStatus } from '@/types';
import { useTranslation } from 'next-i18next';
import { useShopQuery } from '@/data/shop';
import ProductTagInput from './product-tag-input';
import ProductAttributesForm from './product-attributes-form';
import ProductDimensionsForm from './product-dimensions-form';
import { Config } from '@/config';
import Alert from '@/components/ui/alert';
import { useMemo, useState, useEffect, useRef } from 'react';
import ProductAuthorInput from './product-author-input';
import ProductManufacturerInput from './product-manufacturer-input';
import { EditIcon } from '@/components/icons/edit';
import {
  getProductDefaultValues,
  getProductInputValues,
  ProductFormValues,
  productTypeOptions,
} from './form-utils';
import { getErrorMessage } from '@/utils/form-error';
import {
  useCreateProductMutation,
  useUpdateProductMutation,
} from '@/data/product';
import { split, join, isEmpty } from 'lodash';
import { adminOnly, getAuthCredentials, hasAccess } from '@/utils/auth-utils';
import { useSettingsQuery } from '@/data/settings';
import { toast } from 'react-toastify';
import Tooltip from '@/components/ui/tooltip';
import { useModalAction } from '@/components/ui/modal/modal.context';
import OpenAIButton from '@/components/openAI/openAI.button';
import { ItemProps } from '@/types';
import { formatSlug } from '@/utils/use-slug';

export const chatbotAutoSuggestion = ({ name }: { name: string }) => {
  return [
    {
      id: 1,
      title: `Write a product description about ${name} in 100 words or less that highlights the key benefits of the product.`,
    },
    {
      id: 2,
      title: `Create a product description about ${name} using HTML tags and include a product ID.`,
    },
    {
      id: 3,
      title: `Write a product description about ${name} using sensory language to appeal to the reader's senses.`,
    },
    {
      id: 4,
      title: `Create a product description about ${name} that includes customer reviews and ratings.`,
    },
    {
      id: 5,
      title: `Write a product description about ${name} using storytelling techniques to create an emotional connection with the reader.`,
    },
    {
      id: 6,
      title: `Write a product description about ${name} that compares and contrasts the product with similar products on the market.`,
    },
    {
      id: 7,
      title: `Create a product description about ${name} that highlights the product's sustainability and eco-friendliness.`,
    },
    {
      id: 8,
      title: `Write a product description about ${name} that includes a list of frequently asked questions and their answers.`,
    },
    {
      id: 9,
      title: `Create a product description about ${name} that includes a video demonstration of the product in use.`,
    },
    {
      id: 10,
      title: `Write a product description about ${name} that includes a call-to-action and encourages the reader to make a purchase.`,
    },
  ];
};

type ProductFormProps = {
  initialValues?: Product | null;
  initialProductType?: ProductType;
};

export default function CreateOrUpdateProductForm({
  initialValues,
  initialProductType,
}: ProductFormProps) {
  const router = useRouter();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const { locale } = router;
  
  // Инициализируем превью видео при загрузке формы, если есть существующее видео
  useEffect(() => {
    if (initialValues?.video && Array.isArray(initialValues.video) && initialValues.video.length > 0) {
      const firstVideo = initialValues.video[0] as any;
      const previewUrl = firstVideo?.poster_url || firstVideo?.thumbnail_url || firstVideo?.preview_url || firstVideo?.video_url || firstVideo?.url;
      if (previewUrl) {
        setVideoPreview(previewUrl);
      }
    } else {
      setVideoPreview('');
    }
  }, [initialValues?.video]);
  const {
    // @ts-ignore
    settings: { options },
  } = useSettingsQuery({
    language: locale!,
  });
  const [isSlugDisable, setIsSlugDisable] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { t } = useTranslation();
  const { openModal } = useModalAction();
  const { permissions } = getAuthCredentials();
  let permission = hasAccess(adminOnly, permissions);

  const { data: shopData } = useShopQuery(
    { slug: router.query.shop as string },
    {
      enabled: !!router.query.shop,
    }
  );
  const shopId = shopData?.id!;
  const isNewTranslation = router?.query?.action === 'translate';
  const isSlugEditable =
    router?.query?.action === 'edit' &&
    router?.locale === Config.defaultLanguage;
  const methods = useForm<ProductFormValues>({
    resolver: yupResolver(productValidationSchema),
    shouldUnregister: true,
    // @ts-ignore
    defaultValues: initialValues
      ? {
          ...getProductDefaultValues(initialValues, isNewTranslation),
        }
      : {
          ...getProductDefaultValues(null, isNewTranslation),
          ...(initialProductType && {
            product_type: productTypeOptions.find(
              (option) => option.value === initialProductType
            ) || productTypeOptions[0],
          }),
        },
  });
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    watch,
    reset,
    formState: { errors },
  } = methods;

  // ВАЖНО: Обновляем форму при изменении initialValues (когда данные загружаются с сервера)
  useEffect(() => {
    const defaultValues = getProductDefaultValues(
      initialValues,
      isNewTranslation
    );
    reset(defaultValues);
  }, [initialValues, isNewTranslation, reset]);

  // Определяем доступные статусы для пользователя
  const statusList = useMemo(() => {
    let list = [
      {
        label: 'form:input-label-draft',
        id: 'draft',
        value: ProductStatus.Draft,
      },
      {
        label: 'form:input-label-under-review',
        id: 'under_review',
        value: ProductStatus.UnderReview,
      },
    ];

    // Правильная логика отображения статусов с учетом модерации
    if (Boolean(options?.isProductReview)) {
      if (permission) {
        // Для администраторов - все статусы
        list = [
          {
            label: 'form:input-label-published',
            id: 'published',
            value: ProductStatus.Publish,
          },
          {
            label: 'form:input-label-draft',
            id: 'draft',
            value: ProductStatus.Draft,
          },
          {
            label: 'form:input-label-under-review',
            id: 'under_review',
            value: ProductStatus.UnderReview,
          },
          {
            label: 'form:input-label-approved',
            id: 'approved',
            value: ProductStatus.Approved,
          },
          {
            label: 'form:input-label-rejected',
            id: 'rejected',
            value: ProductStatus.Rejected,
          },
          {
            label: 'form:input-label-soft-disabled',
            id: 'unpublish',
            value: ProductStatus.UnPublish,
          },
        ];
      } else if (initialValues) {
        // Для обычных пользователей - ограниченные права
        if (
          initialValues?.status === ProductStatus.Publish ||
          initialValues?.status === ProductStatus.Approved ||
          initialValues?.status === ProductStatus.UnPublish
        ) {
          // Если товар уже опубликован/одобрен - только публикация и снятие с публикации
          list = [
            {
              label: 'form:input-label-published',
              id: 'published',
              value: ProductStatus.Publish,
            },
            {
              label: 'form:input-label-soft-disabled',
              id: 'unpublish',
              value: ProductStatus.UnPublish,
            },
          ];
        } else if (initialValues?.status === ProductStatus.Rejected) {
          // Если товар отклонен - только черновик и отправка на модерацию
          list = [
            {
              label: 'form:input-label-draft',
              id: 'draft',
              value: ProductStatus.Draft,
            },
            {
              label: 'form:input-label-under-review',
              id: 'under_review',
              value: ProductStatus.UnderReview,
            },
          ];
        }
        // Для остальных случаев (новый товар, черновик, на модерации) - используется базовый list
      }
    } else {
      // Если модерация отключена - только основные статусы
      list = [
        {
          label: 'form:input-label-published',
          id: 'published',
          value: ProductStatus.Publish,
        },
        {
          label: 'form:input-label-draft',
          id: 'draft',
          value: ProductStatus.Draft,
        },
      ];
    }

    return list;
  }, [initialValues, permission, options]);

  // Синхронизация статуса с формой
  useEffect(() => {
    if (initialValues?.status) {
      console.log('Product status from API:', initialValues.status);
      console.log('User permission:', permission);
      console.log('Available statuses for user:', statusList.map(s => s.value));
      setValue('status', initialValues.status);
    }
  }, [initialValues?.status, setValue, permission, statusList]);

  // Отладочная информация для изображений при загрузке формы
  useEffect(() => {
    if (initialValues) {
      console.log('ProductForm - initialValues image:', initialValues.image);
      console.log('ProductForm - initialValues gallery:', initialValues.gallery);
      console.log('ProductForm - initialValues image type:', typeof initialValues.image);
      console.log('ProductForm - initialValues gallery isArray:', Array.isArray(initialValues.gallery));
    }
  }, [initialValues]);

  const upload_max_filesize = options?.server_info?.upload_max_filesize / 1024;

  const { mutate: createProduct, isLoading: creating } =
    useCreateProductMutation();
  const { mutate: updateProduct, isLoading: updating } =
    useUpdateProductMutation();

  const onSubmit = async (values: ProductFormValues) => {
    // ВАЖНО: Проверка, что type (тип товара) выбран
    if (!values.type || !values.type.id) {
      setError('type', {
        type: 'manual',
        message: 'Необходимо выбрать тип товара',
      });
      toast.error('Необходимо выбрать тип товара (Группа товара)');
      return;
    }
    
    // Проверка для вариативных товаров
    const productTypeValue = values.product_type?.value || values.product_type;
    if (productTypeValue === ProductType.Variable) {
      // Проверяем, что выбраны вариации
      if (!values.variations || !Array.isArray(values.variations) || values.variations.length === 0) {
        setError('variations', {
          type: 'manual',
          message: 'Необходимо выбрать хотя бы один атрибут для вариаций',
        });
        toast.error('Необходимо выбрать хотя бы один атрибут для вариаций');
        return;
      }
      
      // Проверяем, что у каждой вариации выбраны значения
      const invalidVariations = values.variations.filter((variation: any) => {
        return !variation?.attribute || !variation?.value || !Array.isArray(variation.value) || variation.value.length === 0;
      });
      
      if (invalidVariations.length > 0) {
        setError('variations', {
          type: 'manual',
          message: 'Каждый атрибут должен иметь выбранные значения',
        });
        toast.error('Каждый атрибут должен иметь выбранные значения');
        return;
      }
      
      // Проверяем, что созданы варианты
      if (!values.variation_options || !Array.isArray(values.variation_options) || values.variation_options.length === 0) {
        setError('variation_options', {
          type: 'manual',
          message: 'Необходимо создать хотя бы один вариант товара. Выберите атрибуты и их значения, затем заполните данные для вариантов.',
        });
        toast.error('Необходимо создать хотя бы один вариант товара. Выберите атрибуты и их значения, затем заполните данные для вариантов.');
        return;
      }
      
      // Проверяем, что все варианты заполнены
      const invalidOptions = values.variation_options.filter((option: any) => {
        return !option?.price || option?.price === '' || 
               !option?.quantity || option?.quantity === '' ||
               !option?.sku || option?.sku.trim() === '';
      });
      
      if (invalidOptions.length > 0) {
        setError('variation_options', {
          type: 'manual',
          message: 'Все варианты должны иметь цену, количество и SKU',
        });
        toast.error('Все варианты должны иметь цену, количество и SKU');
        return;
      }
    }
    
    const inputValues = {
      language: router.locale,
      ...getProductInputValues(values, initialValues, isNewTranslation),
    };
    
    // Дополнительное логирование для отладки обновления
    if (initialValues) {
      console.log('=== ProductForm onSubmit - UPDATE MODE ===');
      console.log('Initial values product_type:', initialValues.product_type);
      console.log('Initial values variations count:', initialValues.variations?.length || 0);
      console.log('Initial values variation_options count:', initialValues.variation_options?.length || 0);
      console.log('New values product_type:', values.product_type);
      console.log('New values variations count:', values.variations?.length || 0);
      console.log('New values variation_options count:', values.variation_options?.length || 0);
      console.log('Is new translation:', isNewTranslation);
      console.log('Translated languages:', initialValues.translated_languages);
      console.log('Current locale:', router.locale);
    }

        // Отладочная информация перед отправкой
    console.log('=== ProductForm onSubmit - START ===');
    console.log('ProductForm onSubmit - values:', values);
    console.log('ProductForm onSubmit - values.type:', values.type);
    console.log('ProductForm onSubmit - values.type.id:', values.type?.id);
    console.log('ProductForm onSubmit - values.product_type:', values.product_type);
    console.log('ProductForm onSubmit - values.variations:', values.variations);
    console.log('ProductForm onSubmit - values.variation_options:', values.variation_options);
    console.log('ProductForm onSubmit - inputValues:', inputValues);
    console.log('ProductForm onSubmit - inputValues.type_id:', inputValues.type_id);
    console.log('ProductForm onSubmit - inputValues.variations:', inputValues.variations);
    console.log('ProductForm onSubmit - inputValues.variation_options:', inputValues.variation_options);
    console.log('ProductForm onSubmit - inputValues.product_type:', inputValues.product_type);

    try {
      // Проверяем, есть ли видео файл для загрузки
      // ВАЖНО: Проверяем и values.video, и videoInputRef.current?.files
      // так как файл может быть установлен через setValue или напрямую через input
      const videoFileFromValues = values.video;
      const videoFileFromInput = videoInputRef.current?.files?.[0];
      const videoFile = videoFileFromValues instanceof File ? videoFileFromValues : 
                       (videoFileFromInput instanceof File ? videoFileFromInput : null);
      const videoAsCover = values.video_as_cover || false;
      
      // Логируем проверку видео файла
      console.log('Checking video file:', {
        videoFileFromValues,
        videoFileFromInput,
        videoFile,
        isFile: videoFile instanceof File,
        type: typeof videoFile,
        constructor: videoFile?.constructor?.name,
        hasVideo: !!videoFile,
        videoInputRef: videoInputRef.current,
        videoInputFiles: videoInputRef.current?.files,
      });
      
      // Если есть видео файл, отправляем через FormData
      if (videoFile && videoFile instanceof File) {
        console.log('ProductForm onSubmit - Video file detected, using FormData');
        const formData = new FormData();
        
        // Удаляем video из inputValues, чтобы не было конфликта
        const { video: _, ...inputValuesWithoutVideo } = inputValues;
        
        // ВАЖНО: Извлекаем product_type ДО цикла, чтобы гарантировать его наличие
        let productTypeValue: string | undefined = undefined;
        if (inputValuesWithoutVideo.product_type !== undefined && inputValuesWithoutVideo.product_type !== null) {
          const productType = inputValuesWithoutVideo.product_type;
          if (typeof productType === 'object' && productType !== null && 'value' in productType) {
            productTypeValue = String((productType as any).value);
          } else if (typeof productType === 'string') {
            productTypeValue = productType;
          }
        }
        // Если product_type не найден, берем из values напрямую
        if (!productTypeValue && values.product_type) {
          if (typeof values.product_type === 'object' && values.product_type !== null && 'value' in values.product_type) {
            productTypeValue = String((values.product_type as any).value);
          } else if (typeof values.product_type === 'string') {
            productTypeValue = values.product_type;
          }
        }
        // Если все еще нет, используем значение из initialValues или дефолтное
        if (!productTypeValue) {
          productTypeValue = initialValues?.product_type || 'simple';
        }
        
        // Добавляем все данные формы (без video)
        Object.keys(inputValuesWithoutVideo).forEach((key) => {
          const value = inputValuesWithoutVideo[key as keyof typeof inputValuesWithoutVideo];
          if (value !== undefined && value !== null) {
            // Пропускаем product_type здесь, добавим его отдельно после цикла
            if (key === 'product_type') {
              return;
            }
            if (typeof value === 'object' && !(value instanceof File) && !Array.isArray(value)) {
              // Для объектов используем JSON.stringify
              formData.append(key, JSON.stringify(value));
            } else if (Array.isArray(value)) {
              // Для массивов также используем JSON.stringify
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, value as string | Blob);
            }
          }
        });
        
        // ВАЖНО: Добавляем product_type ОБЯЗАТЕЛЬНО (даже если его не было в inputValues)
        formData.append('product_type', productTypeValue);
        
        // Добавляем видео файл отдельно
        console.log('Adding video file to FormData:', {
          videoFile,
          isFile: videoFile instanceof File,
          fileName: videoFile instanceof File ? videoFile.name : 'NOT_A_FILE',
          fileSize: videoFile instanceof File ? videoFile.size : 'NOT_A_FILE',
          fileType: videoFile instanceof File ? videoFile.type : 'NOT_A_FILE',
        });
        
        // ВАЖНО: Добавляем файл с правильным именем
        formData.append('video', videoFile, videoFile.name);
        
        // Проверяем, что файл добавлен
        const videoInFormData = formData.get('video');
        console.log('Video in FormData after append:', {
          exists: videoInFormData !== null,
          isFile: videoInFormData instanceof File,
          name: videoInFormData instanceof File ? videoInFormData.name : 'NOT_A_FILE',
          size: videoInFormData instanceof File ? videoInFormData.size : 'NOT_A_FILE',
        });
        
        // Добавляем флаг "Сделать обложкой"
        if (videoAsCover) {
          formData.append('video_as_cover', '1');
        }
        
        // Добавляем дополнительные поля
        if (initialValues?.slug) {
          formData.append('slug', initialValues.slug);
        }
        formData.append('shop_id', (shopId || initialValues?.shop_id || '').toString());
        
        // ВАЖНО: Добавляем type_id, если он есть
        const typeId = inputValuesWithoutVideo.type_id || initialValues?.type?.id || initialValues?.type_id;
        if (typeId) {
          formData.append('type_id', typeId.toString());
          console.log('Adding type_id to FormData:', typeId);
        } else {
          console.warn('type_id not found in FormData update!', {
            inputValuesTypeId: inputValuesWithoutVideo.type_id,
            initialTypeId: initialValues?.type?.id,
            initialTypeIdDirect: initialValues?.type_id,
          });
        }
        
        // Логируем для отладки
        console.log('FormData keys:', Array.from(formData.keys()));
        console.log('product_type in FormData:', formData.get('product_type'));
        console.log('product_type value used:', productTypeValue);
        console.log('id in FormData:', formData.get('id'));
        console.log('video in FormData:', formData.get('video'));
        
        if (
          !initialValues ||
          !initialValues.translated_languages.includes(router.locale!)
        ) {
          //@ts-ignore
          createProduct(formData);
        } else {
          formData.append('id', initialValues.id!.toString());
          console.log('=== Updating product (FormData with video) ===');
          console.log('Product ID:', initialValues.id);
          console.log('FormData keys:', Array.from(formData.keys()));
          console.log('product_type in FormData:', formData.get('product_type'));
          console.log('variations in FormData:', formData.get('variations'));
          console.log('variation_options in FormData:', formData.get('variation_options'));
          //@ts-ignore
          updateProduct(formData);
        }
      } else {
        // Обычная отправка без видео файла
        console.log('No video file detected, using JSON');
        // Удаляем только video из inputValues (но не video_as_cover!)
        // ВАЖНО: video должно передаваться только как File через FormData
        // video_as_cover уже включен в inputValues через getProductInputValues
        const { video: _, ...cleanInputValues } = inputValues;
        
        // Дополнительно проверяем, что video не попало в объект
        if ('video' in cleanInputValues) {
          delete cleanInputValues.video;
        }
        
        console.log('Sending JSON without video:', {
          hasVideo: 'video' in cleanInputValues,
          hasVideoAsCover: 'video_as_cover' in cleanInputValues,
          videoAsCoverValue: cleanInputValues.video_as_cover,
          hasExistingVideo: Array.isArray(initialValues?.video) && initialValues.video.length > 0,
          keys: Object.keys(cleanInputValues),
          product_type: cleanInputValues.product_type,
          variations: cleanInputValues.variations,
          variation_options: cleanInputValues.variation_options,
          variation_options_type: typeof cleanInputValues.variation_options,
          variation_options_stringified: JSON.stringify(cleanInputValues.variation_options),
        });
        
        if (
          !initialValues ||
          !initialValues.translated_languages.includes(router.locale!)
        ) {
          const createData = {
            ...cleanInputValues,
            ...(initialValues?.slug && { slug: initialValues.slug }),
            shop_id: shopId || initialValues?.shop_id,
          };
          
          console.log('Creating product with data:', {
            product_type: createData.product_type,
            has_variations: !!createData.variations,
            variations_count: Array.isArray(createData.variations) ? createData.variations.length : 0,
            has_variation_options: !!createData.variation_options,
            variation_options_upsert: createData.variation_options?.upsert,
            variation_options_upsert_count: Array.isArray(createData.variation_options?.upsert) ? createData.variation_options.upsert.length : 0,
          });
          
          //@ts-ignore
          createProduct(createData);
        } else {
          // Обновление товара
          const updateData = {
            ...cleanInputValues,
            id: initialValues.id!,
            shop_id: initialValues.shop_id!,
          };
          
          console.log('=== Updating product (JSON) ===');
          console.log('Update data:', {
            id: updateData.id,
            product_type: updateData.product_type,
            has_variations: !!updateData.variations,
            variations_count: Array.isArray(updateData.variations) ? updateData.variations.length : 0,
            has_variation_options: !!updateData.variation_options,
            variation_options_upsert: updateData.variation_options?.upsert,
            variation_options_upsert_count: Array.isArray(updateData.variation_options?.upsert) ? updateData.variation_options.upsert.length : 0,
            variation_options_delete: updateData.variation_options?.delete,
            variation_options_delete_count: Array.isArray(updateData.variation_options?.delete) ? updateData.variation_options.delete.length : 0,
            keys: Object.keys(updateData),
          });
          
          //@ts-ignore
          updateProduct(updateData);
        }
      }
    } catch (error) {
      const serverErrors = getErrorMessage(error);
      Object.keys(serverErrors?.validation).forEach((field: any) => {
        setError(field.split('.')[1], {
          type: 'manual',
          message: serverErrors?.validation[field][0],
        });
      });
    }
  };
  const product_type = watch('product_type');
  const is_digital = watch('is_digital');
  const is_external = watch('is_external');
  const productName = watch('name');

  const autoSuggestionList = useMemo(() => {
    return chatbotAutoSuggestion({ name: productName ?? '' });
  }, [productName]);

  const handleGenerateDescription = useCallback(() => {
    openModal('GENERATE_DESCRIPTION', {
      control,
      name: productName,
      set_value: setValue,
      key: 'description',
      suggestion: autoSuggestionList as ItemProps[],
    });
  }, [productName]);

  const slugAutoSuggest = formatSlug(watch('name'));
  // Auto-set slug from name when slug is not editable (create/translate modes)
  useEffect(() => {
    if (!isSlugEditable) {
      setValue('slug', slugAutoSuggest);
    }
  }, [slugAutoSuggest, isSlugEditable, setValue]);

  const featuredImageInformation = (
    <span>
      {t('form:featured-image-help-text')} <br />
      {t('form:size-help-text')} &nbsp;
      <span className="font-bold">{upload_max_filesize} MB </span>
    </span>
  );

  const galleryImageInformation = (
    <span>
      {t('form:gallery-help-text')} <br />
      {t('form:size-help-text')} &nbsp;
      <span className="font-bold">{upload_max_filesize} MB </span>
    </span>
  );

  return (
    <>
      {errorMessage ? (
        <Alert
          message={t(`common:${errorMessage}`)}
          variant="error"
          closeable={true}
          className="mt-5"
          onClose={() => setErrorMessage(null)}
        />
      ) : null}
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
            <Description
              title={t('form:featured-image-title')}
              details={featuredImageInformation}
              className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
            />

            <Card className="w-full sm:w-8/12 md:w-2/3">
              <FileInput 
                name="image" 
                control={control} 
                multiple={false}
                maxSize={5 * 1024 * 1024}
              />
              {/* {errors.image?.message && (
                <p className="my-2 text-xs text-red-500">
                  {t(errors?.image?.message!)}
                </p>
              )} */}
            </Card>
          </div>

          <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
            <Description
              title={t('form:gallery-title')}
              details={galleryImageInformation}
              className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
            />

            <Card className="w-full sm:w-8/12 md:w-2/3">
              <FileInput 
                name="gallery" 
                control={control}
                maxSize={5 * 1024 * 1024}
              />
            </Card>
          </div>

          {/* ВРЕМЕННО ЗАКОММЕНТИРОВАНО: Раздел добавления видео */}
          {false && (
          <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
            <Description
              title={t('form:video-title')}
              details={t('form:video-help-text')}
              className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
            />

            <Card className="w-full sm:w-8/12 md:w-2/3">
              <div className="mb-5">
                <Label className="mb-3 block text-sm font-semibold leading-none text-body-dark">
                  Видео (до 40 Мб)
                </Label>
                <div className="relative">
                  <input
                    type="file"
                    accept="video/*"
                    ref={videoInputRef}
                    className="hidden"
                    id="video-upload-product"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      console.log('Video input onChange:', {
                        file,
                        isFile: file instanceof File,
                        fileName: file?.name,
                        fileSize: file?.size,
                        fileType: file?.type,
                      });
                      if (file) {
                        setValue('video', file as any, { shouldDirty: true, shouldValidate: false });
                        setVideoPreview(URL.createObjectURL(file));
                        console.log('Video file set in form:', {
                          videoValue: values.video,
                          setValueCalled: true,
                        });
                      } else {
                        setValue('video', undefined);
                        setVideoPreview('');
                      }
                    }}
                  />
                  <label
                    htmlFor="video-upload-product"
                    className="flex items-center justify-center w-full h-32 border-2 border-dashed border-light-300 dark:border-dark-400 rounded-lg cursor-pointer hover:border-brand transition-colors"
                  >
                    <div className="text-center">
                      <svg className="w-8 h-8 text-light-600 dark:text-dark-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-light-base dark:text-dark-base">
                        Нажмите, чтобы загрузить видео
                      </p>
                    </div>
                  </label>
                </div>
                {videoPreview && (
                  <div className="mt-4 relative aspect-video rounded-lg overflow-hidden">
                    {videoPreview.startsWith('blob:') ? (
                      <video
                        src={videoPreview}
                        controls
                        preload="metadata"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Video preview error:', e);
                        }}
                      />
                    ) : (
                      <video
                        src={(initialValues?.video?.[0] as any)?.video_url || (initialValues?.video?.[0] as any)?.url || videoPreview}
                        controls
                        preload="metadata"
                        className="w-full h-full object-cover"
                        poster={(initialValues?.video?.[0] as any)?.poster_url || (initialValues?.video?.[0] as any)?.thumbnail_url || videoPreview}
                        onError={(e) => {
                          console.error('Video preview error:', e);
                          const posterUrl = (initialValues?.video?.[0] as any)?.poster_url || (initialValues?.video?.[0] as any)?.thumbnail_url;
                          if (posterUrl && videoPreview !== posterUrl) {
                            setVideoPreview(posterUrl);
                          }
                        }}
                      />
                    )}
                    {initialValues?.video && Array.isArray(initialValues.video) && initialValues.video.length > 0 && !videoPreview.startsWith('blob:') && (
                      <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                        Видео загружено
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-5 flex items-center">
                <input
                  type="checkbox"
                  id="video_as_cover"
                  {...register('video_as_cover', {
                    setValueAs: (value) => {
                      if (typeof value === 'boolean') {
                        return value;
                      }
                      if (value && typeof value === 'object' && 'target' in value) {
                        return value.target.checked;
                      }
                      return Boolean(value);
                    },
                  })}
                  className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                />
                <Label
                  htmlFor="video_as_cover"
                  className="ml-2 text-sm font-normal text-body-dark cursor-pointer"
                >
                  {t('form:video-as-cover-label')}
                </Label>
              </div>
            </Card>
          </div>
          )}

          <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
            <Description
              title={t('form:type-and-category')}
              details={t('form:type-and-category-help-text')}
              className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
            />

            <Card className="w-full sm:w-8/12 md:w-2/3">
              <ProductGroupInput
                control={control}
                error={t((errors?.type as any)?.message)}
              />
              <ProductCategoryInput 
                control={control}
              />
              {/* <ProductAuthorInput control={control} /> */}
              {/* <ProductManufacturerInput control={control} setValue={setValue} /> */}
              <ProductTagInput control={control} setValue={setValue} />
            </Card>
          </div>

          <ProductAttributesForm control={control} initialValues={initialValues} />

          <ProductDimensionsForm control={control} initialValues={initialValues} />

          <div className="my-5 flex flex-wrap sm:my-8">
            <Description
              title={t('form:item-description')}
              details={`${
                initialValues
                  ? t('form:item-description-edit')
                  : t('form:item-description-add')
              } ${t('form:product-description-help-text')}`}
              className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
            />

            <Card className="w-full sm:w-8/12 md:w-2/3">
              <Input
                label="Название товара*"
                {...register('name')}
                error={t(errors.name?.message!)}
                variant="outline"
                className="mb-5"
              />

              {isSlugEditable ? (
                <div className="relative mb-5">
                  <Input
                    label="URL адрес"
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
                  label="URL адрес"
                  {...register('slug')}
                  value={slugAutoSuggest}
                  variant="outline"
                  className="mb-5"
                  disabled
                />
              )}
              <div className="relative">
                {options?.useAi && (
                  <OpenAIButton
                    title="Generate Description With AI"
                    onClick={handleGenerateDescription}
                  />
                )}
                <Controller
                  control={control}
                  name="description"
                  render={({ field: { onChange, value } }) => (
                    <RichTextEditor
                      label={t('form:input-label-description')}
                      name="description"
                      value={value || ''}
                      onChange={onChange}
                      error={t(errors.description?.message!)}
                      variant="outline"
                      className="mb-5"
                    />
                  )}
                />
              </div>

              <div>
                <Label>{t('form:input-label-status')}</Label>
                {!isEmpty(statusList)
                  ? statusList?.map((status: any, index: number) => (
                      <Radio
                        key={index}
                        {...register('status')}
                        label={t(status?.label)}
                        id={status?.id}
                        value={status?.value}
                        className="mb-2"
                        disabled={
                          // Блокируем изменение статуса только для продавцов и только если товар уже опубликован/одобрен
                          !permission && 
                          initialValues && 
                          (
                            initialValues?.status === ProductStatus?.Approved ||
                            initialValues?.status === ProductStatus?.Publish ||
                            initialValues?.status === ProductStatus?.UnPublish
                          )
                        }
                      />
                    ))
                  : ''}
                {errors.status?.message && (
                  <p className="my-2 text-xs text-red-500">
                    {t(errors?.status?.message!)}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Выбор типа товара */}
          <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
            <Description
              title={t('form:form-title-product-type')}
              details={t('form:form-description-product-type')}
              className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pr-4 md:w-1/3 md:pr-5"
            />
            <ProductTypeInput />
          </div>

          {/* Simple Type */}
          {(product_type?.value === ProductType.Simple || (!product_type && !initialProductType)) && (
            <ProductSimpleForm initialValues={initialValues} />
          )}

          {/* Variation Type */}
          {product_type?.value === ProductType.Variable && (
            <ProductVariableForm
              shopId={shopId}
              initialValues={initialValues}
              settings={options}
            />
          )}

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
            <Button loading={updating || creating}>
              {initialValues
                ? t('form:button-label-update-product')
                : t('form:button-label-add-product')}
            </Button>
          </div>
        </form>
      </FormProvider>
    </>
  );
}
