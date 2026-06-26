import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { useTranslation } from 'next-i18next';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';
import { invoiceClient } from './client/invoice';

export interface Invoice {
  id: number;
  seller_id: number;
  period_start: string;
  period_end: string;
  total_products: number;
  price_per_product: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
  seller?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface InvoiceResponse {
  success: boolean;
  data: Invoice[];
}

export interface PayInvoiceResponse {
  success: boolean;
  payment_url: string;
  payment_id: string;
  invoice_id: number;
}

export const useInvoicesQuery = (sellerId?: number) => {
  const { data, error, isLoading, refetch } = useQuery<InvoiceResponse, Error>(
    [API_ENDPOINTS.INVOICES, sellerId],
    () => invoiceClient.all(sellerId ? { seller_id: sellerId } : undefined),
    {
      retry: 1,
      select: (response) => {
        // Преобразуем строковые значения в числа
        if (response?.data) {
          return {
            ...response,
            data: response.data.map((invoice: any) => ({
              ...invoice,
              total_amount: typeof invoice.total_amount === 'string' 
                ? Number(invoice.total_amount) || 0 
                : (invoice.total_amount || 0),
              price_per_product: typeof invoice.price_per_product === 'string'
                ? Number(invoice.price_per_product) || 0
                : (invoice.price_per_product || 0),
              total_products: typeof invoice.total_products === 'string'
                ? Number(invoice.total_products) || 0
                : (invoice.total_products || 0),
            })),
          };
        }
        return response;
      },
    }
  );

  return {
    invoices: data?.data ?? [],
    isLoading,
    error,
    refetch,
  };
};

export const usePayInvoiceMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<PayInvoiceResponse, Error, number>(
    (invoiceId) => invoiceClient.pay(invoiceId),
    {
      onSuccess: (data) => {
        if (data.payment_url) {
          window.location.href = data.payment_url;
        } else {
          toast.error(t('common:error-payment-creation'));
        }
      },
      onError: (error: any) => {
        toast.error(
          error?.response?.data?.message || t('common:error-payment-failed')
        );
      },
      onSettled: () => {
        queryClient.invalidateQueries([API_ENDPOINTS.INVOICES]);
      },
    }
  );
};

