import Card from '@/components/common/card';
import Loader from '@/components/ui/loader/loader';
import ErrorMessage from '@/components/ui/error-message';
import { useBillingInfoQuery } from '@/data/billing-info';

interface MyPlanCardProps {
  sellerId?: number;
}

export default function MyPlanCard({ sellerId }: MyPlanCardProps) {
  const { billingInfo, isLoading, error } = useBillingInfoQuery(sellerId);

  if (isLoading) {
    return (
      <Card className="mb-8">
        <Loader text="Загрузка информации о тарифе..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-8">
        <ErrorMessage message="Ошибка при загрузке информации о тарифе" />
      </Card>
    );
  }

  if (!billingInfo) {
    return null;
  }

  const { plan, current_usage, next_payment, last_payment } = billingInfo;

  return (
    <Card className="mb-8">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-heading mb-6">Мой тариф</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Информация о тарифе */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-heading mb-3">
                Тариф: <span className="text-primary">{plan.name}</span>
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-body">Базовая стоимость:</span>
                  <span className="font-medium text-heading">{plan.price} ₽ / мес</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body">Лимит товаров:</span>
                  <span className="font-medium text-heading">
                    {plan.limit_products > 0 ? plan.limit_products : 'Безлимит'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body">Лимит плейсов:</span>
                  <span className="font-medium text-heading">
                    {plan.limit_playlists > 0 ? plan.limit_playlists : 'Безлимит'}
                  </span>
                </div>
                {plan.extra_product_price && (
                  <div className="flex items-center justify-between">
                    <span className="text-body">Доп. товар:</span>
                    <span className="font-medium text-heading">{plan.extra_product_price} ₽</span>
                  </div>
                )}
                {plan.extra_playlist_price && (
                  <div className="flex items-center justify-between">
                    <span className="text-body">Доп. плейс:</span>
                    <span className="font-medium text-heading">{plan.extra_playlist_price} ₽ / мес</span>
                  </div>
                )}
              </div>
            </div>

            {/* Функции тарифа */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-heading mb-2">Доступные функции:</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className={plan.link_ozon_wb ? 'text-green-500' : 'text-gray-400'}>
                    {plan.link_ozon_wb ? '✓' : '✗'}
                  </span>
                  <span className={plan.link_ozon_wb ? 'text-body' : 'text-gray-400'}>
                    Ссылка на Ozon/WB
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={plan.utm_tracking ? 'text-green-500' : 'text-gray-400'}>
                    {plan.utm_tracking ? '✓' : '✗'}
                  </span>
                  <span className={plan.utm_tracking ? 'text-body' : 'text-gray-400'}>
                    UTM-метки
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={plan.chat_enabled ? 'text-green-500' : 'text-gray-400'}>
                    {plan.chat_enabled ? '✓' : '✗'}
                  </span>
                  <span className={plan.chat_enabled ? 'text-body' : 'text-gray-400'}>
                    Доступ к чату
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={plan.featured_collections ? 'text-green-500' : 'text-gray-400'}>
                    {plan.featured_collections ? '✓' : '✗'}
                  </span>
                  <span className={plan.featured_collections ? 'text-body' : 'text-gray-400'}>
                    Попадание в подборки
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Текущее использование и следующий платеж */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-heading mb-3">Текущее использование</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-body">Товаров:</span>
                  <span className="font-medium text-heading">
                    {current_usage.total_products}
                    {plan.limit_products > 0 && (
                      <span className="text-gray-500 ml-1">
                        / {plan.limit_products}
                        {current_usage.products_over_limit > 0 && (
                          <span className="text-red-500 ml-1">
                            (+{current_usage.products_over_limit})
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body">Плейсов:</span>
                  <span className="font-medium text-heading">
                    {current_usage.total_playlists}
                    {plan.limit_playlists > 0 && (
                      <span className="text-gray-500 ml-1">
                        / {plan.limit_playlists}
                        {current_usage.playlists_over_limit > 0 && (
                          <span className="text-red-500 ml-1">
                            (+{current_usage.playlists_over_limit})
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Следующий платеж */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-heading mb-3">Следующий платеж</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-body">Дата следующего платежа:</span>
                  <span className="font-medium text-heading">{next_payment.date_formatted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body">Период:</span>
                  <span className="font-medium text-heading">
                    {new Date(next_payment.period_start).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(next_payment.period_end).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-body">Базовая стоимость:</span>
                    <span className="font-medium text-heading">{next_payment.base_price} ₽</span>
                  </div>
                  {next_payment.breakdown.extra_products.count > 0 && (
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-body text-xs">
                        Доп. товары ({next_payment.breakdown.extra_products.count} шт.):
                      </span>
                      <span className="font-medium text-heading text-xs">
                        {next_payment.breakdown.extra_products.total} ₽
                      </span>
                    </div>
                  )}
                  {next_payment.breakdown.extra_playlists.count > 0 && (
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-body text-xs">
                        Доп. плейсы ({next_payment.breakdown.extra_playlists.count} шт.,{' '}
                        {next_payment.breakdown.extra_playlists.days_remaining} дн.):
                      </span>
                      <span className="font-medium text-heading text-xs">
                        {next_payment.breakdown.extra_playlists.total} ₽
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <span className="text-body font-semibold">Сумма платежа:</span>
                    <span className="font-bold text-lg text-primary">
                      {next_payment.total_amount} ₽
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Последний платеж */}
            {last_payment && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-body">Последний платеж:</span>
                  <span className="font-medium text-heading">
                    {last_payment.date_formatted} - {last_payment.amount} ₽
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

