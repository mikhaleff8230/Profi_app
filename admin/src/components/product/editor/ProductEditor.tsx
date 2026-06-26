import { useEffect } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductEditorSchema, ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useProductEditorStore } from '@/store/useProductEditorStore';
import { Product } from '@/types';
import StepGeneral from './steps/StepGeneral';
import StepMedia from './steps/StepMedia';
import StepAttributes from './steps/StepAttributes';
// Убрали импорт StepVariations - вариации создаются через список товаров
import StepPricing from './steps/StepPricing';
import StepCourse from './steps/StepCourse';
import StepPreview from './steps/StepPreview';
import EditorNavigation from './EditorNavigation';
import EditorActions from './EditorActions';
import { useRouter } from 'next/router';
import { useCreateProductMutation, useUpdateProductMutation, useProductQuery } from '@/data/product';
import { useShopQuery } from '@/data/shop';
import { toast } from 'react-toastify';
import { useTranslation } from 'next-i18next';
import { formatSlug } from '@/utils/use-slug';
import { manufacturerClient } from '@/data/client/manufacturer';
import { productClient } from '@/data/client/product';
import { Config } from '@/config';

type ProductEditorProps = {
  initialProduct?: Product | null;
  productId?: string;
};

const STEPS = [
  { id: 'general', label: 'Основная информация', component: StepGeneral },
  { id: 'media', label: 'Медиа', component: StepMedia },
  { id: 'attributes', label: 'Характеристики', component: StepAttributes },
  // Убрали шаг вариаций - вариации создаются через список товаров
  { id: 'pricing', label: 'Цена и наличие', component: StepPricing },
  { id: 'course', label: 'Курс и подписка', component: StepCourse },
  { id: 'preview', label: 'Предпросмотр', component: StepPreview },
];

