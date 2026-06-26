import { useQuery, useMutation, useQueryClient } from 'react-query';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';
import { HttpClient } from '@/data/client/http-client';
import { toast } from 'react-toastify';

export interface PlanSubscription {
  id: number;
  seller_id: number;
  plan_id: number;
  start_date: string;
  end_date: string;
  amount: number;
  is_proportional: boolean;
  days_paid: number | null;
  status: 'active' | 'expired' | 'cancelled';
  invoice_id: number | null;
  auto_renewal_at: string | null;
  auto_renewal_enabled: boolean;
  plan?: {
    id: number;
    name: string;
    price: number;
  };
}

export interface SubscriptionResponse {
  success: boolean;
  data: {
    subscription: PlanSubscription | null;
    plan: {
      id: number;
      name: string;
    } | null;
    balance: {
      amount: number;
      total_deposited: number;
      total_spent: number;
    };
  };
}

export interface SubscribeRequest {
  plan_id: number;
  payment_method: 'balance' | 'yookassa';
}

export interface SubscribeResponse {
  success: boolean;
  message: string;
  data?: {
    subscription?: PlanSubscription;
    balance?: number;
    payment_url?: string;
    payment_id?: string;
    subscription_id?: number;
  };
}

export const useSubscriptionQuery = () => {
  const { data, error, isLoading, refetch } = useQuery<SubscriptionResponse, Error>(
    ['plan-subscription'],
    () => HttpClient.get<SubscriptionResponse>(`/api/plan/subscription`),
    {
      retry: 1,
    }
  );

  return {
    subscription: data?.data,
    isLoading,
    error,
    refetch,
  };
};

export const useSubscribeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<SubscribeResponse, Error, SubscribeRequest>(
    (data) => HttpClient.post<SubscribeResponse>(`/api/plan/subscribe`, data),
    {
      onSuccess: (response) => {
        if (response.data?.payment_url) {
          // Редирект на страницу оплаты
          window.location.href = response.data.payment_url;
        } else {
          toast.success(response.message || 'Тариф успешно подключен');
          queryClient.invalidateQueries(['plan-subscription']);
          queryClient.invalidateQueries(['billing-info']);
        }
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Ошибка при подключении тарифа');
      },
    }
  );
};

