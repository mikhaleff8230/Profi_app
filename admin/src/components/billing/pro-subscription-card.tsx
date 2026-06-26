import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import { useProSubscriptionStatusQuery, useSubscribeProMutation } from '@/data/pro-subscription';
import Loader from '@/components/ui/loader/loader';
import ErrorMessage from '@/components/ui/error-message';
import { toast } from 'react-toastify';
import { useState } from 'react';

interface ProSubscriptionCardProps {
  sellerId?: number;
}

export default function ProSubscriptionCard({ sellerId }: ProSubscriptionCardProps) {
  const { data, isLoading, error, refetch } = useProSubscriptionStatusQuery();
  const subscribeMutation = useSubscribeProMutation();
  const [isSubscribing, setIsSubscribing] = useState(false);

  if (isLoading) {
    return (
      <Card className="mt-8 p-6">
        <Loader text="Загрузка информации о подписке..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-8 p-6">
        <ErrorMessage message={error?.message || "Ошибка при загрузке информации о подписке"} />
      </Card>
    );
  }

  const subscriptionData = data?.data;
  const hasActive = subscriptionData?.has_active ?? false;
  const subscriptionInfo = subscriptionData?.subscription;

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const result = await subscribeMutation.mutateAsync({ payment_method: 'balance' });
      
      if (result.success) {
        if (result.payment_url) {
          // Редирект на оплату через YooKassa
          window.location.href = result.payment_url;
        } else {
          toast.success('Подписка PRO успешно подключена!');
          refetch();
        }
      } else {
        toast.error(result.message || 'Ошибка при подключении подписки');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Ошибка при подключении подписки');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <Card className="mt-8 p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-heading">Подписка PRO</h2>
          {hasActive && (
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
              Активна
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-body">Стоимость:</span>
            <strong className="text-heading text-lg">249 ₽ / 30 дней</strong>
          </div>

          {hasActive && subscriptionInfo && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-body">Дата окончания:</span>
                <strong className="text-heading">
                  {new Date(subscriptionInfo.end_date).toLocaleDateString('ru-RU')}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body">Осталось дней:</span>
                <strong className="text-heading text-primary">
                  {subscriptionInfo.days_remaining} дней
                </strong>
              </div>
            </>
          )}

          {!hasActive && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-body mb-4">
                Подписка PRO предоставляет доступ к расширенным функциям, включая ссылки на маркетплейсы Ozon и Wildberries.
              </p>
              <Button
                onClick={handleSubscribe}
                loading={isSubscribing || subscribeMutation.isLoading}
                disabled={isSubscribing || subscribeMutation.isLoading}
                className="w-full"
              >
                Подключить подписку PRO
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

