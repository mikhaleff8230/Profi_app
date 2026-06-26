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

export interface PlansResponse {
  success: boolean;
  data: Plan[];
}

export const usePlansQuery = () => {
  const { data, error, isLoading, refetch } = useQuery<PlansResponse, Error>(
    ['plans'],
    () => HttpClient.get<PlansResponse>(`/api/${API_ENDPOINTS.PLANS}`),
    {
      retry: 1,
    }
  );

  return {
    plans: data?.data,
    isLoading,
    error,
    refetch,
  };
};


