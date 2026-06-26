import Router,{ useRouter } from 'next/router';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { useTranslation } from 'next-i18next';
import { Routes } from '@/config/routes';
import { API_ENDPOINTS } from './client/api-endpoints';
import {
  Category,
  CategoryPaginator,
  CategoryQueryOptions,
  GetParams,
} from '@/types';
import { mapPaginatorData } from '@/utils/data-mappers';
import { categoryClient } from './client/category';
import { Config } from '@/config';

export const useCreateCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation(categoryClient.create, {
    onSuccess: () => {
      Router.push(Routes.category.list, undefined, {
        locale: Config.defaultLanguage,
      });
      toast.success(t('common:successfully-created'));
    },
    // Always refetch after error or success:
    // Не дергаем refetch, чтобы не "прыгала" постраничка после локального reorder
    // Пользователь останется на той же странице с локально обновлённым порядком
    onSettled: () => {},
  });
};

export const useDeleteCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation(categoryClient.delete, {
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
      queryClient.invalidateQueries(API_ENDPOINTS.CATEGORIES);
    },
  });
};

export const useUpdateCategoryMutation = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation(categoryClient.update, {
    onSuccess: async (data) => {
      const generateRedirectUrl = router.query.shop
        ? `/${router.query.shop}${Routes.category.list}`
        : Routes.category.list;
      await router.push(
        `${generateRedirectUrl}/${data?.slug}/edit`,
        undefined,
        {
          locale: Config.defaultLanguage,
        }
      );
      toast.success(t('common:successfully-updated'));
    },
    // onSuccess: () => {
    //   toast.success(t('common:successfully-updated'));
    // },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.CATEGORIES);
    },
  });
};

export const useCategoryQuery = ({ slug, language }: GetParams) => {
  const { data, error, isLoading } = useQuery<Category, Error>(
    [API_ENDPOINTS.CATEGORIES, { slug, language }],
    () => categoryClient.get({ slug, language })
  );

  return {
    category: data,
    error,
    isLoading,
  };
};

export const useCategoriesQuery = (options: Partial<CategoryQueryOptions>) => {
  const { data, error, isLoading, refetch } = useQuery<CategoryPaginator, Error>(
    [API_ENDPOINTS.CATEGORIES, options],
    ({ queryKey, pageParam }) =>
      categoryClient.paginated(Object.assign({}, queryKey[1], pageParam)),
    {
      keepPreviousData: true,
    }
  );

  return {
    categories: data?.data ?? [],
    paginatorInfo: mapPaginatorData(data),
    error,
    loading: isLoading,
    refetch,
  };
};

export const useBulkUpdateCategoryParentMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation(categoryClient.bulkUpdateParent, {
    onSuccess: (data) => {
      toast.success(data.message || t('common:successfully-updated'));
    },
    onError: (error: any) => {
      toast.error(error.message || t('common:error-something-wrong'));
    },
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.CATEGORIES);
    },
  });
};

export const useBulkUpdateCategoryStatusMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation(categoryClient.bulkUpdateStatus, {
    onSuccess: (data) => {
      toast.success(data.message || t('common:successfully-updated'));
    },
    onError: (error: any) => {
      toast.error(error.message || t('common:error-something-wrong'));
    },
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.CATEGORIES);
    },
  });
};

export const useReorderCategoriesMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation(async (payload: any) => {
    try {
      return await categoryClient.reorder(payload);
    } catch (e: any) {
      // Fallback: if backend doesn't recognize new format, retry with legacy { ids }
      const status = e?.response?.status;
      if (status === 404 && payload?.items && Array.isArray(payload.items)) {
        const ids = payload.items.map((i: any) => i.id).filter((id: any) => Number.isFinite(id));
        if (ids.length > 0) {
          return await categoryClient.reorder({ ids });
        }
      }
      throw e;
    }
  }, {
    onSuccess: () => {
      toast.success('Порядок категорий успешно сохранён');
    },
    onError: (error: any) => {
      console.error('Reorder categories error:', error);
      toast.error(error.message || 'Ошибка при сохранении порядка категорий');
    },
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.CATEGORIES);
    },
  });
};

// Category-Attribute management hooks
export const useCategoryAttributesQuery = (categoryId: number | undefined) => {
  return useQuery(
    ['category-attributes', categoryId],
    () => categoryClient.getCategoryAttributes(categoryId!),
    {
      enabled: !!categoryId,
    }
  );
};

export const useAttachAttributeToCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation(categoryClient.attachAttributeToCategory, {
    onSuccess: () => {
      toast.success(t('common:successfully-created'));
      // Обновляем кэш сразу после успешного добавления
      queryClient.invalidateQueries('category-attributes');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t('common:error-something-wrong'));
    },
    onSettled: () => {
      queryClient.invalidateQueries('category-attributes');
    },
  });
};

export const useUpdateCategoryAttributeMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation(categoryClient.updateCategoryAttribute, {
    onSuccess: () => {
      toast.success(t('common:successfully-updated'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t('common:error-something-wrong'));
    },
    onSettled: () => {
      queryClient.invalidateQueries('category-attributes');
    },
  });
};

export const useDetachAttributeFromCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation(categoryClient.detachAttributeFromCategory, {
    onSuccess: () => {
      toast.success(t('common:successfully-deleted'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t('common:error-something-wrong'));
    },
    onSettled: () => {
      queryClient.invalidateQueries('category-attributes');
    },
  });
};
