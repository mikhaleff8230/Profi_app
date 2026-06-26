import Router, { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { useTranslation } from 'next-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';
import { productGroupClient, productSkuClient } from './client/product-group';
import {
  ProductGroupQueryOptions,
  ProductSkuQueryOptions,
  GetParams,
  ProductGroupPaginator,
  ProductSkuPaginator,
  ProductGroup,
  ProductSku,
  GenerateSkusInput,
} from '@/types';
import { mapPaginatorData } from '@/utils/data-mappers';
import { Routes } from '@/config/routes';
import { Config } from '@/config';

// ==================== ProductGroup Hooks ====================

export const useCreateProductGroupMutation = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation();
  
  return useMutation(productGroupClient.create, {
    onSuccess: async (data) => {
      console.log('=== ProductGroup created successfully ===');
      console.log('Response data:', data);
      
      toast.success(t('common:successfully-created'));
      
      if (data?.slug) {
        // Редирект на страницу управления SKU
        const skuUrl = router.query.shop
          ? `/${router.query.shop}/product-groups/${data.slug}/skus`
          : `/product-groups/${data.slug}/skus`;
        
        console.log('Redirecting to:', skuUrl);
        
        await Router.push(skuUrl, undefined, {
          locale: Config.defaultLanguage,
        });
      } else {
        // Если нет slug, редирект на список
        const listUrl = router.query.shop
          ? `/${router.query.shop}/product-groups`
          : '/product-groups';
        
        await Router.push(listUrl, undefined, {
          locale: Config.defaultLanguage,
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.PRODUCT_GROUPS);
    },
    onError: (error: any) => {
      console.error('=== Create ProductGroup ERROR ===');
      console.error('Full error:', error);
      console.error('Response:', error?.response);
      console.error('Data:', error?.response?.data);
      
      const { data, status } = error?.response || {};
      if (status === 422) {
        const errorMessage: any = Object.values(data || {}).flat();
        toast.error(errorMessage[0] || t('common:error-something-wrong'));
      } else {
        const message = error?.response?.data?.message || error?.message || 'error-occurred';
        toast.error(t(`common:${message}`, { defaultValue: message }));
      }
    },
  });
};

export const useUpdateProductGroupMutation = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  return useMutation(productGroupClient.update, {
    onSuccess: async (data) => {
      console.log('=== Updated product group data ===', data);
      console.log('Slug from response:', data?.slug);
      console.log('Full response:', JSON.stringify(data, null, 2));
      
      if (!data?.slug) {
        console.error('❌ API returned ProductGroup WITHOUT slug!');
        toast.error('Ошибка: группа обновлена, но slug отсутствует в ответе');
        // Просто инвалидируем кэш, не делаем редирект
        queryClient.invalidateQueries(API_ENDPOINTS.PRODUCT_GROUPS);
        return;
      }
      
      const generateRedirectUrl = router.query.shop
        ? `/${router.query.shop}${Routes.productGroup.list}`
        : Routes.productGroup.list;
      
      const redirectPath = `${generateRedirectUrl}/${data.slug}/edit`;
      console.log('Redirecting to:', redirectPath);
      
      await router.push(
        redirectPath,
        undefined,
        {
          locale: Config.defaultLanguage,
        }
      );
      toast.success(t('common:successfully-updated'));
    },
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.PRODUCT_GROUPS);
    },
    onError: (error: any) => {
      console.error('Update ProductGroup error:', error);
      const errorMessage =
        error?.response?.data?.message || error?.message || 'error-occurred';
      const errorDetails = error?.response?.data?.errors || error?.response?.data;

      if (errorDetails && typeof errorDetails === 'object' && !Array.isArray(errorDetails)) {
        const firstError = Object.values(errorDetails).flat()[0];
        if (firstError) {
          toast.error(String(firstError));
          return;
        }
      }

      const translatedMessage = t(`common:${errorMessage}`, {
        defaultValue: errorMessage,
      });
      toast.error(translatedMessage || 'Произошла ошибка при сохранении');
    },
  });
};

