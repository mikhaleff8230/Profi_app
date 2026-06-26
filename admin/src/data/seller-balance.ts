import { useQuery, useMutation, useQueryClient } from 'react-query';
import { HttpClient } from '@/data/client/http-client';
import { adminAndOwnerOnly, getAuthCredentials, hasAccess } from '@/utils/auth-utils';
import { toast } from 'react-toastify';

export interface SellerBalance {
  balance: number;
  total_deposited: number;
  total_spent: number;
}

export interface BalanceResponse {
  success: boolean;
  data: SellerBalance;
}

export interface DepositRequest {
  amount: number;
  payment_method: 'yookassa';
}

export interface DepositResponse {
  success: boolean;
  message: string;
  data?: {
    payment_url?: string;
    payment_id?: string;
    amount?: number;
  };
  payment_url?: string;
  payment_id?: string;
  amount?: number;
}

export const useSellerBalanceQuery = () => {
  const { token, permissions } = getAuthCredentials();
  const enabled = !!token && hasAccess(adminAndOwnerOnly, permissions);

  const { data, error, isLoading, refetch } = useQuery<BalanceResponse, Error>(
    ['seller-balance'],
    () => HttpClient.get<BalanceResponse>(`/seller/balance`),
    {
      enabled,
      retry: false,
    }
  );

  return {
    balance: data?.data,
    isLoading,
    error,
    refetch,
  };
};

export const useDepositMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<DepositResponse, Error, DepositRequest>(
    (data) => HttpClient.post<DepositResponse>(`/seller/balance/deposit`, data),
    {
      onSuccess: (response) => {
        // Проверяем payment_url в корне ответа или в data
        const paymentUrl = response.payment_url || response.data?.payment_url;
        
        if (response.success && paymentUrl) {
          // Редирект на страницу оплаты
          window.location.href = paymentUrl;
        } else if (response.success) {
          toast.success(response.message || 'Баланс успешно пополнен');
          queryClient.invalidateQueries(['seller-balance']);
        } else {
          toast.error(response.message || 'Ошибка при пополнении баланса');
        }
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Ошибка при пополнении баланса');
      },
    }
  );
};

export interface CheckPendingResponse {
  success: boolean;
  data: {
    has_pending: boolean;
    processed?: boolean;
    amount?: number;
    old_balance?: number;
    new_balance?: number;
    status?: string;
    message: string;
  };
}

export const useCheckPendingDeposit = () => {
  const queryClient = useQueryClient();

  return useMutation<CheckPendingResponse, Error, void>(
    () => HttpClient.get<CheckPendingResponse>(`/seller/balance/check-pending`),
    {
      onSuccess: (response) => {
        if (response.success && response.data.processed) {
          toast.success(`✅ Баланс пополнен на ${response.data.amount} ₽`);
          queryClient.invalidateQueries(['seller-balance']);
        }
      },
      onError: (error: any) => {
        // Не показываем ошибку, так как это проверка статуса
        console.error('Ошибка при проверке статуса пополнения:', error);
      },
    }
  );
};

export interface VirtualDepositRequest {
  seller_id: number;
  amount: number;
}

export interface VirtualDepositResponse {
  success: boolean;
  message: string;
  data?: {
    seller_id: number;
    amount: number;
    old_balance: number;
    new_balance: number;
    deposit_id: number;
  };
}

export const useVirtualDepositMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<VirtualDepositResponse, Error, VirtualDepositRequest>(
    (data) => HttpClient.post<VirtualDepositResponse>(`/api/admin/seller/balance/virtual-deposit`, data),
    {
      onSuccess: (response) => {
        if (response.success) {
          toast.success(response.message || `Баланс успешно пополнен на ${response.data?.amount} ₽`);
          queryClient.invalidateQueries(['seller-balance']);
        } else {
          toast.error(response.message || 'Ошибка при пополнении баланса');
        }
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Ошибка при виртуальном пополнении баланса');
      },
    }
  );
};




