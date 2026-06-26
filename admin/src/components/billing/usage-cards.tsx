import Card from '@/components/common/card';
import { useBillingInfoQuery } from '@/data/billing-info';
import Loader from '@/components/ui/loader/loader';
import ErrorMessage from '@/components/ui/error-message';

interface UsageCardsProps {
  sellerId?: number;
}

export default function UsageCards({ sellerId }: UsageCardsProps) {
  const { billingInfo, isLoading, error } = useBillingInfoQuery(sellerId);

  if (isLoading) {
    return <Loader text="Загрузка данных..." />;
  }

  if (error) {
    return <ErrorMessage message="Ошибка при загрузке данных" />;
  }

  if (!billingInfo) {
    return null;
  }

  const { current_usage, plan } = billingInfo;

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-8">
      {/* Всего товаров */}
      <Card className="p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-heading">Всего товаров</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">
              {current_usage.total_products}
            </span>
            {plan.limit_products > 0 && (
              <span className="text-sm text-body">
                / {plan.limit_products}
                {current_usage.products_over_limit > 0 && (
                  <span className="text-red-500 ml-1">
                    (+{current_usage.products_over_limit})
                  </span>
                )}
              </span>
            )}
          </div>
          {plan.limit_products > 0 && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    (current_usage.total_products / plan.limit_products) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          )}
          {current_usage.products_over_limit > 0 && (
            <p className="text-sm text-red-500">
              Превышение лимита: {current_usage.products_over_limit} товаров
            </p>
          )}
        </div>
      </Card>

      {/* Всего плейсов */}
      <Card className="p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-heading">Всего плейсов</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">
              {current_usage.total_playlists}
            </span>
            {plan.limit_playlists > 0 && (
              <span className="text-sm text-body">
                / {plan.limit_playlists}
                {current_usage.playlists_over_limit > 0 && (
                  <span className="text-red-500 ml-1">
                    (+{current_usage.playlists_over_limit})
                  </span>
                )}
              </span>
            )}
          </div>
          {plan.limit_playlists > 0 && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    (current_usage.total_playlists / plan.limit_playlists) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          )}
          {current_usage.playlists_over_limit > 0 && (
            <p className="text-sm text-red-500">
              Превышение лимита: {current_usage.playlists_over_limit} плейсов
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}




