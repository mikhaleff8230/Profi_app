import Layout from '@/components/layouts/admin';
import { ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import { getProffiAdmin, ProffiStats } from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';

const cards: Array<[keyof ProffiStats, string]> = [
  ['customers', 'Заказчики'],
  ['specialists', 'Специалисты'],
  ['tasks', 'Заказы'],
  ['applications', 'Отклики'],
  ['chats', 'Чаты'],
  ['messages', 'Сообщения'],
  ['categories', 'Категории'],
  ['filters', 'Фильтры'],
];

export default function ProffiDashboard() {
  const [data, setData] = useState<ProffiStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getProffiAdmin<ProffiStats>('/api/admin/stats')
      .then(setData)
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }, []);

  return (
    <>
      <ProffiPageHeader
        title="Treabo"
        subtitle="Инфраструктура приложения: пользователи, заказы, отклики, чаты и переписка."
      />
      {error ? <ProffiError message={error} /> : null}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([key, label]) => (
          <div key={key} className="rounded border border-border-200 bg-light p-5">
            <div className="text-2xl font-semibold text-heading">
              {data ? data[key] : '-'}
            </div>
            <div className="mt-1 text-sm text-body">{label}</div>
          </div>
        ))}
      </div>
    </>
  );
}

ProffiDashboard.authenticate = {
  permissions: adminOnly,
};
ProffiDashboard.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
