import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import { usePlansQuery, Plan } from '@/data/plan';
import { useSubscriptionQuery, useSubscribeMutation } from '@/data/plan-subscription';
import { useBillingInfoQuery } from '@/data/billing-info';
import Loader from '@/components/ui/loader/loader';
import ErrorMessage from '@/components/ui/error-message';
import PlanSwitchModal from './plan-switch-modal';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface PlansGridProps {
  sellerId?: number;
}

export default function PlansGrid({ sellerId }: PlansGridProps) {
  const { plans, isLoading: plansLoading, error: plansError } = usePlansQuery();
  const { billingInfo, isLoading: billingLoading, error: billingError } = useBillingInfoQuery(sellerId);
  const { mutate: subscribe, isLoading: isSubscribing } = useSubscribeMutation();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  if (plansLoading || billingLoading) {
    return (
      <Card className="mt-8 p-6">
        <Loader text="Загрузка тарифов..." />
      </Card>
    );
  }

  if (plansError || billingError) {
    return (
      <Card className="mt-8 p-6">
        <ErrorMessage message={plansError?.message || billingError?.message || 'Ошибка при загрузке тарифов'} />
      </Card>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <Card className="mt-8 p-6">
        <p className="text-body text-center">Тарифные планы не найдены</p>
      </Card>
    );
  }

  // Используем ту же логику, что и в MyPlanCard - берем текущий план из billingInfo
  const currentPlanId = billingInfo?.plan?.id;

  const planFeatures = {
    Free: {
      description: 'Бесплатный тариф для старта и тестирования платформы',
      features: [
        { label: 'Фото на товар', value: '5' },
        { label: 'Магазин', value: '✖' },
        { label: 'Ссылка на Ozon/WB', value: '✖' },
        { label: 'Аналитика', value: '✖' },
        { label: 'Приоритет в поиске', value: '✖' },
        { label: 'Поддержка', value: 'Базовая' },
      ],
      suitable: 'Подходит для: новичков, тестирования, первых шагов.',
    },
    Standard: {
      description: 'Оптимальный тариф для большинства продавцов',
      features: [
        { label: 'Фото на товар', value: '5' },
        { label: 'Магазин', value: '✔' },
        { label: 'Ссылка на Ozon/WB', value: '✖' },
        { label: 'Аналитика', value: 'Базовая' },
        { label: 'Приоритет в поиске', value: 'Слабый' },
        { label: 'Поддержка', value: 'Стандарт' },
      ],
      suitable: 'Подходит для: активных продавцов, небольших брендов, мастеров.',
    },
    Pro: {
      description: 'Максимум возможностей при небольшой цене',
      features: [
        { label: 'Фото на товар', value: '5' },
        { label: 'Магазин', value: '✔ (расширенный)' },
        { label: 'Ссылка на Ozon/WB', value: '✔' },
        { label: 'UTM-метки', value: '✔' },
        { label: 'Аналитика', value: 'Расширенная' },
        { label: 'Приоритет в поиске', value: 'Высокий' },
        { label: 'Попадание в подборки', value: '✔' },
        { label: 'Поддержка', value: '24/7' },
      ],
      suitable: 'Подходит для: брендов, масштабирования, активных продаж.',
    },
  };

  const getPlanColor = (planName: string) => {
    switch (planName) {
      case 'Free':
        return 'text-green-400';
      case 'Standard':
        return 'text-blue-400';
      case 'Pro':
        return 'text-red-400';
      default:
        return 'text-heading';
    }
  };

  return (
    <Card className="mt-8">
      <h2 className="text-2xl font-bold text-heading mb-6">Тарифы</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {plans?.map((plan) => {
          // Определяем, является ли этот тариф текущим
          // Используем ту же логику, что и в MyPlanCard - просто проверяем plan_id
          const isCurrentPlan = currentPlanId === plan.id;
          const planInfo = planFeatures[plan.name as keyof typeof planFeatures] || planFeatures.Free;

          return (
            <Card key={plan.id} className="p-6 hover:scale-105 transition-transform">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`text-2xl font-bold ${getPlanColor(plan.name)}`}>
                    {plan.name.toUpperCase()}
                  </h3>
                  {isCurrentPlan && (
                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                      Текущий
                    </span>
                  )}
                </div>

                <p className="text-sm text-body">{planInfo.description}</p>

                <div className="space-y-2 text-sm mt-4">
                  <div className="flex justify-between">
                    <span className="text-body">Стоимость</span>
                    <strong className="text-heading">{plan.price} ₽ / мес</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-body">Лимит товаров</span>
                    <strong className="text-heading">
                      {plan.limit_products > 0 ? plan.limit_products : 'Безлимит'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-body">Лимит плейсов</span>
                    <strong className="text-heading">
                      {plan.limit_playlists > 0 ? plan.limit_playlists : 'Безлимит'}
                    </strong>
                  </div>
                  {plan.extra_product_price && (
                    <div className="flex justify-between">
                      <span className="text-body">Доп. товар</span>
                      <strong className="text-heading">+{plan.extra_product_price} ₽</strong>
                    </div>
                  )}
                  {plan.extra_playlist_price && (
                    <div className="flex justify-between">
                      <span className="text-body">Доп. плейс</span>
                      <strong className="text-heading">+{plan.extra_playlist_price} ₽</strong>
                    </div>
                  )}

                  {planInfo.features.map((feature, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-body">{feature.label}</span>
                      <span className="text-heading">{feature.value}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-body mt-4">{planInfo.suitable}</p>

                <div className="mt-4">
                  {isCurrentPlan ? (
                    <Button disabled className="w-full">
                      Подключен
                    </Button>
                  ) : !billingInfo?.can_switch_plan ? (
                    <Button disabled className="w-full">
                      Тариф не доступен
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setSwitchError(null);
                        setModalOpen(true);
                      }}
                      disabled={isSubscribing}
                    >
                      Перейти на тариф
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <PlanSwitchModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedPlan(null);
          setSwitchError(null);
        }}
        onConfirm={() => {
          if (!selectedPlan) {
            setModalOpen(false);
            return;
          }
          
          subscribe(
            { plan_id: selectedPlan.id, payment_method: 'balance' },
            {
              onSuccess: (response) => {
                setModalOpen(false);
                setSelectedPlan(null);
                setSwitchError(null);
                toast.success('Тариф успешно изменен');
                // Обновляем данные
                window.location.reload();
              },
              onError: (error: any) => {
                const errorMessage = error?.response?.data?.message || 'Ошибка при смене тарифа';
                setSwitchError(errorMessage);
                toast.error(errorMessage);
              },
            }
          );
        }}
        currentPlan={billingInfo?.plan || null}
        newPlan={selectedPlan || { id: 0, name: '', price: 0, limit_products: 0, limit_playlists: 0, extra_product_price: null, extra_playlist_price: null, link_ozon_wb: false, utm_tracking: null, chat_enabled: null, featured_collections: null }}
        isLoading={isSubscribing}
        canSwitch={billingInfo?.can_switch_plan ?? true}
        switchError={switchError}
      />
    </Card>
  );
}




