import {
  ProductGroup,
  ProductSku,
  CreateProductGroup,
  CreateProductSku,
  UpdateProductGroup,
  UpdateProductSku,
  ProductGroupPaginator,
  ProductSkuPaginator,
  QueryOptions,
  GetParams,
  ProductGroupQueryOptions,
  ProductSkuQueryOptions,
  GenerateSkusInput,
} from '@/types';
import { API_ENDPOINTS } from './api-endpoints';
import { crudFactory } from './curd-factory';
import { HttpClient } from './http-client';

export const productGroupClient = {
  ...crudFactory<ProductGroup, QueryOptions, CreateProductGroup>(
    API_ENDPOINTS.PRODUCT_GROUPS
  ),
  
  get({ slug, language }: GetParams) {
    return HttpClient.get<ProductGroup>(
      `${API_ENDPOINTS.PRODUCT_GROUPS}/${slug}`,
      {
        language,
        with: 'type;shop;category;tags;activeSkus;activeSkus.propertyValues',
      }
    );
  },
  
  paginated: ({
    name,
    shop_id,
    category_id,
    type_id,
    status,
    ...params
  }: Partial<ProductGroupQueryOptions>) => {
    return HttpClient.get<ProductGroupPaginator>(API_ENDPOINTS.PRODUCT_GROUPS, {
      searchJoin: 'and',
      with: 'shop;type;category',
      ...params,
      search: HttpClient.formatSearchParams({
        title: name,
        shop_id,
        category_id,
        type_id,
        status,
      }),
    });
  },
  
  generateSkus: (groupId: string, data: Omit<GenerateSkusInput, 'group_id'>) => {
    return HttpClient.post<{ skus: ProductSku[]; count: number }>(
      `${API_ENDPOINTS.PRODUCT_GROUPS}/${groupId}/generate-skus`,
      data
    );
  },
};

export const productSkuClient = {
  // НЕ используем crudFactory для SKU - у них особые роуты!
  
  create: (input: CreateProductSku & { product_group_id: string }) => {
    const { product_group_id, ...data } = input;
    return HttpClient.post<ProductSku>(
      `${API_ENDPOINTS.PRODUCT_GROUPS}/${product_group_id}/skus`,
      data
    );
  },
  
  update: ({ id, ...input }: UpdateProductSku & { id: string }) => {
    return HttpClient.put<ProductSku>(`skus/${id}`, input);
  },
  
  delete: ({ id }: { id: string }) => {
    return HttpClient.delete<{ message: string }>(`skus/${id}`);
  },
  
  get({ slug, language }: GetParams) {
    return HttpClient.get<ProductSku>(`${API_ENDPOINTS.PRODUCT_SKUS}/${slug}`, {
      language,
      with: 'group;propertyValues;propertyValues.attribute;properties',
    });
  },
  
  getById(id: string, language?: string) {
    return HttpClient.get<ProductSku>(`skus/${id}/get`, {
      language,
      with: 'group;propertyValues;propertyValues.attribute;properties',
    });
  },
  
  paginated: ({
    group_id,
    is_active,
    ...params
  }: Partial<ProductSkuQueryOptions>) => {
    // group_id передаем напрямую в query параметры, а не через search
    // чтобы бэкенд мог правильно фильтровать по группе
    const queryParams: any = {
      searchJoin: 'and',
      with: 'group;propertyValues',
      ...params,
    };
    
    // group_id передаем напрямую как query параметр
    if (group_id) {
      queryParams.group_id = group_id;
    }
    
    // is_active передаем через search если нужно
    if (is_active !== undefined) {
      queryParams.search = HttpClient.formatSearchParams({
        is_active,
      });
    }
    
    return HttpClient.get<ProductSkuPaginator>(API_ENDPOINTS.PRODUCT_SKUS, queryParams);
  },
  
  // Получить все SKU группы
  getGroupSkus: (groupId: string, params?: QueryOptions) => {
    return HttpClient.get<ProductSkuPaginator>(API_ENDPOINTS.PRODUCT_SKUS, {
      searchJoin: 'and',
      with: 'propertyValues;propertyValues.attribute',
      ...params,
      search: HttpClient.formatSearchParams({
        group_id: groupId,
      }),
    });
  },
};

