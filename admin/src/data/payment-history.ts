import { useQuery } from 'react-query';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';
import { HttpClient } from '@/data/client/http-client';

export interface PaymentHistoryItem {
  id: number;
  type: 'balance_deposit' | 'invoice';
  owner_name: string;
  shop_name: string;
  amount: number;
  date: string;
  date_formatted: string;
}

export interface PaymentHistoryResponse {
  success: boolean;
  data: PaymentHistoryItem[];
}

export const usePaymentHistoryQuery = () => {
  const { data, error, isLoading, refetch } = useQuery<PaymentHistoryResponse, Error>(
    ['payment-history'],
    () => HttpClient.get<PaymentHistoryResponse>(`/api/${API_ENDPOINTS.PAYMENT_HISTORY}`),
    {
      retry: 1,
    }
  );

  return {
    payments: data?.data ?? [],
    isLoading,
    error,
    refetch,
  };
};

