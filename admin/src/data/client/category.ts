import {
  Category,
  CategoryPaginator,
  CategoryQueryOptions,
  CreateCategoryInput,
  QueryOptions,
} from '@/types';
import { API_ENDPOINTS } from './api-endpoints';
import { crudFactory } from './curd-factory';
import { HttpClient } from './http-client';

export const categoryClient = {
  ...crudFactory<Category, QueryOptions, CreateCategoryInput>(
    API_ENDPOINTS.CATEGORIES
  ),
  paginated: ({ type, name, status, ...params }: Partial<CategoryQueryOptions> & { status?: string }) => {
    return HttpClient.get<CategoryPaginator>(API_ENDPOINTS.CATEGORIES, {
      searchJoin: 'and',
      ...params,
      search: HttpClient.formatSearchParams({ type, name, status }),
    });
  },
  bulkUpdateParent: (data: { category_ids: number[]; parent_id: number | null }) => {
    return HttpClient.post(`${API_ENDPOINTS.CATEGORIES}/bulk-update-parent`, data);
  },
  bulkUpdateStatus: (data: { category_ids: number[]; status: string }) => {
    return HttpClient.post(`${API_ENDPOINTS.CATEGORIES}/bulk-update-status`, data);
  },
  reorder: (data: { ids: number[] }) => {
    // Use POST for broader compatibility (backend supports PATCH and POST)
    return HttpClient.post(`${API_ENDPOINTS.CATEGORIES}/reorder`, data);
  },
  // Category-Attribute management
  getCategoryAttributes: (categoryId: number) => {
    return HttpClient.get(`categories/${categoryId}/attributes`);
  },
  attachAttributeToCategory: (data: {
    category_id: number;
    attribute_id: number;
    is_required?: boolean;
    sort_order?: number;
  }) => {
    return HttpClient.post(API_ENDPOINTS.ATTACH_ATTRIBUTE_TO_CATEGORY, data);
  },
  updateCategoryAttribute: (data: {
    category_id: number;
    attribute_id: number;
    is_required?: boolean;
    sort_order?: number;
  }) => {
    return HttpClient.put(API_ENDPOINTS.UPDATE_CATEGORY_ATTRIBUTE, data);
  },
  detachAttributeFromCategory: (data: {
    category_id: number;
    attribute_id: number;
  }) => {
    // Для DELETE запросов axios может не отправлять данные в теле запроса
    // Используем query параметры для надежности
    return HttpClient.delete(
      `${API_ENDPOINTS.DETACH_ATTRIBUTE_FROM_CATEGORY}?category_id=${data.category_id}&attribute_id=${data.attribute_id}`,
      {
        data, // Также отправляем в теле на случай, если сервер поддерживает
      }
    );
  },
  getAttributeCategories: (attributeId: number) => {
    return HttpClient.get(`attributes/${attributeId}/categories`);
  },
};
