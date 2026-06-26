import { useQuery, useMutation, useQueryClient } from 'react-query';
import { HttpClient } from '@/data/client/http-client';

export interface ProSubscriptionStatus {
  has_active: boolean;
  subscription: {
    id: number;
    start_date: string;
    end_date: string;
    days_remaining: number;
    status: string;
  } | null;
}

export interface ProSubscriptionResponse {
  success: boolean;
  data: ProSubscriptionStatus;
  message?: string;
}

export interface SubscribeResponse {
  success: boolean;
  message: string;
  payment_url?: string;
  payment_id?: string;
  subscription_id?: number;
  data?: {
    subscription: any;
    balance?: {
      old: number;
      new: number;
      spent: number;
    };
  };
}

export function useProSubscriptionStatusQuery() {
  const { data, error, isLoading, refetch } = useQuery<ProSubscriptionResponse, Error>(
    ['pro-subscription', 'status'],
    () => HttpClient.get<ProSubscriptionResponse>(`/api/pro-subscription/status`),
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

export function useSubscribeProMutation() {
  const queryClient = useQueryClient();
  
  return useMutation<SubscribeResponse, Error, { payment_method: 'balance' | 'yookassa' }>(
    (data) => HttpClient.post<SubscribeResponse>(`/api/pro-subscription/subscribe`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pro-subscription']);
      },
    }
  );
}

