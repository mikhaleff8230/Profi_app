import Card from '@/components/common/card';
import Layout from '@/components/layouts/admin';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import { useBillingSettingsQuery, useUpdateBillingSettingsMutation } from '@/data/billing-settings';
import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { adminOnly } from '@/utils/auth-utils';
import Switch from '@/components/ui/switch';
import Select from '@/components/ui/select/select';

export default function BillingSettingsPage() {
  const { t } = useTranslation();
  const { settings, isLoading, error, refetch } = useBillingSettingsQuery();
  const { mutate: updateSettings, isLoading: isUpdating } = useUpdateBillingSettingsMutation();

  const [formData, setFormData] = useState({
    price_per_product: 5.00,
    currency: 'RUB',
    auto_generation: true,
    generation_day: 1,
    days_before_overdue: 7,
    overdue_action: 'hide_products' as 'hide_products' | 'block_adding',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        price_per_product: settings.price_per_product || 5.00,
        currency: settings.currency || 'RUB',
        auto_generation: settings.auto_generation ?? true,
        generation_day: settings.generation_day || 1,
        days_before_overdue: settings.days_before_overdue || 7,
        overdue_action: settings.overdue_action || 'hide_products',
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  if (isLoading) return <Loader text={t('common:text-loading')} />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <>
      <Card className="mb-8 flex flex-col items-center justify-between md:flex-row">
        <div className="mb-4 md:mb-0 md:w-1/4">
          <h1 className="text-xl font-semibold text-heading">
            Настройки биллинга
          </h1>
        </div>
      </Card>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="price_per_product">
                Цена за товар (RUB)
              </Label>
              <Input
                id="price_per_product"
                type="number"
                step="0.01"
                min="0"
                value={formData.price_per_product}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price_per_product: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-2"
              />
              <p className="mt-1 text-sm text-body">
                Цена за размещение одного товара в месяц
              </p>
            </div>

            <div>
              <Label htmlFor="currency">Валюта</Label>
              <Input
                id="currency"
                type="text"
                maxLength={3}
                value={formData.currency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currency: e.target.value.toUpperCase(),
                  })
                }
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="generation_day">День генерации счетов</Label>
              <Input
                id="generation_day"
                type="number"
                min="1"
                max="31"
                value={formData.generation_day}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    generation_day: parseInt(e.target.value) || 1,
                  })
                }
                className="mt-2"
              />
              <p className="mt-1 text-sm text-body">
                День месяца, когда генерируются счета (1-31)
              </p>
            </div>

            <div>
              <Label htmlFor="days_before_overdue">
                Дней до просрочки
              </Label>
              <Input
                id="days_before_overdue"
                type="number"
                min="1"
                value={formData.days_before_overdue}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    days_before_overdue: parseInt(e.target.value) || 7,
                  })
                }
                className="mt-2"
              />
              <p className="mt-1 text-sm text-body">
                Количество дней до автоматической пометки счета как просроченного
              </p>
            </div>

            <div>
              <Label htmlFor="overdue_action">Действие при просрочке</Label>
              <Select
                id="overdue_action"
                value={formData.overdue_action}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    overdue_action: e.target.value as 'hide_products' | 'block_adding',
                  })
                }
                className="mt-2"
              >
                <option value="hide_products">Скрыть товары</option>
                <option value="block_adding">Заблокировать добавление</option>
              </Select>
            </div>

            <div className="flex items-center">
              <Switch
                checked={formData.auto_generation}
                onChange={(checked) =>
                  setFormData({
                    ...formData,
                    auto_generation: checked,
                  })
                }
                className="mt-2"
              />
              <Label htmlFor="auto_generation" className="ml-3">
                Автоматическая генерация счетов
              </Label>
            </div>
          </div>

          <div className="flex justify-end space-x-4 border-t border-gray-200 pt-6">
            <Button
              type="submit"
              loading={isUpdating}
              disabled={isUpdating}
            >
              {t('form:button-label-save')}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

BillingSettingsPage.authenticate = {
  permissions: adminOnly,
};
BillingSettingsPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});



