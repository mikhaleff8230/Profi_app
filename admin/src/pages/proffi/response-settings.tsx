import Layout from '@/components/layouts/admin';
import { formatDate, ProffiError, ProffiPageHeader, StatusBadge } from '@/components/proffi-admin/common';
import {
  getProffiAdmin,
  putProffiAdmin,
  TreaboBalanceDeposit,
  TreaboResponseSettings,
} from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useState } from 'react';

const defaults: TreaboResponseSettings = {
  free_daily_limit: 5,
  free_per_task_limit: 5,
  default_response_price_mdl: 15,
  manual_deposit_amount_mdl: 100,
  manual_deposit_url: '',
  is_active: true,
};

export default function TreaboResponseSettingsPage() {
  const [form, setForm] = useState<TreaboResponseSettings>(defaults);
  const [deposits, setDeposits] = useState<TreaboBalanceDeposit[]>([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function load() {
    getProffiAdmin<TreaboResponseSettings>('/api/admin/response-settings')
      .then((data) => setForm({ ...defaults, ...data }))
      .catch((e) => setError(e.response?.data?.detail || e.message));
    getProffiAdmin<TreaboBalanceDeposit[]>('/api/admin/balance-deposits')
      .then(setDeposits)
      .catch(() => undefined);
  }

  useEffect(load, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const data = await putProffiAdmin<TreaboResponseSettings>('/api/admin/response-settings', {
        free_daily_limit: Number(form.free_daily_limit || 0),
        free_per_task_limit: Number(form.free_per_task_limit || 0),
        default_response_price_mdl: Number(form.default_response_price_mdl || 0),
        manual_deposit_amount_mdl: Number(form.manual_deposit_amount_mdl || 100),
        manual_deposit_url: form.manual_deposit_url || null,
        is_active: form.is_active,
      });
      setForm({ ...defaults, ...data });
      setSaved(true);
    } catch (e: any) {
      setError(e.response?.data?.message || e.response?.data?.detail || e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ProffiPageHeader
        title="Настройки откликов Treabo"
        subtitle="Здесь задается дневной лимит бесплатных откликов мастера и базовая цена платного отклика."
      />
      {error ? <ProffiError message={error} /> : null}
      {saved ? (
        <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          Настройки сохранены
        </div>
      ) : null}

      <form onSubmit={submit} className="max-w-4xl rounded border border-border-200 bg-light p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">Бесплатных откликов в сутки</span>
            <input
              type="number"
              min={0}
              className="w-full rounded border border-border-200 px-3 py-2"
              value={form.free_daily_limit}
              onChange={(e) => setForm({ ...form, free_daily_limit: Number(e.target.value) })}
            />
            <span className="mt-2 block text-xs text-body">
              По умолчанию 5. После исчерпания лимита будет показан платный попап.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">Бесплатных откликов на заявку</span>
            <input
              type="number"
              min={0}
              className="w-full rounded border border-border-200 px-3 py-2"
              value={form.free_per_task_limit ?? 5}
              onChange={(e) => setForm({ ...form, free_per_task_limit: Number(e.target.value) })}
            />
            <span className="mt-2 block text-xs text-body">
              После первых 60 минут только столько мастеров смогут откликнуться бесплатно на одну заявку.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">Базовая цена отклика, MDL</span>
            <input
              type="number"
              min={0}
              className="w-full rounded border border-border-200 px-3 py-2"
              value={form.default_response_price_mdl}
              onChange={(e) => setForm({ ...form, default_response_price_mdl: Number(e.target.value) })}
            />
            <span className="mt-2 block text-xs text-body">
              Используется как дефолт. У конкретного заказа цена может быть своей.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">Сумма ручного пополнения, MDL</span>
            <input
              type="number"
              min={1}
              className="w-full rounded border border-border-200 px-3 py-2"
              value={form.manual_deposit_amount_mdl}
              onChange={(e) => setForm({ ...form, manual_deposit_amount_mdl: Number(e.target.value) })}
            />
            <span className="mt-2 block text-xs text-body">
              Сейчас используется одна фиксированная сумма. Позже добавим несколько вариантов.
            </span>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-heading">QR-ссылка для ручного пополнения</span>
            <input
              className="w-full rounded border border-border-200 px-3 py-2"
              placeholder="https://..."
              value={form.manual_deposit_url || ''}
              onChange={(e) => setForm({ ...form, manual_deposit_url: e.target.value })}
            />
            <span className="mt-2 block text-xs text-body">
              Эту ссылку мастер откроет на странице баланса при нажатии “Открыть QR для оплаты”.
            </span>
          </label>
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm font-semibold text-heading">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Настройки активны
        </label>

        <button className="mt-6 rounded bg-accent px-5 py-3 font-semibold text-light" disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </form>

      <section className="mt-6 overflow-hidden rounded border border-border-200 bg-light">
        <div className="border-b border-border-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-heading">Ручные пополнения на проверку</h2>
          <p className="mt-1 text-sm text-body">После оплаты мастер нажимает кнопку сообщения, здесь появится дата.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-body">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Мастер</th>
                <th className="px-4 py-3">Сумма</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Сообщил</th>
                <th className="px-4 py-3">Создано</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((deposit) => (
                <tr key={deposit.id} className="border-t border-border-100">
                  <td className="px-4 py-3 font-medium text-heading">{deposit.id}</td>
                  <td className="px-4 py-3">
                    <div>{deposit.seller_name || `#${deposit.seller_id}`}</div>
                    <div className="text-xs text-body">{deposit.seller_phone || ''}</div>
                  </td>
                  <td className="px-4 py-3">{deposit.amount} MDL</td>
                  <td className="px-4 py-3"><StatusBadge value={deposit.status} /></td>
                  <td className="px-4 py-3">{deposit.reported_at ? formatDate(deposit.reported_at) : '-'}</td>
                  <td className="px-4 py-3">{formatDate(deposit.created_at)}</td>
                </tr>
              ))}
              {!deposits.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-body" colSpan={6}>
                    Заявок на ручное пополнение пока нет
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

TreaboResponseSettingsPage.authenticate = {
  permissions: adminOnly,
};
TreaboResponseSettingsPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
