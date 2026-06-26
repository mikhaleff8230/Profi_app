import { useQuery } from 'react-query';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';
import { HttpClient } from '@/data/client/http-client';

export interface Plan {
  id: number;
  name: string;
  price: number;
  limit_products: number;
  limit_playlists: number;
  extra_product_price: number | null;
  extra_playlist_price: number | null;
  link_ozon_wb: boolean;
  utm_tracking: boolean | null;
  chat_enabled: boolean | null;
  featured_collections: boolean | null;
}

export interface CurrentUsage {
  total_products: number;
  total_playlists: number;
  products_within_limit: number;
  products_over_limit: number;
  playlists_within_limit: number;
  playlists_over_limit: number;
}

export interface NextPayment {
  date: string;
  date_formatted: string;
  period_start: string;
  period_end: string;
  base_price: number;
  extra_products_cost: number;
  extra_playlists_cost: number;
  total_amount: number;
  breakdown: {
    base_plan: number;
    extra_products: {
      count: number;
      price_per_item: number;
      total: number;
    };
    extra_playlists: {
      count: number;
      price_per_item_per_month: number;
      days_remaining: number;
      total: number;
    };
  };
}

export interface LastPayment {
  date: string;
  date_formatted: string;
  amount: number;
}

export interface BillingInfo {
  plan: Plan;
  current_usage: CurrentUsage;
  next_payment: NextPayment;
  last_payment: LastPayment | null;
  can_switch_plan?: boolean;
}

export interface BillingInfoResponse {
  success: boolean;
  data: BillingInfo;
}

export const useBillingInfoQuery = (sellerId?: number) => {
  const { data, error, isLoading, refetch } = useQuery<BillingInfoResponse, Error>(
    ['billing-info', sellerId],
    () => HttpClient.get<BillingInfoResponse>(`/api/${API_ENDPOINTS.BILLING_CURRENT}`, sellerId ? { seller_id: sellerId } : undefined),
    {
      retry: 1,
    }
  );

  return {
    billingInfo: data?.data,
    isLoading,
    error,
    refetch,
  };
};

