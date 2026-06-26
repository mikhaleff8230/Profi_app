import Card from '@/components/common/card';
import ShopLayout from '@/components/layouts/shop';
import { Fragment, useState, useEffect } from 'react';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { useInvoicesQuery } from '@/data/invoice';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Button from '@/components/ui/button';
import { useRouter } from 'next/router';
import { adminAndOwnerOnly } from '@/utils/auth-utils';
import { useShopQuery } from '@/data/shop';
import {
  adminOnly,
  getAuthCredentials,
  hasAccess,
} from '@/utils/auth-utils';
import { Routes } from '@/config/routes';
import { useMeQuery } from '@/data/user';
import { toast } from 'react-toastify';
import BalanceHeader from '@/components/billing/balance-header';
import ProSubscriptionCard from '@/components/billing/pro-subscription-card';
import { useCheckPendingDeposit, useSellerBalanceQuery } from '@/data/seller-balance';
import { useProSubscriptionStatusQuery } from '@/data/pro-subscription';

// Format date helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export default function ShopBillingPage() {
  const router = useRouter();
  const { permissions } = getAuthCredentials();
  const { data: me } = useMeQuery();
  const { t } = useTranslation();
  const {
    query: { shop },
  } = router;
  const { data: shopData, isLoading: fetchingShop } = useShopQuery(
    {
      slug: shop as string,
    },
    {
      enabled: !!shop,
    }
  );
  const shopId = shopData?.id;
  const ownerId = shopData?.owner?.id;
  const isSuperAdmin = hasAccess(adminOnly, permissions);
  
  // Для супер-админа получаем счета владельца магазина, для продавца - свои счета
  const { invoices, isLoading, error, refetch } = useInvoicesQuery(
    isSuperAdmin && ownerId ? ownerId : undefined
  );

  const { refetch: refetchBalance } = useSellerBalanceQuery();
  const checkPendingMutation = useCheckPendingDeposit();
  const { refetch: refetchSubscription } = useProSubscriptionStatusQuery();

  // Проверяем параметр успешной оплаты
  useEffect(() => {
    // Проверяем пополнение баланса
    if (router.query.deposit === 'success') {
      // Проверяем статус последнего pending пополнения и обрабатываем, если оплачено
      checkPendingMutation.mutate(undefined, {
        onSuccess: () => {
          refetchBalance();
        }
      });

      // Показываем уведомление
      toast.success('✅ Платеж успешно выполнен! Проверяем пополнение баланса...', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          backgroundColor: '#10b981',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
      
      // Убираем параметр из URL
      setTimeout(() => {
        router.replace(`/${shop}/billing`, undefined, { shallow: true });
      }, 100);
    } else if (router.query.deposit === 'failed') {
      // Показываем уведомление об ошибке оплаты
      toast.error('❌ Ошибка при выполнении платежа. Попробуйте еще раз.', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Убираем параметр из URL
      router.replace(`/${shop}/billing`, undefined, { shallow: true });
    } else if (router.query.payment === 'success') {
      // Показываем уведомление об успешной оплате
      toast.success('✅ Платеж успешно выполнен! Счет оплачен.', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          backgroundColor: '#10b981',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
      
      // Обновляем список счетов
      refetch();
      
      // Убираем параметр из URL через небольшую задержку, чтобы пользователь увидел уведомление
      setTimeout(() => {
        router.replace(`/${shop}/billing`, undefined, { shallow: true });
      }, 100);
    } else if (router.query.payment === 'failed') {
      // Показываем уведомление об ошибке оплаты
      toast.error('❌ Ошибка при выполнении платежа. Попробуйте еще раз.', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Убираем параметр из URL
      router.replace(`/${shop}/billing`, undefined, { shallow: true });
    } else if (router.query.subscription === 'success') {
      // Показываем уведомление об успешной оплате подписки
      toast.success('✅ Подписка PRO успешно подключена!', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          backgroundColor: '#10b981',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
      
      // Обновляем данные подписки
      refetchSubscription();
      
      // Убираем параметр из URL
      setTimeout(() => {
        router.replace(`/${shop}/billing`, undefined, { shallow: true });
      }, 100);
    } else if (router.query.subscription === 'failed') {
      // Показываем уведомление об ошибке оплаты подписки
      toast.error('❌ Ошибка при оплате подписки. Попробуйте еще раз.', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Убираем параметр из URL
      router.replace(`/${shop}/billing`, undefined, { shallow: true });
    }
  }, [router.query, refetch, router, shop, refetchSubscription]);

  // Проверка доступа после загрузки данных
  useEffect(() => {
    if (shopId && me && !fetchingShop) {
      const hasShopAccess = me?.shops?.map((s) => s.id).includes(shopId) || me?.managed_shop?.id == shopId;
      if (
        !hasAccess(adminOnly, permissions) &&
        !hasShopAccess
      ) {
        router.replace(Routes.dashboard);
      }
    }
  }, [shopId, me, permissions, router, fetchingShop]);

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    const statusLabels: Record<string, string> = {
      pending: 'Ожидает оплаты',
      paid: 'Оплачен',
      overdue: 'Просрочен',
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          statusClasses[status] || statusClasses.pending
        }`}
      >
        {statusLabels[status] || status}
      </span>
    );
  };


  if (isLoading || fetchingShop || !shopData) return <Loader text={t('common:text-loading')} />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <>
      <Card className="mb-8 flex flex-col items-center justify-between md:flex-row">
        <div className="mb-4 shrink-0 md:mb-0 md:w-1/4">
          <h1 className="text-lg font-semibold text-heading">
            {t('common:sidebar-nav-item-balance-payments')}
          </h1>
        </div>
        <div className="flex items-center">
          <BalanceHeader sellerId={isSuperAdmin && ownerId ? ownerId : undefined} />
        </div>
      </Card>

      {/* Подписка PRO */}
      <ProSubscriptionCard sellerId={isSuperAdmin && ownerId ? ownerId : undefined} />

      <Card>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-heading sm:pl-6"
                >
                  Период
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-heading"
                >
                  Товаров
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-heading"
                >
                  Сумма
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-heading"
                >
                  Статус
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-heading"
                >
                  Дата оплаты
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="whitespace-nowrap px-3 py-4 text-sm text-body text-center"
                  >
                    Нет счетов
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-heading sm:pl-6">
                      {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-body">
                      {invoice.total_products}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-heading">
                      {Number(invoice.total_amount).toFixed(2)} ₽
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-body">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-body">
                      {invoice.paid_at ? formatDate(invoice.paid_at) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </>
  );
}

ShopBillingPage.authenticate = {
  permissions: adminAndOwnerOnly,
};
ShopBillingPage.Layout = ShopLayout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});

