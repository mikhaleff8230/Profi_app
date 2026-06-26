import { useQuery } from 'react-query';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';
import { billingShopClient } from './client/billing-shop';
import { mapPaginatorData } from '@/utils/data-mappers';

export interface ShopBillingData {
  id: number;
  name: string;
  slug: string;
  logo: any;
  owner: {
    id: number;
    name: string;
    email: string;
  };
  is_active: boolean;
  billing: {
    active_products: number;
    current_invoice: {
      id: number;
      period_start: string;
      period_end: string;
      total_products: number;
      total_amount: number;
      status: string;
      created_at: string;
    } | null;
    last_paid_invoice: {
      id: number;
      paid_at: string;
      total_amount: number;
    } | null;
    unpaid_invoices_count: number;
    upcoming_payment: number;
  };
  created_at: string;
}

export interface ShopBillingPaginator {
  data: ShopBillingData[];
  paginatorInfo: any;
}

export interface ShopBillingResponse {
  success: boolean;
  data: {
    data: ShopBillingData[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
    path: string;
    from: number;
    to: number;
  };
}

export const useShopsBillingQuery = (params?: any) => {
  const { data, error, isLoading } = useQuery<ShopBillingResponse, Error>(
    [API_ENDPOINTS.ADMIN_BILLING_SHOPS, params],
    () => billingShopClient.all(params),
    {
      keepPreviousData: true,
    }
  );

  return {
    shops: data?.data?.data ?? [],
    paginatorInfo: mapPaginatorData(data?.data),
    error,
    loading: isLoading,
  };
};

