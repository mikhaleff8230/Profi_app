import { HttpClient } from './http-client';
import { API_ENDPOINTS } from './api-endpoints';

export const billingShopClient = {
  all: (params?: any) => {
    return HttpClient.get<any>(`${API_ENDPOINTS.ADMIN_BILLING_SHOPS}`, params);
  },
};

