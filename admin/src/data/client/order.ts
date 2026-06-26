import {
  Order,
  CreateOrderInput,
  OrderQueryOptions,
  OrderPaginator,
  QueryOptions,
  InvoiceTranslatedText,
  GenerateInvoiceDownloadUrlInput,
} from '@/types';
import { API_ENDPOINTS } from './api-endpoints';
import { crudFactory } from './curd-factory';
import { HttpClient } from './http-client';

export const orderClient = {
  ...crudFactory<Order, QueryOptions, CreateOrderInput>(API_ENDPOINTS.ORDERS),
  get: ({ id, language }: { id: string; language: string }) => {
    return HttpClient.get<Order>(`${API_ENDPOINTS.ORDERS}/${id}`, {
      language,
    });
  },
  paginated: ({ tracking_number, shop_id, ...params }: Partial<OrderQueryOptions>) => {
    // Логируем параметры запроса для отладки
    if (typeof window !== 'undefined') {
      console.log('[OrderClient] Запрос заказов:', {
        shop_id,
        tracking_number,
        otherParams: params,
      });
    }
    
    const requestParams: any = {
      searchJoin: 'and',
      ...params,
      search: HttpClient.formatSearchParams({ tracking_number }),
    };
    
    // Явно добавляем shop_id, если он передан
    if (shop_id !== undefined && shop_id !== null) {
      requestParams.shop_id = shop_id;
    }
    
    return HttpClient.get<OrderPaginator>(API_ENDPOINTS.ORDERS, requestParams);
  },
  downloadInvoice: (input: GenerateInvoiceDownloadUrlInput) => {
    return HttpClient.post<string>(
      `${API_ENDPOINTS.ORDER_INVOICE_DOWNLOAD}`,
      input
    );
  },
};
