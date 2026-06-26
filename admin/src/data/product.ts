import Router, { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { useTranslation } from 'next-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';
import { productClient } from './client/product';
import {
  ProductQueryOptions,
  GetParams,
  ProductPaginator,
  Product,
} from '@/types';
import { mapPaginatorData } from '@/utils/data-mappers';
import { Routes } from '@/config/routes';
import { Config } from '@/config';

export const useCreateProductMutation = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation();
  return useMutation(productClient.create, {
    onSuccess: async (data) => {
      console.log('=== useCreateProductMutation - SUCCESS ===');
      console.log('Created product data:', data);
      console.log('Product slug:', data?.slug);
      console.log('Product id:', data?.id);
      console.log('Router query shop:', router.query.shop);
      
      // Если товар создан, редиректим на редактирование через визард (чтобы можно было заполнить атрибуты)
      if (data?.slug) {
        // Всегда редиректим на edit-wizard при создании товара (включая копирование)
        const shopPrefix = router.query.shop ? `/${router.query.shop}` : '';
        // Убеждаемся, что slug не содержит лишних символов
        const cleanSlug = String(data.slug).trim();
        const redirectUrl = `${shopPrefix}/products/${cleanSlug}/edit-wizard`;
        
        console.log('=== Product created successfully ===');
        console.log('Product ID:', data.id);
        console.log('Product slug from API:', cleanSlug);
        console.log('Redirecting to:', redirectUrl);
        console.log('Full product data:', data);
        
      // ВАЖНО: Обновляем кеш React Query сразу с данными из response
      // Это предотвращает перезапись формы старыми данными из кеша
      const language = router.locale || Config.defaultLanguage;
      queryClient.setQueryData(
        [API_ENDPOINTS.PRODUCTS, { slug: cleanSlug, language }],
        data
      );
      console.log('ProductEditor - Cache updated with created product data');
      
      // Увеличиваем задержку, чтобы товар точно успел создаться в БД и индексироваться
      // Также инвалидируем кеш, чтобы при загрузке страницы товар был свежим
      queryClient.invalidateQueries([API_ENDPOINTS.PRODUCTS, { slug: cleanSlug }]);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
        
        await Router.push(redirectUrl, undefined, {
          locale: Config.defaultLanguage,
        });
      } else if (data?.id) {
        // Если есть id, но нет slug, пытаемся получить товар по id
        console.warn('Product created but no slug in response, product id:', data.id);
        const shopPrefix = router.query.shop ? `/${router.query.shop}` : '';
        const listUrl = `${shopPrefix}${Routes.product.list}`;
        
        await Router.push(listUrl, undefined, {
          locale: Config.defaultLanguage,
        });
        toast.success(t('common:successfully-created'));
      } else {
        // Если slug не вернулся, редиректим на список
        const shopPrefix = router.query.shop ? `/${router.query.shop}` : '';
        const listUrl = `${shopPrefix}${Routes.product.list}`;
        
        console.log('No slug or id in response, redirecting to list:', listUrl);
        
        await Router.push(listUrl, undefined, {
          locale: Config.defaultLanguage,
        });
        toast.success(t('common:successfully-created'));
      }
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.PRODUCTS);
    },
    onError: (error: any) => {
      console.error('=== useCreateProductMutation - ERROR ===');
      console.error('useCreateProductMutation - Error:', error);
      console.error('useCreateProductMutation - Error response:', error?.response);
      console.error('useCreateProductMutation - Error data:', error?.response?.data);
      console.error('useCreateProductMutation - Error status:', error?.response?.status);
      const {data, status} =  error?.response;
      if (status === 422) {
        const errorMessage:any = Object.values(data).flat();
        toast.error(errorMessage[0]);
      }else{
        toast.error(t(`common:${error?.response?.data.message}`));
      }
    },
  });
};

