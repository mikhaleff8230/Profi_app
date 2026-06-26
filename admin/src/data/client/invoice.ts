import { HttpClient } from './http-client';
import { API_ENDPOINTS } from './api-endpoints';

export const invoiceClient = {
  all: (params?: { seller_id?: number }) => {
    return HttpClient.get<any>(`/api/${API_ENDPOINTS.INVOICES}`, params);
  },
  pay: (invoiceId: number) => {
    return HttpClient.post<any>(`/api/${API_ENDPOINTS.INVOICES}/${invoiceId}/pay`, {});
  },
};