export default function ProductEditor({ initialProduct, productId }: ProductEditorProps) {
  const { t } = useTranslation();
  const router = useRouter();
  
  // Проверка, что router готов
  if (!router.isReady) {
    return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;
  }

  // --- ОГРАНИЧЕНИЕ ПО КОЛИЧЕСТВУ ТОВАРОВ ---
  // (логика ограничения и проверки PRO будет встроена ниже)

  
  // Загрузка данных магазина для получения shop_id
  const { data: shopData, isLoading: loadingShop } = useShopQuery(
    { slug: router.query.shop as string },
    {
      enabled: !!router.query.shop,
    }
  );
  const shopId = shopData?.id;
  
  const {
    currentStep,
    setCurrentStep,
    product,
    setProduct,
    updateProduct,
    reset,
    setIsLoading,
    clearErrors,
    setError,
    errors,
  } = useProductEditorStore();

  const { mutate: createProduct, isLoading: creating } = useCreateProductMutation();
  const { mutate: updateProductMutation, isLoading: updating } = useUpdateProductMutation();

  // Сохраняем 12-значный код из slug_numeric_code или из slug (неизменяемый, извлекается при загрузке)
  const [slugNumericCode, setSlugNumericCode] = React.useState<string | null>(
    (initialProduct as any)?.slug_numeric_code || null
  );

  // Функция для извлечения кода из slug (любой формат)
  const extractSlugCode = (slug: string): { baseSlug: string; code: string | null } => {
    if (!slug) return { baseSlug: '', code: null };
    
    // Ищем последний сегмент, который является числом (код)
    // Формат: {slug}-{код} или {slug}-{код}-{дополнительный код}
    // Извлекаем последний числовой сегмент как код
    const match = slug.match(/^(.+)-(\d+)$/);
    if (match) {
      return {
        baseSlug: match[1], // Базовая часть без кода
        code: match[2], // Код (любой длины)
      };
    }
    
    // Если формат не распознан, возвращаем slug как есть
    return { baseSlug: slug, code: null };
  };

  // Извлекаем код из slug или используем slug_numeric_code из API
  const initialSlugData = initialProduct?.slug 
    ? extractSlugCode(initialProduct.slug)
    : { baseSlug: '', code: null };
  
  // Если код не найден в slug, но есть в slug_numeric_code (новое поле)
  if (!initialSlugData.code && (initialProduct as any)?.slug_numeric_code) {
    initialSlugData.code = (initialProduct as any).slug_numeric_code;
    initialSlugData.baseSlug = initialProduct?.slug || '';
  }
  
  // Сохраняем код для использования при сохранении
  // Приоритет: slug_numeric_code из API > код из slug
  React.useEffect(() => {
    if ((initialProduct as any)?.slug_numeric_code) {
      // Используем slug_numeric_code из API (приоритет)
      setSlugNumericCode((initialProduct as any).slug_numeric_code);
    } else if (initialSlugData.code) {
      // Fallback: извлекаем код из slug
      setSlugNumericCode(initialSlugData.code);
    }
  }, [initialProduct]);

  // Инициализация формы с безопасными значениями по умолчанию
  const defaultValues: Partial<ProductEditorFormData> = {
    name: initialProduct?.name || '',
    slug: initialSlugData.baseSlug, // Показываем только базовую часть без кода
    description: initialProduct?.description || '',
    type_id: initialProduct?.type 
      ? { id: initialProduct.type.id, name: initialProduct.type.name }
      : ((initialProduct as any)?.type_id ? (initialProduct as any).type_id : undefined),
    category_ids: Array.isArray(initialProduct?.categories) 
      ? initialProduct.categories.map((c) => Number(c.id)).filter(Boolean) 
      : [],
    price: initialProduct?.price ?? 0,
    sale_price: initialProduct?.sale_price ?? null,
    quantity: initialProduct?.quantity ?? 0,
    sku: initialProduct?.sku || '',
    preview_url: (initialProduct as any)?.preview_url || '',
    is_external: Boolean((initialProduct as any)?.is_external),
    external_product_url: (initialProduct as any)?.external_product_url || '',
    digital_product_type:
      ((initialProduct as any)?.digital_product_type as string) || 'file',
    prompt_text: (initialProduct as any)?.prompt_text || '',
    external_url: (initialProduct as any)?.external_url || '',
    digital_license_keys: (initialProduct as any)?.digital_license_keys || '',
    digital_account_json: JSON.stringify(
      (initialProduct as any)?.account_data || { login: '', password: '' },
      null,
      2
    ),
    subscription_days:
      (initialProduct as any)?.subscription_days != null &&
      (initialProduct as any)?.subscription_days !== ''
        ? Number((initialProduct as any).subscription_days)
        : undefined,
    billing_access_type:
      (((initialProduct as any)?.billing_access_type as string) || 'subscription') as
        | 'subscription'
        | 'one_time'
        | 'lifetime',
    duration_days:
      (initialProduct as any)?.duration_days != null && (initialProduct as any)?.duration_days !== ''
        ? Number((initialProduct as any).duration_days)
        : undefined,
    course: (() => {
      const c = (initialProduct as any)?.course;
      if (!c || typeof c !== 'object') {
        return {
          title: initialProduct?.name || '',
          description: (initialProduct as any)?.description || '',
          lessons: [] as Array<Record<string, unknown>>,
        };
      }
      const lessonsRaw = Array.isArray(c.lessons) ? c.lessons : [];
      return {
        title: typeof c.title === 'string' ? c.title : initialProduct?.name || '',
        description: typeof c.description === 'string' ? c.description : '',
        lessons: lessonsRaw.map((L: any, idx: number) => ({
          id: L.id != null ? L.id : undefined,
          title: L.title != null ? String(L.title) : '',
          content_type: L.content_type != null ? String(L.content_type) : 'video',
          content_url: L.content_url != null ? String(L.content_url) : '',
          content_body: L.content_body != null ? String(L.content_body) : '',
          position: L.position != null ? Number(L.position) : idx,
          drip_days: L.drip_days != null ? Number(L.drip_days) : 0,
        })),
      };
    })(),
    digital_file_input: (() => {
      const digitalFile = (initialProduct as any)?.digital_file;
      if (!digitalFile) return undefined;
      return {
        id: digitalFile?.attachment_id,
        thumbnail: '',
        original: digitalFile?.url,
        url: digitalFile?.url,
      };
    })(),
    weight: initialProduct?.weight,
    width: initialProduct?.width ? parseFloat(String(initialProduct.width)) : undefined,
    height: initialProduct?.height ? parseFloat(String(initialProduct.height)) : undefined,
    length: initialProduct?.length ? parseFloat(String(initialProduct.length)) : undefined,
    address: (() => {
      const p = initialProduct as any;
      return typeof p?.address === 'string' ? p.address : '';
    })(),
    lat: (() => {
      const p = initialProduct as any;
      const gp = p?.geo_point ?? p?.geoPoint;
      return gp?.lat != null ? Number(gp.lat) : undefined;
    })(),
    lng: (() => {
      const p = initialProduct as any;
      const gp = p?.geo_point ?? p?.geoPoint;
      return gp?.lng != null ? Number(gp.lng) : undefined;
    })(),
    region_id: (() => {
      const p = initialProduct as any;
      return p?.region_id != null && p?.region_id !== ''
        ? Number(p.region_id)
        : undefined;
    })(),
    status: (initialProduct?.status as any) || 'draft',
    group_key: (initialProduct as any)?.group_key,
    is_group_product: !!(initialProduct as any)?.group_key,
    group_variants: Array.isArray((initialProduct as any)?.group_variants) 
      ? (initialProduct as any).group_variants 
      : [],
    brand: initialProduct?.manufacturer?.name || (initialProduct as any)?.brand || '',
    tags: Array.isArray((initialProduct as any)?.tags) ? (initialProduct as any).tags : [],
    // variations: Array.isArray((initialProduct as any)?.variations) ? (initialProduct as any).variations : [], // Убрали - больше не используется
    videos: Array.isArray((initialProduct as any)?.videos) 
      ? (initialProduct as any).videos 
      : [],
    image: initialProduct?.image ? {
      id: Number(initialProduct.image.id) || undefined,
      url: initialProduct.image.thumbnail || initialProduct.image.original || '',
      thumbnail: initialProduct.image.thumbnail || '',
      original: initialProduct.image.original || '',
    } : undefined,
    gallery: Array.isArray(initialProduct?.gallery) 
      ? initialProduct.gallery.map((img) => ({
          id: Number(img.id) || undefined,
          url: img.thumbnail || img.original || '',
          thumbnail: img.thumbnail || '',
          original: img.original || '',
        })).filter(Boolean) 
      : [],
    // Инициализация атрибутов из товара
    attribute_values: (() => {
      // Пробуем получить атрибуты из разных источников
      if (initialProduct && typeof initialProduct === 'object') {
        // Если есть attribute_values напрямую
        if ((initialProduct as any).attribute_values && typeof (initialProduct as any).attribute_values === 'object' && !Array.isArray((initialProduct as any).attribute_values)) {
          return (initialProduct as any).attribute_values;
        }
        // Если есть attributes как массив с pivot
        if (Array.isArray((initialProduct as any).attributes)) {
          const attrs: Record<number, string> = {};
          (initialProduct as any).attributes.forEach((attr: any) => {
            if (attr && attr.id && attr.pivot?.value) {
              attrs[Number(attr.id)] = String(attr.pivot.value);
            }
          });
          if (Object.keys(attrs).length > 0) {
            return attrs;
          }
        }
      }
      return undefined;
    })(),
  };

  const methods = useForm<ProductEditorFormData>({
    resolver: zodResolver(ProductEditorSchema),
    mode: 'onBlur',
    shouldFocusError: false,
    defaultValues: {
      ...defaultValues,
      // Убеждаемся, что все массивы инициализированы
      category_ids: Array.isArray(defaultValues.category_ids) ? defaultValues.category_ids : [],
      gallery: Array.isArray(defaultValues.gallery) ? defaultValues.gallery : [],
      tags: Array.isArray(defaultValues.tags) ? defaultValues.tags : [],
      group_variants: Array.isArray(defaultValues.group_variants) ? defaultValues.group_variants : [],
      // variations: Array.isArray(defaultValues.variations) ? defaultValues.variations : [], // Убрали - больше не используется
      videos: Array.isArray(defaultValues.videos) ? defaultValues.videos : [],
      attributes: Array.isArray(defaultValues.attributes) ? defaultValues.attributes : [],
      grouping_attributes: Array.isArray((defaultValues as any).grouping_attributes) ? (defaultValues as any).grouping_attributes : [],
      // Инициализируем attribute_values если они есть
      attribute_values: defaultValues.attribute_values && typeof defaultValues.attribute_values === 'object' && !Array.isArray(defaultValues.attribute_values)
        ? defaultValues.attribute_values
        : undefined,
      is_external: Boolean(defaultValues.is_external),
      external_product_url: defaultValues.external_product_url || '',
      digital_file_input: defaultValues.digital_file_input,
      digital_product_type: defaultValues.digital_product_type || 'file',
      prompt_text: defaultValues.prompt_text || '',
      external_url: defaultValues.external_url || '',
      digital_license_keys: defaultValues.digital_license_keys || '',
      digital_account_json: defaultValues.digital_account_json || '{"login":"","password":""}',
      subscription_days: defaultValues.subscription_days,
      billing_access_type: defaultValues.billing_access_type ?? 'subscription',
      duration_days: defaultValues.duration_days,
      course: defaultValues.course ?? {
        title: '',
        description: '',
        lessons: [],
      },
    },
  });

  const shopGeoPrefilledRef = React.useRef(false);

  React.useEffect(() => {
    if (!shopData || shopGeoPrefilledRef.current) return;
    const p = initialProduct as any;
    const gp = p?.geo_point ?? p?.geoPoint;
    const hasProductGeoOrAddr =
      (typeof p?.address === 'string' && p.address.trim().length > 0) ||
      (gp != null && gp.lat != null && gp.lng != null);
    if (hasProductGeoOrAddr) {
      shopGeoPrefilledRef.current = true;
      return;
    }
    const loc = shopData.settings?.location;
    const a = shopData.address;
    const line =
      loc?.formattedAddress ||
      [a?.street_address, a?.city, a?.state, a?.zip, a?.country].filter(Boolean).join(', ');
    if (line) {
      methods.setValue('address', line);
    }
    if (loc?.lat != null && loc?.lng != null) {
      methods.setValue('lat', Number(loc.lat));
      methods.setValue('lng', Number(loc.lng));
    }
    shopGeoPrefilledRef.current = true;
  }, [shopData, initialProduct, methods]);

  // Синхронизация с store и сохранение кода slug
  useEffect(() => {
    if (initialProduct) {
      setProduct(initialProduct);
      
      // Извлекаем код из slug при загрузке
      if (initialProduct.slug) {
        const slugData = extractSlugCode(initialProduct.slug);
        setSlugNumericCode(slugData.code);
      } else {
        setSlugNumericCode(null);
      }
      
      // УПРОЩЕННАЯ ЛОГИКА: Загружаем все варианты группы при редактировании любого товара группы
      const groupKey = (initialProduct as any)?.group_key;
      if (groupKey) {
        productClient.getVariants({ group_key: groupKey })
            .then((response: any) => {
              if (response?.success && response?.data && Array.isArray(response.data)) {
              // Сортируем по ID (первый созданный = главный)
              const sortedProducts = response.data.sort((a: any, b: any) => Number(a.id) - Number(b.id));
              
              const loadedVariants = sortedProducts.map((product: any) => ({
                id: String(product.id),
                name: product.name || initialProduct.name,
                slug: product.slug || '',
                attributes: product.attribute_values || product.attributes || {},
                price: product.price || 0,
                sale_price: product.sale_price || null,
                quantity: product.quantity || 0,
                sku: product.sku || '',
                internal_article: product.internal_article || '',
                gallery: product.gallery || [],
                image: product.image || null,
              }));
              
              // Обновляем форму с загруженными вариантами
              methods.setValue('group_variants', loadedVariants);
              methods.setValue('is_group_product', true);
              
              console.log('ProductEditor - Loaded group variants:', {
                groupKey,
                variantsCount: loadedVariants.length,
                firstVariantId: loadedVariants[0]?.id, // Первый = главный
                variants: loadedVariants,
              });
            }
          })
          .catch((error) => {
            console.error('Error loading group variants:', error);
          });
      }
    }
  }, [initialProduct, setProduct, router.locale, methods]);

  // Обработка сохранения
  const handleSave = async (data: ProductEditorFormData, publish: boolean = false) => {
    setIsLoading(true);
    clearErrors();

    try {
      // Нормализуем массивы сразу
      const categoryIdsArray = Array.isArray(data.category_ids) ? data.category_ids : [];
      let galleryArray = Array.isArray(data.gallery) ? data.gallery : [];
      const tagsArray = Array.isArray(data.tags) ? data.tags : [];
      const groupVariantsArray = Array.isArray(data.group_variants) ? data.group_variants : [];
      // Убрали variations - больше не используется
      // const variationsArray = Array.isArray(data.variations) ? data.variations : [];
      const videosArray = Array.isArray(data.videos) ? data.videos : [];
      
      // Фильтруем галерею, исключая главное фото (если оно там есть)
      if (data.image && galleryArray.length > 0) {
        const imageId = data.image.id || data.image.thumbnail || data.image.url;
        if (imageId) {
          galleryArray = galleryArray.filter((img: any) => {
            if (!img) return true;
            const imgId = img.id || img.thumbnail || img.url;
            return imgId !== imageId;
          });
        }
      }
      
      // Преобразуем category_ids в формат API
      const categoryId = categoryIdsArray.length > 0 ? categoryIdsArray[0] : undefined;
      const categories = categoryIdsArray.length > 0 ? categoryIdsArray.map((id: number) => String(id)) : [];
      
      const normalizedData = {
        ...data,
        category_ids: categoryIdsArray,
        gallery: galleryArray,
        tags: tagsArray,
        group_variants: groupVariantsArray,
        // variations: variationsArray, // Убрали - больше не используется
        videos: videosArray,
        is_external: Boolean((data as any).is_external),
        external_product_url: (data as any).external_product_url || '',
        digital_file_input: (data as any).digital_file_input,
        digital_product_type: (data as any).digital_product_type || 'file',
        prompt_text: (data as any).prompt_text,
        external_url: (data as any).external_url,
        digital_license_keys: (data as any).digital_license_keys,
        digital_account_json: (data as any).digital_account_json,
        subscription_days: (data as any).subscription_days,
        billing_access_type: (data as any).billing_access_type,
        duration_days: (data as any).duration_days,
        course: (data as any).course,
        attribute_values: data.attribute_values && typeof data.attribute_values === 'object' && !Array.isArray(data.attribute_values)
          ? data.attribute_values
          : undefined,
      };
      const resolvedDigitalFileUrl =
        normalizedData.digital_file_input?.original ||
        normalizedData.digital_file_input?.url ||
        normalizedData.digital_file_input?.thumbnail ||
        (initialProduct as any)?.digital_file?.url ||
        undefined;
      
      // При сохранении в черновик разрешаем сохранение всегда
      // При публикации проверяем обязательные поля
      const validationErrors: string[] = [];
      
      if (publish) {
        // Валидация только при публикации
        if (!normalizedData.name || !normalizedData.name.trim()) {
          validationErrors.push('Название товара');
        }
        if (categoryIdsArray.length === 0) {
          validationErrors.push('Категория');
        }
        if (normalizedData.price === undefined || normalizedData.price === null || isNaN(Number(normalizedData.price))) {
          validationErrors.push('Цена');
        }
        if (normalizedData.quantity === undefined || normalizedData.quantity === null || normalizedData.quantity < 0) {
          validationErrors.push('Количество');
        }

        const dType = String(normalizedData.digital_product_type || 'file');

        if (dType === 'file') {
          if (normalizedData.is_external) {
            if (!normalizedData.external_product_url || !String(normalizedData.external_product_url).trim()) {
              validationErrors.push('Внешний URL цифрового товара');
            }
          } else if (!normalizedData.digital_file_input?.id) {
            validationErrors.push('Архив цифрового товара');
          }
        } else if (dType === 'prompt') {
          if (!String((data as any).prompt_text || '').trim()) {
            validationErrors.push('Текст промпта');
          }
        } else if (dType === 'link') {
          if (!String((data as any).external_url || '').trim()) {
            validationErrors.push('URL для доступа по ссылке (external_url)');
          }
        } else if (dType === 'account') {
          try {
            const raw = String((data as any).digital_account_json || '').trim();
            if (!raw) {
              validationErrors.push('Данные аккаунта (JSON)');
            } else {
              JSON.parse(raw);
            }
          } catch {
            validationErrors.push('Данные аккаунта (некорректный JSON)');
          }
        } else if (dType === 'key') {
          if (!String((data as any).digital_license_keys || '').trim()) {
            validationErrors.push('Укажите ключи (по одному в строке)');
          }
        } else if (dType === 'subscription') {
          const sd = (data as any).subscription_days;
          const dd = (data as any).duration_days;
          const hasPeriod =
            (dd != null && dd !== '' && Number(dd) >= 1) ||
            (sd != null && sd !== '' && Number(sd) >= 1);
          if (!hasPeriod) {
            validationErrors.push(
              'Срок доступа: укажите «Период доступа, дней» на шаге курса или «Срок подписки» на шаге цены (минимум 1 день)'
            );
          }
          const rawLessons = (data as any).course?.lessons;
          const lessonsList = Array.isArray(rawLessons) ? rawLessons : [];
          const validLessons = lessonsList.filter(
            (L: any) => L && String(L.title || '').trim().length > 0
          );
          if (validLessons.length < 1) {
            validationErrors.push('Добавьте хотя бы один урок курса с названием');
          }
        }
        
        // Если есть ошибки валидации, не сохраняем
        if (validationErrors.length > 0) {
          const errorMessage = `Для публикации необходимо заполнить обязательные поля: ${validationErrors.join(', ')}`;
          toast.error(errorMessage);
          setIsLoading(false);
          // Сохраняем ошибки для отображения в EditorActions
          setError('validation', validationErrors.join(', '));
          return;
        }
      }
      
      // Для нового товара минимальная проверка (только для черновика)
      if (!productId && !publish) {
        if (!normalizedData.name || !normalizedData.name.trim()) {
          // Для черновика просто используем заглушку
          normalizedData.name = 'Новый товар';
        }
      }
      
      // Получаем type_id из формы, существующего товара или используем первый доступный тип
      let typeId: string | undefined;
      
      // Сначала пытаемся получить из формы (если пользователь выбрал)
      if (normalizedData.type_id) {
        if (typeof normalizedData.type_id === 'object' && normalizedData.type_id !== null && 'id' in normalizedData.type_id) {
          typeId = String(normalizedData.type_id.id);
        } else if (typeof normalizedData.type_id === 'string' || typeof normalizedData.type_id === 'number') {
          typeId = String(normalizedData.type_id);
        }
      }
      
      // Если не нашли в форме, берем из существующего товара
      if (!typeId && initialProduct?.type?.id) {
        typeId = String(initialProduct.type.id);
      }
      
      // Если все еще нет, берем из initialProduct.type_id
      if (!typeId && (initialProduct as any)?.type_id) {
        typeId = String((initialProduct as any).type_id);
      }
      
      // Если type_id не указан, выдаем ошибку только при публикации
      if (!typeId) {
        if (publish) {
          validationErrors.push('Тип товара');
          toast.error('Для публикации необходимо выбрать тип товара');
          setIsLoading(false);
          setError('validation', validationErrors.join(', '));
          return;
        } else {
          // Для черновика используем первый доступный тип или пропускаем
          toast.warning('Тип товара не выбран. Товар будет сохранен в черновик.');
        }
      }
      
      // Проверяем shop_id
      if (!shopId) {
        toast.error('Магазин не найден. Дождитесь загрузки данных магазина.');
        setIsLoading(false);
        return;
      }
      
      // Обработка бренда (brand) -> manufacturer_id
      let manufacturerId: string | undefined;
      if (normalizedData.brand && normalizedData.brand.trim()) {
        try {
          // Ищем существующий manufacturer по имени
          const manufacturersResponse = await manufacturerClient.paginated({
            name: normalizedData.brand.trim(),
            language: router.locale || 'ru',
            limit: 1,
          });
          
          if (manufacturersResponse?.data && manufacturersResponse.data.length > 0) {
            // Найден существующий manufacturer
            manufacturerId = String(manufacturersResponse.data[0].id);
          } else {
            // Создаем новый manufacturer
            const newManufacturer = await manufacturerClient.create({
              name: normalizedData.brand.trim(),
              type_id: typeId, // Используем type_id товара
              language: router.locale || 'ru',
              shop_id: String(shopId),
            });
            manufacturerId = String(newManufacturer.id);
          }
        } catch (error: any) {
          console.error('Ошибка при обработке бренда:', error);
          toast.error('Ошибка при сохранении бренда: ' + (error?.message || 'Неизвестная ошибка'));
          setIsLoading(false);
          return;
        }
      }
      
      // Все товары теперь simple (убрали вариативный товар)
      const productType = 'simple';
      
      // Обработка slug с сохранением кода
      // ВАЖНО: Отправляем только базовый slug БЕЗ кода
      // Код хранится отдельно в slug_numeric_code и генерируется/сохраняется на бэкенде
      let finalSlug = normalizedData.slug || '';
      
      if (!finalSlug) {
        // Если slug нет, генерируем из названия (только для новых товаров)
        if (!productId && normalizedData.name) {
          finalSlug = formatSlug(normalizedData.name);
        }
      } else {
        // Убираем код из slug пользователя (если он там есть)
        // Отправляем только базовую часть slug
        const userSlugData = extractSlugCode(finalSlug);
        finalSlug = userSlugData.baseSlug;
      }
      
      // ВАЖНО: Логика статуса
      // 1. Если publish = true (кнопка "Опубликовать") - всегда 'publish'
      // 2. Если publish = false (кнопка "Сохранить"):
      //    - Если товар уже опубликован - сохраняем 'publish' (не сбрасываем статус)
      //    - Если товар в черновике - сохраняем 'draft'
      let finalStatus: string;
      if (publish) {
        finalStatus = 'publish';
      } else {
        // При сохранении сохраняем текущий статус товара (если он опубликован) или 'draft'
        finalStatus = (initialProduct?.status === 'publish') ? 'publish' : (data.status || 'draft');
      }
      
      let accountDataFromForm: Record<string, unknown> | null = null;
      try {
        const rawAcc = String((data as any).digital_account_json || '').trim();
        if (rawAcc) {
          accountDataFromForm = JSON.parse(rawAcc) as Record<string, unknown>;
        }
      } catch {
        accountDataFromForm = null;
      }

      // Формируем данные для отправки на API согласно интерфейсу CreateProduct
      const submitData: any = {
        // ОБЯЗАТЕЛЬНЫЕ поля для CreateProduct
        name: normalizedData.name || '',
        slug: finalSlug, // Только базовая часть, БЕЗ кода
        type_id: typeId,
        price: normalizedData.price ?? 0,
        unit: 'шт.', // Обязательное поле для CreateProduct
        
        // Опциональные поля
        description: normalizedData.description || '',
        sale_price: normalizedData.sale_price ?? null,
        quantity: normalizedData.quantity ?? 0,
        sku: normalizedData.sku || '',
        preview_url: normalizedData.preview_url || '',
        is_digital: true,
        digital_product_type: normalizedData.digital_product_type || 'file',
        prompt_text: (data as any).prompt_text || null,
        external_url: (data as any).external_url || null,
        subscription_days:
          (data as any).subscription_days != null && (data as any).subscription_days !== ''
            ? Number((data as any).subscription_days)
            : null,
        billing_access_type: (data as any).billing_access_type || null,
        duration_days:
          (data as any).duration_days != null && (data as any).duration_days !== ''
            ? Number((data as any).duration_days)
            : null,
        digital_license_keys: (data as any).digital_license_keys ?? '',
        ...(normalizedData.digital_product_type === 'account' && accountDataFromForm
          ? { account_data: accountDataFromForm }
          : {}),
        is_external: Boolean(normalizedData.is_external),
        external_product_url: normalizedData.is_external
          ? (normalizedData.external_product_url || '')
          : undefined,
        status: finalStatus,
        shop_id: shopId ? String(shopId) : undefined,
        language: router.locale || 'ru',
        product_type: productType,
        ...(!normalizedData.is_external && normalizedData.digital_file_input?.id
          ? {
              digital_file: {
                attachment_id: normalizedData.digital_file_input.id,
                ...(resolvedDigitalFileUrl ? { url: resolvedDigitalFileUrl } : {}),
                ...(productId && {
                  id: (initialProduct as any)?.digital_file?.id,
                }),
              },
            }
          : {}),
        // Категории: передаем category_id или categories в зависимости от API
        ...(categoryId ? { category_id: String(categoryId) } : {}),
        ...(Array.isArray(categories) && categories.length > 0 ? { categories } : {}),
        // Изображения
        ...(normalizedData.image ? { image: normalizedData.image } : {}),
        ...(Array.isArray(galleryArray) && galleryArray.length > 0 ? { gallery: galleryArray } : {}),
        // Теги: для существующих тегов передаем id, для новых - объект с name
        ...(Array.isArray(tagsArray) && tagsArray.length > 0 ? {
          tags: tagsArray.map((tag: any) => {
            // Если у тега есть id - это существующий тег, передаем только id
            if (tag?.id) {
              return tag.id;
            }
            // Если у тега нет id, но есть name - это новый тег, передаем объект с name
            if (tag?.name) {
              return { name: tag.name };
            }
            // Если это уже строка или число - передаем как есть (для обратной совместимости)
            return tag;
          }).filter((tag: any) => tag !== null && tag !== undefined)
        } : {}),
        // Атрибуты - всегда передаем, даже если пустые (для очистки при обновлении)
        attribute_values: normalizedData.attribute_values && typeof normalizedData.attribute_values === 'object' && !Array.isArray(normalizedData.attribute_values)
          ? Object.entries(normalizedData.attribute_values).reduce((acc: any, [key, value]) => {
              // Фильтруем только непустые значения
              if (value !== null && value !== undefined && value !== '') {
                // Преобразуем ключ в число, если это ID атрибута
                const attrId = isNaN(Number(key)) ? key : Number(key);
                // Преобразуем значение в строку
                const attrValue = Array.isArray(value) 
                  ? value.filter(v => v !== null && v !== undefined && v !== '').join(',')
                  : String(value);
                if (attrValue.trim() !== '') {
                  acc[attrId] = attrValue;
                }
              }
              return acc;
            }, {})
          : {},
        // Групповые товары
        ...(normalizedData.group_key ? { group_key: normalizedData.group_key } : {}),
        // Видео
        ...(Array.isArray(videosArray) && videosArray.length > 0 ? { videos: videosArray } : {}),
        // Производитель (manufacturer_id)
        ...(manufacturerId ? { manufacturer_id: manufacturerId } : {}),
        // ВАЖНО: Отправляем slug_numeric_code отдельно (только для существующих товаров)
        // Бэкенд использует его для сохранения кода при обновлении
        ...(productId && slugNumericCode ? { slug_numeric_code: slugNumericCode } : {}),
        ...(normalizedData.digital_product_type === 'subscription'
          ? {
              course: (() => {
                const cr = (data as any).course;
                if (!cr || typeof cr !== 'object') {
                  return {
                    title: String(normalizedData.name || ''),
                    description: '',
                    lessons: [],
                  };
                }
                const rawLessons = Array.isArray(cr.lessons) ? cr.lessons : [];
                const lessons = rawLessons.map((L: any, idx: number) => {
                  const idNum =
                    L.id != null && L.id !== '' && !Number.isNaN(Number(L.id))
                      ? Number(L.id)
                      : undefined;
                  return {
                    ...(idNum ? { id: idNum } : {}),
                    title: String(L.title || '').trim() || `Урок ${idx + 1}`,
                    content_type: (L.content_type && String(L.content_type)) || 'video',
                    content_url: L.content_url ? String(L.content_url) : null,
                    content_body: L.content_body ? String(L.content_body) : null,
                    position: L.position != null ? Number(L.position) : idx,
                    drip_days: L.drip_days != null ? Math.max(0, Number(L.drip_days)) : 0,
                  };
                });
                return {
                  title: String(cr.title || '').trim() || String(normalizedData.name || ''),
                  description: cr.description != null ? String(cr.description) : '',
                  lessons,
                };
              })(),
            }
          : {}),
      };
      
      // Дополнительная валидация перед отправкой (только при публикации)
      // Эта проверка уже выполнена выше, но оставляем для безопасности
      if (publish && validationErrors.length > 0) {
        const errorMessage = `Для публикации необходимо заполнить обязательные поля: ${validationErrors.join(', ')}`;
        toast.error(errorMessage);
        setIsLoading(false);
        setError('validation', validationErrors.join(', '));
        return;
      }
      
      // Валидация атрибутов - убеждаемся, что все значения корректны
      if (submitData.attribute_values && typeof submitData.attribute_values === 'object') {
        try {
          // Проверяем, что все ключи и значения валидны
          Object.entries(submitData.attribute_values).forEach(([key, value]) => {
            if (key === null || key === undefined || key === '') {
              throw new Error(`Невалидный ключ атрибута: ${key}`);
            }
            if (value === null || value === undefined) {
              throw new Error(`Невалидное значение атрибута для ключа ${key}`);
            }
          });
        } catch (validationError: any) {
          toast.error(`Ошибка валидации атрибутов: ${validationError.message}`);
          setIsLoading(false);
          return;
        }
      }
      
      console.log('ProductEditor - Saving product:', {
        productId,
        publish,
        submitDataKeys: Object.keys(submitData),
        typeId,
        productType,
        categoryId,
        categoriesLength: categories?.length,
        galleryLength: galleryArray.length,
        tagsLength: tagsArray.length,
        tagsFormat: submitData.tags,
        attributeValues: normalizedData.attribute_values,
        attributeValuesKeys: normalizedData.attribute_values ? Object.keys(normalizedData.attribute_values) : [],
        submitAttributeValues: submitData.attribute_values,
        hasRequiredFields: !!(submitData.name && submitData.type_id && submitData.price !== undefined && submitData.unit),
        submitData: JSON.stringify(submitData, null, 2),
      });

      // Обработка групповых товаров
      const groupVariants = groupVariantsArray;
      
      console.log('ProductEditor - Group variants check:', {
        is_group_product: normalizedData.is_group_product,
        group_key: normalizedData.group_key,
        groupVariantsCount: groupVariants.length,
        groupVariants: groupVariants.map((v: any) => ({
          name: v.name,
          sku: v.sku,
          price: v.price,
          attributes: v.attributes,
          galleryCount: v.gallery?.length || 0,
        })),
      });
      
      if (normalizedData.is_group_product && normalizedData.group_key && groupVariants.length > 0) {
        // УПРОЩЕННАЯ ЛОГИКА: Все товары в группе равны, нет "главного" товара
        // Сохраняем все варианты группы, включая текущий товар (если редактируем)
        
        // Подготавливаем данные для всех вариантов
        const formDataForVariants = {
          ...normalizedData,
          type_id: typeId,
          category_id: categoryId,
          categories,
          shop_id: shopId,
        };
        
        // Если редактируем существующий товар - обновляем его данные в списке вариантов
        let variantsToSave = [...groupVariants];
        if (productId) {
          // Проверяем, есть ли текущий товар в списке вариантов
          const currentVariantIndex = variantsToSave.findIndex((v: any) => v.id === String(productId));
          if (currentVariantIndex !== -1) {
            // Текущий товар уже в списке - обновляем его данные
            const oldVariant = variantsToSave[currentVariantIndex];
            // Обрабатываем slug для варианта
            let variantSlug = normalizedData.slug || oldVariant.slug || '';
            if (variantSlug) {
              const variantSlugData = extractSlugCode(variantSlug);
              variantSlug = variantSlugData.baseSlug;
              // Добавляем код текущего товара, если он есть
              if (slugNumericCode) {
                variantSlug = `${variantSlug}-${slugNumericCode}`;
              }
            } else if (oldVariant.slug) {
              variantSlug = oldVariant.slug;
            }
            
            variantsToSave[currentVariantIndex] = {
              ...oldVariant,
              name: normalizedData.name || oldVariant.name || '',
              slug: variantSlug,
              price: normalizedData.price ?? oldVariant.price ?? 0,
              sale_price: normalizedData.sale_price ?? oldVariant.sale_price ?? null,
              quantity: normalizedData.quantity ?? oldVariant.quantity ?? 0,
              sku: normalizedData.sku || oldVariant.sku || '',
              attributes: normalizedData.attribute_values || oldVariant.attributes || {},
              gallery: galleryArray.length > 0 ? galleryArray : (oldVariant.gallery || []),
            };
            
            console.log('ProductEditor - Updated variant in group:', {
              productId,
              oldName: oldVariant.name,
              newName: variantsToSave[currentVariantIndex].name,
              oldSlug: oldVariant.slug,
              newSlug: variantsToSave[currentVariantIndex].slug,
            });
          } else {
            // Обрабатываем slug для нового варианта
            let newVariantSlug = normalizedData.slug || '';
            if (newVariantSlug) {
              const newVariantSlugData = extractSlugCode(newVariantSlug);
              newVariantSlug = newVariantSlugData.baseSlug;
              // Добавляем код текущего товара, если он есть
              if (slugNumericCode) {
                newVariantSlug = `${newVariantSlug}-${slugNumericCode}`;
              }
            }
            
            // Текущий товар не в списке - добавляем его как вариант
            variantsToSave.push({
              id: String(productId),
              name: normalizedData.name || initialProduct?.name || '',
              slug: newVariantSlug,
              price: normalizedData.price ?? initialProduct?.price ?? 0,
              sale_price: normalizedData.sale_price ?? initialProduct?.sale_price ?? null,
              quantity: normalizedData.quantity ?? initialProduct?.quantity ?? 0,
              sku: normalizedData.sku || initialProduct?.sku || '',
              attributes: normalizedData.attribute_values || {},
              gallery: galleryArray,
            });
            
            console.log('ProductEditor - Added variant to group:', {
              productId,
              name: variantsToSave[variantsToSave.length - 1].name,
            });
          }
        }
        
        // Сохраняем все варианты группы
        const groupResponse = await handleGroupVariants(normalizedData.group_key!, variantsToSave, formDataForVariants, methods);
        
        // Обновляем slug в форме после сохранения группы
        if (productId && groupResponse?.data) {
          // Ищем текущий товар в ответе
          const updatedProduct = Array.isArray(groupResponse.data) 
            ? groupResponse.data.find((p: any) => String(p.id) === String(productId))
            : null;
          
          if (updatedProduct?.slug) {
            const updatedSlugData = extractSlugCode(updatedProduct.slug);
            // Обновляем код, если он изменился
            if (updatedSlugData.code) {
              setSlugNumericCode(updatedSlugData.code);
            }
            // Обновляем slug в форме (только базовую часть)
            methods.setValue('slug', updatedSlugData.baseSlug);
            
            console.log('ProductEditor - Updated slug after group save:', {
              responseSlug: updatedProduct.slug,
              baseSlug: updatedSlugData.baseSlug,
              code: updatedSlugData.code,
            });
          }
        }
        
        if (productId) {
          toast.success(t('common:text-update-success'));
        } else {
          toast.success(t('common:text-create-success'));
          // Редирект на первый созданный вариант
          // (будет определен после создания в handleGroupVariants)
        }
        setIsLoading(false);
      } else {
        // Обычное сохранение (не групповой товар)
        if (productId) {
          updateProductMutation(
            { id: productId, ...submitData } as any,
            {
              onSuccess: async (response: any) => {
                toast.success(t('common:text-update-success'));
                
                // Обновляем slug в форме из ответа сервера
                if (response?.slug) {
                  const updatedSlugData = extractSlugCode(response.slug);
                  setSlugNumericCode(updatedSlugData.code);
                  methods.setValue('slug', updatedSlugData.baseSlug);
                }

                if (response?.digital_file) {
                  // Не затираем файл после save, если API не вернул url.
                  // Сохраняем текущее значение формы как источник правды.
                  const currentDigitalFileInput: any = methods.getValues('digital_file_input');
                  const mergedDigitalUrl =
                    response.digital_file?.url ||
                    currentDigitalFileInput?.original ||
                    currentDigitalFileInput?.url ||
                    resolvedDigitalFileUrl ||
                    '';
                  methods.setValue('digital_file_input', {
                    ...currentDigitalFileInput,
                    id: response.digital_file?.attachment_id || currentDigitalFileInput?.id,
                    thumbnail: '',
                    original: mergedDigitalUrl,
                    url: mergedDigitalUrl,
                  } as any);
                }
                if (typeof response?.is_external !== 'undefined') {
                  methods.setValue('is_external', Boolean(response.is_external));
                }
                if (typeof response?.external_product_url === 'string') {
                  methods.setValue('external_product_url', response.external_product_url);
                }
                
                setIsLoading(false);
              },
              onError: (error: any) => {
                console.error('ProductEditor - Update error:', error);
                
                // Детальная обработка ошибок
                let errorMessage = t('common:text-update-error');
                
                if (error?.response) {
                  const status = error.response.status;
                  const data = error.response.data;
                  
                  if (status === 500) {
                    errorMessage = 'Ошибка сервера (500). Проверьте данные товара и попробуйте снова.';
                    if (data?.message) {
                      errorMessage += ` Детали: ${data.message}`;
                    }
                  } else if (data?.message) {
                    errorMessage = data.message;
                  } else if (data?.errors && typeof data.errors === 'object') {
                    const firstError = Object.values(data.errors).flat()[0];
                    errorMessage = firstError ? String(firstError) : errorMessage;
                  }
                } else if (error?.message) {
                  errorMessage = error.message;
                }
                
                toast.error(errorMessage, {
                  autoClose: 5000,
                });
                setIsLoading(false);
              },
            }
          );
        } else {
          createProduct(submitData as any, {
            onSuccess: (response: any) => {
              toast.success(t('common:text-create-success'));
              
              // Сохраняем код из slug ответа сервера
              if (response?.slug) {
                const createdSlugData = extractSlugCode(response.slug);
                setSlugNumericCode(createdSlugData.code);
              }
              
              if (response?.id) {
                router.push(`/${router.query.shop}/products/${response.slug}/edit-wizard`);
              }
              setIsLoading(false);
            },
            onError: (error: any) => {
              console.error('ProductEditor - Create error:', error);
              
              // Детальная обработка ошибок
              let errorMessage = t('common:text-create-error');
              
              if (error?.response) {
                const status = error.response.status;
                const data = error.response.data;
                
                if (status === 500) {
                  errorMessage = 'Ошибка сервера (500). Проверьте данные товара и попробуйте снова.';
                  if (data?.message) {
                    errorMessage += ` Детали: ${data.message}`;
                  }
                } else if (data?.message) {
                  errorMessage = data.message;
                } else if (data?.errors && typeof data.errors === 'object') {
                  const firstError = Object.values(data.errors).flat()[0];
                  errorMessage = firstError ? String(firstError) : errorMessage;
                }
              } else if (error?.message) {
                errorMessage = error.message;
              }
              
              toast.error(errorMessage, {
                autoClose: 5000,
              });
              setIsLoading(false);
            },
          });
        }
      }
    } catch (error: any) {
      console.error('ProductEditor - Error in handleSave:', error);
      
      // Детальная обработка ошибок
      let errorMessage = 'Неизвестная ошибка';
      
      if (error?.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 500) {
          errorMessage = 'Ошибка сервера (500). Проверьте данные товара и попробуйте снова.';
          if (data?.message) {
            errorMessage += ` Детали: ${data.message}`;
          }
          // Показываем детали ошибки в консоли для отладки
          console.error('Server error details:', {
            status,
            data,
            submitData: error?.config?.data ? JSON.parse(error.config.data) : null,
          });
        } else if (status === 404) {
          errorMessage = 'Товар не найден. Обновите страницу и попробуйте снова.';
        } else if (status === 403 || status === 401) {
          errorMessage = 'Нет доступа для выполнения этой операции.';
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (data?.error) {
          errorMessage = String(data.error);
        } else if (data?.errors && typeof data.errors === 'object') {
          // Ошибки валидации
          const firstError = Object.values(data.errors).flat()[0];
          errorMessage = firstError ? String(firstError) : 'Ошибка валидации данных';
        } else {
          errorMessage = `Ошибка сервера (${status})`;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      console.error('Detailed error info:', {
        error,
        message: errorMessage,
        response: error?.response,
        data: error?.response?.data,
      });
      
      toast.error(errorMessage || t('common:text-error'), {
        autoClose: 5000,
      });
      setIsLoading(false);
    }
  };

  // Обработка вариантов группы
  const handleGroupVariants = async (
    groupKey: string,
    variants: any[],
    formDataForVariants: any,
    methods: any
  ) => {
    if (!variants || variants.length === 0) {
      console.log('No variants to save');
      return;
    }

    // Получаем данные из переданной формы
    const typeId = formDataForVariants.type_id 
      ? (typeof formDataForVariants.type_id === 'object' && formDataForVariants.type_id !== null && 'id' in formDataForVariants.type_id
          ? String(formDataForVariants.type_id.id)
          : String(formDataForVariants.type_id))
      : (initialProduct?.type?.id ? String(initialProduct.type.id) : undefined);
    
    if (!typeId) {
      console.error('type_id is required for group variants');
      toast.error('Ошибка: не указан тип товара');
      return;
    }
    
    const categoryId = formDataForVariants.category_id;
    const categories = formDataForVariants.categories || [];
    const shopIdForVariants = formDataForVariants.shop_id || shopId;
    
    console.log('handleGroupVariants - Starting to save variants:', {
      groupKey,
      variantsCount: variants.length,
      typeId,
      categoryId,
      categories,
      shopId: shopIdForVariants,
    });

    // Показываем прогресс
    toast.info(`Сохранение ${variants.length} вариантов...`);

    try {
      const { HttpClient } = await import('@/data/client/http-client');
      
      // Используем ProductWizardController для сохранения вариантов
      try {
        
        // Подготавливаем данные вариантов для отправки в контроллер
        const variantsData = variants.map((variant) => ({
          ...(variant.id ? { id: Number(variant.id) } : {}),
          name: variant.name || formDataForVariants.name || '',
          // Для существующих товаров используем текущий slug, для новых - генерируем только если нет
          slug: variant.slug || (variant.id ? '' : `${groupKey}-${Date.now()}-${variants.indexOf(variant)}`),
          type_id: Number(typeId),
          shop_id: Number(shopIdForVariants || shopId),
          price: variant.price ?? 0,
          sale_price: variant.sale_price ?? null,
          quantity: variant.quantity ?? 0,
          sku: variant.sku || '',
          internal_article: variant.internal_article || '',
          description: formDataForVariants.description || '',
          status: formDataForVariants.status || 'draft',
          language: router.locale || 'ru',
          ...(categoryId ? { category_id: String(categoryId) } : {}),
          ...(categories.length > 0 ? { categories } : {}),
          ...(variant.gallery && Array.isArray(variant.gallery) && variant.gallery.length > 0
            ? { gallery: variant.gallery }
            : {}),
          ...(variant.attributes && typeof variant.attributes === 'object' && Object.keys(variant.attributes).length > 0
            ? { 
                attribute_values: Object.entries(variant.attributes).reduce((acc: any, [key, value]) => {
                  const attrId = isNaN(Number(key)) ? key : Number(key);
                  const attrValue = Array.isArray(value) 
                    ? value.filter(v => v !== null && v !== undefined && v !== '').join(',')
                    : String(value || '');
                  if (attrValue.trim() !== '') {
                    acc[attrId] = attrValue;
                  }
                  return acc;
                }, {})
              }
            : {}),
        }));

        console.log('handleGroupVariants - Sending to ProductWizardController:', {
          group_key: groupKey,
          variants_count: variantsData.length,
          variants: variantsData.map(v => ({ id: v.id, name: v.name, sku: v.sku })),
        });

        // Отправляем все варианты одним запросом в ProductWizardController
        console.log('handleGroupVariants - productClient check:', {
          hasProductClient: !!productClient,
          hasSaveVariants: typeof productClient?.saveVariants === 'function',
          productClientKeys: productClient ? Object.keys(productClient) : [],
        });
        
        if (!productClient || typeof productClient.saveVariants !== 'function') {
          throw new Error('productClient.saveVariants is not a function. productClient: ' + JSON.stringify(Object.keys(productClient || {})));
        }
        
        const response = await productClient.saveVariants({
          group_key: groupKey,
          variants: variantsData,
        });

        console.log('handleGroupVariants - Response from ProductWizardController:', response);

        if (response?.success && response?.data) {
          // Обновляем форму с сохраненными вариантами
          const loadedVariants = response.data.map((product: any) => ({
            id: String(product.id),
            name: product.name || '',
            slug: product.slug || '',
            attributes: product.attribute_values || product.attributes || {},
            price: product.price || 0,
            sale_price: product.sale_price ?? null,
            quantity: product.quantity ?? 0,
            sku: product.sku || '',
            internal_article: product.internal_article || '',
            gallery: product.gallery || [],
            image: product.image || null,
          }));
          
          methods.setValue('group_variants', loadedVariants);
          console.log('handleGroupVariants - Updated form with saved variants:', loadedVariants);

          // Показываем результат
          if (response.errors && response.errors.length > 0) {
            const savedCount = response.data.length;
            const totalCount = variantsData.length;
            const failedVariants = response.errors.map((e: any) => `${e.name} (${e.error})`).join(', ');
            toast.error(`Сохранено ${savedCount} из ${totalCount} вариантов. Ошибки: ${failedVariants}`);
          } else {
            toast.success(`Все ${response.data.length} вариантов успешно сохранены`);
          }
          
          // Возвращаем response для обновления slug
          return response;
        } else {
          throw new Error(response?.message || 'Ошибка при сохранении вариантов');
        }
      } catch (error: any) {
        console.error('handleGroupVariants - Error:', error);
        const errorMessage = error?.response?.data?.message || error?.message || 'Ошибка при сохранении вариантов';
        toast.error(errorMessage);
        throw error;
      }
    } catch (error: any) {
      console.error('handleGroupVariants - Fatal error:', error);
      
      // Детальная обработка ошибок
      let errorMessage = 'Неизвестная ошибка';
      
      if (error?.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 500) {
          errorMessage = 'Ошибка сервера (500). Проверьте данные товаров и попробуйте снова.';
          if (data?.message) {
            errorMessage += ` Детали: ${data.message}`;
          }
        } else if (status === 404) {
          errorMessage = 'Товар или группа не найдены. Обновите страницу и попробуйте снова.';
        } else if (status === 403 || status === 401) {
          errorMessage = 'Нет доступа для выполнения этой операции.';
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (data?.error) {
          errorMessage = String(data.error);
        } else {
          errorMessage = `Ошибка сервера (${status})`;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      console.error('Detailed error info:', {
        error,
        message: errorMessage,
        response: error?.response,
        data: error?.response?.data,
      });
      
      toast.error('Критическая ошибка при сохранении вариантов: ' + errorMessage, {
        autoClose: 5000,
      });
      
      throw error;
    }
    
    // Возвращаем null в случае ошибки
    return null;
  };

  const handleNext = async () => {
    try {
      // Валидируем только обязательные поля текущего шага
      let isValid = true;
      
      // Для шага 0 (Основная информация) - проверяем name и category_ids
      if (currentStep === 0) {
        isValid = await methods.trigger(['name', 'category_ids']);
      }
      // Для шага 1 (Медиа) - валидация не нужна, все поля опциональны
      else if (currentStep === 1) {
        isValid = true; // Медиа не обязательны, всегда можно перейти дальше
      }
      // Шаг «Курс и подписка»: при subscription проверяем поля периода доступа
      else if (currentStep === 4) {
        const dtype = methods.getValues('digital_product_type');
        if (dtype === 'subscription') {
          isValid = await methods.trigger(['billing_access_type', 'duration_days', 'course']);
        } else {
          isValid = true;
        }
      }
      // Для остальных шагов проверяем общую валидность формы
      else {
        isValid = await methods.trigger();
      }
      
      if (isValid) {
        const values = methods.getValues();
        // Убеждаемся, что все массивы инициализированы правильно
        if (values.gallery !== undefined && !Array.isArray(values.gallery)) {
          values.gallery = [];
        }
        if (values.category_ids !== undefined && !Array.isArray(values.category_ids)) {
          values.category_ids = [];
        }
        if (values.tags !== undefined && !Array.isArray(values.tags)) {
          values.tags = [];
        }
        if (values.group_variants !== undefined && !Array.isArray(values.group_variants)) {
          values.group_variants = [];
        }
        // Убрали variations - больше не используется
        if (values.videos !== undefined && !Array.isArray(values.videos)) {
          values.videos = [];
        }
        updateProduct(values as any);
        if (currentStep < STEPS.length - 1) {
          setCurrentStep(currentStep + 1);
        }
      }
    } catch (error) {
      console.error('Error in handleNext:', error);
      // В случае ошибки все равно переходим к следующему шагу
      // (так как медиа не обязательны)
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <FormProvider {...methods}>
      <ProductEditorContent
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        STEPS={STEPS}
        CurrentStepComponent={CurrentStepComponent}
        handleNext={handleNext}
        handlePrev={handlePrev}
        handleSave={handleSave}
        creating={creating}
        updating={updating}
        productId={productId}
        initialProduct={initialProduct}
        t={t}
      />
    </FormProvider>
  );
}

// Внутренний компонент контента редактора внутри FormProvider
function ProductEditorContent({
  currentStep,
  setCurrentStep,
  STEPS,
  CurrentStepComponent,
  handleNext,
  handlePrev,
  handleSave,
  creating,
  updating,
  productId,
  initialProduct,
  t,
}: {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  STEPS: typeof STEPS;
  CurrentStepComponent: React.ComponentType;
  handleNext: () => void;
  handlePrev: () => void;
  handleSave: (data: ProductEditorFormData, publish: boolean) => Promise<void>;
  creating: boolean;
  updating: boolean;
  productId?: string;
  initialProduct?: Product | null;
  t: any;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-screen bg-gray-50 px-4 lg:px-6 py-4 lg:py-6">
        {/* Левая навигация */}
        <EditorNavigation
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
          productId={productId}
        />

        {/* Основной контент */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-heading">
              {productId ? 'Редактирование товара' : 'Добавить товар'}
            </h1>
            <p className="text-xs sm:text-sm text-body mt-1">
              Шаг {currentStep + 1} из {STEPS.length}: {STEPS[currentStep].label}
            </p>
          </div>

          {/* Прогресс-бар - скрыт на мобильных, так как есть адаптивная навигация */}
          <div className="hidden sm:block mb-6 lg:mb-8">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-2 mx-1 rounded ${
                    index <= currentStep ? 'bg-accent' : 'bg-border-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Контент шага */}
          <div className="min-h-[300px] sm:min-h-[400px]">
            <CurrentStepComponent />
          </div>

          {/* Действия */}
          <EditorActionsWrapper
            currentStep={currentStep}
            totalSteps={STEPS.length}
            onNext={handleNext}
            onPrev={handlePrev}
            handleSave={handleSave}
            isLoading={creating || updating}
            productId={productId}
          />
        </div>
      </div>
  );
}

// Обертка для EditorActions с доступом к FormContext
function EditorActionsWrapper({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  handleSave,
  isLoading,
  productId,
}: {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  handleSave: (data: ProductEditorFormData, publish: boolean) => Promise<void>;
  isLoading: boolean;
  productId?: string;
}) {
  const { getValues } = useFormContext<ProductEditorFormData>();
  
  // Стоимость размещения товара (должна совпадать с PaymentService::PRODUCT_PLACEMENT_COST)
  // Стоимость размещения товара отменена. Никаких оплат и модалок больше не требуется.
  const performSave = (publish: boolean) => {
    // Единая логика сохранения: весь payload формируется внутри handleSave.
    handleSave(getValues(), publish).catch((error: any) => {
      console.error('Error in handleSave:', error);
      toast.error(error?.message || 'Ошибка при сохранении');
    });
  };
  
  return (
    <EditorActions
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onPrev={onPrev}
      onSave={(publish) => {
        // Вся логика оплаты и подтверждений удалена. Публикация/сохранение сохраняет товар напрямую.
        performSave(!!publish);
      }}
      isLoading={isLoading}
      productId={productId}
    />
  );
}