export const useUpdateProductMutation = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation(productClient.update, {
    onSuccess: async (data) => {
      console.log('=== useUpdateProductMutation - SUCCESS ===');
      console.log('Updated product data:', data);
      console.log('Response gallery:', {
        hasGallery: 'gallery' in data,
        gallery: data.gallery,
        galleryType: typeof data.gallery,
        galleryIsArray: Array.isArray(data.gallery),
        galleryLength: Array.isArray(data.gallery) ? data.gallery.length : 0
      });
      
      // КРИТИЧНО: Обновляем кеш React Query с данными из response
      // НО: если gallery в ответе пустая или невалидная, НЕ перезаписываем кеш
      // Это предотвращает потерю gallery в форме
      if (data?.slug) {
        const language = router.locale || Config.defaultLanguage;
        const cacheKey = [API_ENDPOINTS.PRODUCTS, { slug: data.slug, language }];
        const existingCache = queryClient.getQueryData<Product>(cacheKey);
        
        // Проверяем валидность gallery в ответе
        const hasValidGallery = Array.isArray(data.gallery) && data.gallery.length > 0;
        const hasValidGalleryStructure = Array.isArray(data.gallery) && 
          data.gallery.some((img: any) => img && (img.thumbnail || img.original || img.url));
        
        if (hasValidGallery && hasValidGalleryStructure) {
          // Gallery валидна - обновляем кеш полностью
          queryClient.setQueryData(cacheKey, data);
          console.log('✅ Cache updated with valid gallery from response', {
            galleryCount: data.gallery.length
          });
        } else {
          // Gallery пустая или невалидна - обновляем кеш БЕЗ gallery (сохраняем существующую)
          if (existingCache) {
            const updatedData = {
              ...data,
              gallery: existingCache.gallery || [] // Сохраняем gallery из кеша
            };
            queryClient.setQueryData(cacheKey, updatedData);
            console.log('⚠️ Cache updated WITHOUT gallery (keeping existing)', {
              responseGalleryLength: Array.isArray(data.gallery) ? data.gallery.length : 0,
              keptGalleryLength: Array.isArray(existingCache.gallery) ? existingCache.gallery.length : 0
            });
          } else {
            // Если кеша нет, обновляем как есть
            queryClient.setQueryData(cacheKey, data);
            console.log('⚠️ No existing cache, updated with response (may have empty gallery)');
          }
        }
      }
      
      // Проверяем, находимся ли мы на странице edit-wizard (через pathname или asPath)
      const isEditWizard = router.pathname.includes('/edit-wizard') || 
                          router.asPath.includes('/edit-wizard') ||
                          (router.query.slug && typeof window !== 'undefined' && window.location.pathname.includes('/edit-wizard'));
      
      // Если мы в визарде, НЕ делаем редирект (остаемся на той же странице)
      // Иначе редиректим на edit
      if (!isEditWizard) {
        const generateRedirectUrl = router.query.shop
          ? `/${router.query.shop}${Routes.product.list}`
          : Routes.product.list;
        await router.push(
          `${generateRedirectUrl}/${data?.slug}/edit`,
          undefined,
          {
            locale: Config.defaultLanguage,
          }
        );
      }
      // Если мы в визарде, toast показываем, но редирект не делаем
      toast.success(t('common:successfully-updated'));
    },
    // КРИТИЧНО: НЕ инвалидируем кеш после сохранения в визарде
    // Это предотвращает перезагрузку данных и потерю gallery в форме
    // Инвалидируем только если мы НЕ в визарде (для списков товаров)
    onSettled: () => {
      const isEditWizard = router.pathname.includes('/edit-wizard') || 
                          router.asPath.includes('/edit-wizard');
      // Если мы в визарде - НЕ инвалидируем кеш, чтобы не перезагружать данные
      // Это предотвращает потерю gallery после сохранения
      if (!isEditWizard) {
        queryClient.invalidateQueries(API_ENDPOINTS.PRODUCTS);
        console.log('✅ Cache invalidated (not in wizard)');
      } else {
        console.log('⚠️ Skipping cache invalidation (in wizard, keeping form data)');
      }
    },
    onError: (error: any) => {
      console.error('=== useUpdateProductMutation - ERROR ===');
      console.error('Update error:', error);
      console.error('Update error response:', error?.response);
      console.error('Update error data:', error?.response?.data);
      console.error('Update error status:', error?.response?.status);
      const errorMessage = error?.response?.data?.message || error?.message || 'error-occurred';
      const errorDetails = error?.response?.data?.errors || error?.response?.data;
      
      // Если есть детализированные ошибки валидации
      if (errorDetails && typeof errorDetails === 'object' && !Array.isArray(errorDetails)) {
        const firstError = Object.values(errorDetails).flat()[0];
        if (firstError) {
          toast.error(String(firstError));
          return;
        }
      }
      
      // Пробуем перевести сообщение об ошибке
      const translatedMessage = t(`common:${errorMessage}`, { defaultValue: errorMessage });
      toast.error(translatedMessage || 'Произошла ошибка при сохранении');
      
      // Логируем для отладки
      console.error('Product update error:', error);
      console.error('Error response:', error?.response);
    },
  });
};

export const useDeleteProductMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation(productClient.delete, {
    onSuccess: () => {
      toast.success(t('common:successfully-deleted'));
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 
                           error?.response?.data?.errors || 
                           error?.message || 
                           t('common:error-something-wrong');
      toast.error(typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage);
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.PRODUCTS);
    },
  });
};

export const useProductQuery = ({ slug, language }: GetParams) => {
  const { data, error, isLoading } = useQuery<Product, Error>(
    [API_ENDPOINTS.PRODUCTS, { slug, language }],
    () => productClient.get({ slug, language }),
    {
      retry: 3, // Повторяем запрос до 3 раз при ошибке
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Экспоненциальная задержка
      staleTime: 0, // Всегда считаем данные устаревшими, чтобы загружать свежие
      cacheTime: 0, // Не кешируем, чтобы всегда загружать свежие данные
    }
  );

  return {
    product: data,
    error,
    isLoading,
  };
};

export const useProductsQuery = (
  params: Partial<ProductQueryOptions>,
  options: any = {}
) => {
  const { data, error, isLoading } = useQuery<ProductPaginator, Error>(
    [API_ENDPOINTS.PRODUCTS, params],
    ({ queryKey, pageParam }) =>
      productClient.paginated(Object.assign({}, queryKey[1], pageParam)),
    {
      keepPreviousData: true,
      ...options,
    }
  );

  // Логирование для отладки
  if (data?.data && data.data.length > 0) {
    const productsWithGroupKey = data.data.filter((p: any) => p?.group_key);
    if (productsWithGroupKey.length > 0) {
      console.log('🔍 API вернул товары с group_key:', {
        total: data.data.length,
        withGroupKey: productsWithGroupKey.length,
        sample: productsWithGroupKey[0],
        params: params,
      });
    }
  }

  return {
    products: data?.data ?? [],
    paginatorInfo: mapPaginatorData(data),
    error,
    loading: isLoading,
  };
};

export const useGenerateDescriptionMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');
  return useMutation(productClient.generateDescription, {
    onSuccess: () => {
      toast.success(t('Generated...'));
    },
    // Always refetch after error or success:
    onSettled: (data) => {
      queryClient.refetchQueries(API_ENDPOINTS.GENERATE_DESCRIPTION);
      data;
    },
  });
};
