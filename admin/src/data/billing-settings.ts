import { useQuery, useMutation, useQueryClient } from 'react-query';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';
import { billingSettingsClient } from '@/data/client/billing-settings';
import { toast } from 'react-toastify';
import { useTranslation } from 'next-i18next';

export interface BillingSettings {
  price_per_product: number;
  currency: string;
  auto_generation: boolean;
  generation_day: number;
  days_before_overdue: number;
  overdue_action: 'hide_products' | 'block_adding';
}

export interface BillingSettingsResponse {
  success: boolean;
  data: BillingSettings;
}

export const useBillingSettingsQuery = () => {
  const { data, error, isLoading, refetch } = useQuery<BillingSettingsResponse, Error>(
    [API_ENDPOINTS.ADMIN_BILLING_SETTINGS],
    () => billingSettingsClient.get(),
    {
      retry: 1,
    }
  );

  return {
    settings: data?.data,
    isLoading,
    error,
    refetch,
  };
};

export const useUpdateBillingSettingsMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<{ success: boolean; message: string }, Error, BillingSettings>(
    (data) => billingSettingsClient.update(data),
    {
      onSuccess: () => {
        toast.success(t('common:successfully-updated'));
        queryClient.invalidateQueries([API_ENDPOINTS.ADMIN_BILLING_SETTINGS]);
      },
      onError: (error: any) => {
        toast.error(
          error?.response?.data?.message || t('common:error-updating-settings')
        );
      },
    }
  );
};



