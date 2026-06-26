import {
  Product,
  CreateProduct,
  ProductPaginator,
  QueryOptions,
  GetParams,
  ProductQueryOptions,
  GenerateDescriptionInput,
} from '@/types';
import { API_ENDPOINTS } from './api-endpoints';
import { crudFactory } from './curd-factory';
import { HttpClient } from './http-client';

// Создаем базовый объект из crudFactory
const baseProductClient = crudFactory<Product, QueryOptions, CreateProduct>(API_ENDPOINTS.PRODUCTS);

// Экспортируем productClient с добавленными методами
export const productClient = {
  ...baseProductClient,
  // Переопределяем update для поддержки FormData
  update(data: Partial<CreateProduct> & { id: string } | FormData) {
    // Если это FormData, извлекаем id и отправляем как есть
    if (data instanceof FormData) {
      const id = data.get('id');
      if (!id) {
        throw new Error('Product ID is required for update');
      }
      // Логируем для отладки
      console.log('productClient.update - sending FormData', {
        id,
        hasVideo: data.has('video'),
        videoFile: data.get('video'),
        isFormData: data instanceof FormData,
      });
      return HttpClient.put<Product>(`${API_ENDPOINTS.PRODUCTS}/${id}`, data);
    }
    // Иначе используем стандартную логику
    const { id, ...input } = data;
    console.log('=== productClient.update - sending JSON ===');
    console.log('Product ID:', id);
    console.log('Update data keys:', Object.keys(input));
    console.log('Update data product_type:', input.product_type);
    console.log('Update data variations:', input.variations);
    console.log('Update data variation_options:', input.variation_options);
    console.log('Full update data:', JSON.stringify(input, null, 2));
    return HttpClient.put<Product>(`${API_ENDPOINTS.PRODUCTS}/${id}`, input);
  },
  get({ slug, language }: GetParams) {
    return HttpClient.get<Product>(`${API_ENDPOINTS.PRODUCTS}/${slug}`, {
      language,
      with: 'type;shop;categories;tags;variations.attribute;variation_options;author;manufacturer;geo_point;region;digital_file;course',
    });
  },
  paginated: ({
    type,
    name,
    categories,
    shop_id,
    group_key,
    ...params
  }: Partial<ProductQueryOptions>) => {
    return HttpClient.get<ProductPaginator>(API_ENDPOINTS.PRODUCTS, {
      searchJoin: 'and',
      with: 'shop;type;categories', // Добавляем categories для загрузки категорий
      ...params,
      ...(group_key ? { group_key } : {}), // Добавляем group_key в query параметры
      search: HttpClient.formatSearchParams({
        type,
        name,
        categories,
        shop_id,
      }),
    });
  },
  popular({ shop_id, ...params }: Partial<ProductQueryOptions>) {
    return HttpClient.get<Product[]>(API_ENDPOINTS.POPULAR_PRODUCTS, {
      searchJoin: 'and',
      with: 'type;shop',
      ...params,
      search: HttpClient.formatSearchParams({ shop_id }),
    });
  },
  generateDescription: (data: GenerateDescriptionInput) => {
    return HttpClient.post<any>(API_ENDPOINTS.GENERATE_DESCRIPTION, data);
  },
  // Методы для работы с вариациями в визарде
  saveVariants: (data: { group_key: string; variants: any[] }) => {
    console.log('productClient.saveVariants - calling API', {
      group_key: data.group_key,
      variants_count: data.variants.length,
    });
    return HttpClient.post<any>('products/wizard/variants', data);
  },
  getVariants: (params: { group_key: string }) => {
    return HttpClient.get<any>('products/wizard/variants', params);
  },
  deleteVariant: (id: string | number) => {
    return HttpClient.delete<any>(`products/wizard/variants/${id}`);
  },
  ungroupProducts: (data: { group_key: string; shop_id: number }) => {
    console.log('productClient.ungroupProducts - calling API', {
      group_key: data.group_key,
      shop_id: data.shop_id,
    });
    return HttpClient.post<any>('products/wizard/ungroup', data);
  },
};