export const useDeleteProductGroupMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation(productGroupClient.delete, {
    onSuccess: () => {
      toast.success(t('common:successfully-deleted'));
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors ||
        error?.message ||
        t('common:error-something-wrong');
      toast.error(
        typeof errorMessage === 'object'
          ? JSON.stringify(errorMessage)
          : errorMessage
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.PRODUCT_GROUPS);
    },
  });
};

export const useProductGroupQuery = ({ slug, language }: GetParams) => {
  const { data, error, isLoading } = useQuery<ProductGroup, Error>(
    [API_ENDPOINTS.PRODUCT_GROUPS, { slug, language }],
    () => productGroupClient.get({ slug: slug!, language: language! }),
    {
      enabled: Boolean(slug),
    }
  );

  return {
    productGroup: data,
    error,
    isLoading,
  };
};

export const useProductGroupsQuery = (options: Partial<ProductGroupQueryOptions>) => {
  const { data, error, isLoading } = useQuery<ProductGroupPaginator, Error>(
    [API_ENDPOINTS.PRODUCT_GROUPS, options],
    ({ queryKey, pageParam }) =>
      productGroupClient.paginated(Object.assign({}, queryKey[1], pageParam)),
    {
      keepPreviousData: true,
    }
  );

  return {
    productGroups: data?.data ?? [],
    paginatorInfo: mapPaginatorData(data),
    error,
    loading: isLoading,
  };
};

// ==================== ProductSku Hooks ====================

export const useCreateProductSkuMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation(productSkuClient.create, {
    onSuccess: () => {
      toast.success(t('common:successfully-created'));
    },
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.PRODUCT_SKUS);
      queryClient.invalidateQueries(API_ENDPOINTS.PRODUCT_GROUPS);
    },
    onError: (error: any) => {
      console.error('Create ProductSku error:', error);
      const { data, status } = error?.response;
      if (status === 422) {
        const errorMessage: any = Object.values(data).flat();
        toast.error(errorMessage[0]);
      } else {
        toast.error(t(`common:${error?.response?.data.message}`));
      }
    },
  });
};

export const useUpdateProductSkuMutation = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  return useMutation(productSkuClient.update, {
    onSuccess: (data) => {
      console.log('useUpdateProductSkuMutation - Success, data:', data);
      console.log('PropertyValues in response:', data?.propertyValues);
      
      // Обновляем кэш напрямую для всех возможных ключей запросов
      // Это предотвращает 404 ошибки при перезагрузке данных
      if (data?.id) {
        // Обновляем кэш по ID
        queryClient.setQueryData(
          [API_ENDPOINTS.PRODUCT_SKUS, { id: data.id.toString() }],
          data
        );
      }
      if (data?.slug) {
        // Обновляем кэш по новому slug
        queryClient.setQueryData(
          [API_ENDPOINTS.PRODUCT_SKUS, { slug: data.slug }],
          data
        );
      }
      
      // Также обновляем кэш для всех возможных комбинаций slug+language
      // чтобы избежать 404 при перезагрузке
      const languages = [data?.language, 'ru', 'en'].filter(Boolean);
      languages.forEach((lang) => {
        if (data?.id) {
          queryClient.setQueryData(
            [API_ENDPOINTS.PRODUCT_SKUS, { id: data.id.toString(), language: lang }],
            data
          );
        }
        if (data?.slug) {
          queryClient.setQueryData(
            [API_ENDPOINTS.PRODUCT_SKUS, { slug: data.slug, language: lang }],
            data
          );
        }
      });
      
      toast.success(t('common:successfully-updated'));
    },
    onSettled: () => {
      console.log('useUpdateProductSkuMutation - Invalidating queries');
      // Небольшая задержка, чтобы дать время обновить URL (если slug изменился)
      setTimeout(() => {
        // Инвалидируем только списки SKU и группы товаров
        // Конкретные SKU уже обновлены через setQueryData в onSuccess
        queryClient.invalidateQueries([API_ENDPOINTS.PRODUCT_SKUS], {
          predicate: (query) => {
            // Инвалидируем только запросы списков (с параметрами pagination, group_id и т.д.)
            // Не инвалидируем запросы конкретных SKU (с slug или id)
            const queryKey = query.queryKey[1] as any;
            return !queryKey?.slug && !queryKey?.id;
          },
        });
        queryClient.invalidateQueries(API_ENDPOINTS.PRODUCT_GROUPS);
      }, 100); // 100ms задержка для обновления URL
    },
    onError: (error: any) => {
      console.error('Update ProductSku error:', error);
      const errorMessage =
        error?.response?.data?.message || error?.message || 'error-occurred';
      toast.error(t(`common:${errorMessage}`, { defaultValue: errorMessage }));
    },
  });
};

