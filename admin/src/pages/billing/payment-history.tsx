import Card from '@/components/common/card';
import Layout from '@/components/layouts/admin';
import { usePaymentHistoryQuery } from '@/data/payment-history';
import Loader from '@/components/ui/loader/loader';
import ErrorMessage from '@/components/ui/error-message';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { adminOnly } from '@/utils/auth-utils';

export default function PaymentHistoryPage() {
  const { payments, isLoading, error } = usePaymentHistoryQuery();
  const { t } = useTranslation();

  if (isLoading) {
    return <Loader text={t('common:text-loading')} />;
  }

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  return (
    <>
      <Card className="mb-8">
        <div className="mb-4 shrink-0 md:mb-0 md:w-1/4">
          <h1 className="text-lg font-semibold text-heading">
            История платежей
          </h1>
        </div>
      </Card>

      <Card>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-heading sm:pl-6"
                >
                  Владелец
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-heading"
                >
                  Магазин
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
                  Дата
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="whitespace-nowrap px-3 py-4 text-sm text-body text-center"
                  >
                    Нет платежей
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={`${payment.type}-${payment.id}`}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-heading sm:pl-6">
                      {payment.owner_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-body">
                      {payment.shop_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-heading">
                      {Number(payment.amount).toFixed(2)} ₽
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-body">
                      {payment.date_formatted}
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

PaymentHistoryPage.authenticate = {
  permissions: adminOnly,
};
PaymentHistoryPage.Layout = Layout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});

