import { HttpClient } from './http-client';
import { API_ENDPOINTS } from './api-endpoints';

export const billingSettingsClient = {
  get: () => {
    return HttpClient.get<any>(`${API_ENDPOINTS.ADMIN_BILLING_SETTINGS}`);
  },
  update: (data: any) => {
    return HttpClient.post<any>(`${API_ENDPOINTS.ADMIN_BILLING_SETTINGS}`, data);
  },
};