export const useDeleteProductSkuMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation(productSkuClient.delete, {
    onSuccess: () => {
      toast.success(t('common:successfully-deleted'));
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors ||
        error?.message ||
        t('common:error-something-wrong');
      toast.error(
        typeof errorMessage === 'object'
          ? JSON.stringify(errorMessage)
          : errorMessage
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.PRODUCT_SKUS);
      queryClient.invalidateQueries(API_ENDPOINTS.PRODUCT_GROUPS);
    },
  });
};

export const useProductSkuQuery = ({ slug, id, language }: { slug?: string; id?: string; language?: string }) => {
  const { data, error, isLoading } = useQuery<ProductSku, Error>(
    [API_ENDPOINTS.PRODUCT_SKUS, { slug, id, language }],
    () => {
      if (id) {
        return productSkuClient.getById(id, language);
      }
      return productSkuClient.get({ slug: slug!, language: language! });
    },
    {
      enabled: Boolean(slug || id),
    }
  );

  return {
    productSku: data,
    sku: data, // Добавляем alias для совместимости
    error,
    isLoading,
  };
};

export const useProductSkusQuery = (options: Partial<ProductSkuQueryOptions>) => {
  const { data, error, isLoading } = useQuery<ProductSkuPaginator, Error>(
    [API_ENDPOINTS.PRODUCT_SKUS, options],
    ({ queryKey, pageParam }) =>
      productSkuClient.paginated(Object.assign({}, queryKey[1], pageParam)),
    {
      keepPreviousData: true,
      enabled: Boolean(options.group_id), // ✅ Не выполняем запрос если нет group_id
    }
  );

  return {
    productSkus: data?.data ?? [],
    paginatorInfo: mapPaginatorData(data),
    error,
    loading: isLoading,
  };
};

export const useGroupSkusQuery = (groupId: string) => {
  const { data, error, isLoading } = useQuery<ProductSkuPaginator, Error>(
    [API_ENDPOINTS.PRODUCT_SKUS, { group_id: groupId }],
    () => productSkuClient.getGroupSkus(groupId, { limit: 100 }),
    {
      enabled: Boolean(groupId),
    }
  );

  return {
    skus: data?.data ?? [],
    paginatorInfo: mapPaginatorData(data),
    error,
    loading: isLoading,
  };
};

// ==================== Generate SKUs Hook ====================

export const useGenerateSkusMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation(
    ({ groupId, data }: { groupId: string; data: Omit<GenerateSkusInput, 'group_id'> }) =>
      productGroupClient.generateSkus(groupId, data),
    {
      onSuccess: (data) => {
        toast.success(
          t('common:text-generated-skus', {
            count: data.count,
            defaultValue: `Сгенерировано ${data.count} SKU`,
          })
        );
      },
      onSettled: () => {
        queryClient.invalidateQueries(API_ENDPOINTS.PRODUCT_SKUS);
        queryClient.invalidateQueries(API_ENDPOINTS.PRODUCT_GROUPS);
      },
      onError: (error: any) => {
        console.error('Generate SKUs error:', error);
        const errorMessage =
          error?.response?.data?.message || error?.message || 'error-occurred';
        toast.error(t(`common:${errorMessage}`, { defaultValue: errorMessage }));
      },
    }
  );
};

