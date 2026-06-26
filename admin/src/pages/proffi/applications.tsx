import Layout from '@/components/layouts/admin';
import { formatDate, ProffiError, ProffiPageHeader, StatusBadge } from '@/components/proffi-admin/common';
import { getProffiAdmin, ProffiApplication } from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';

export default function ProffiApplications() {
  const [rows, setRows] = useState<ProffiApplication[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getProffiAdmin<ProffiApplication[]>('/api/admin/applications')
      .then(setRows)
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }, []);

  return (
    <>
      <ProffiPageHeader title="Отклики Treabo" subtitle="Отклики специалистов на заказы." />
      {error ? <ProffiError message={error} /> : null}
      <div className="overflow-hidden rounded border border-border-200 bg-light">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-body">
              <tr>
                <th className="px-4 py-3">id</th>
                <th className="px-4 py-3">Заказ</th>
                <th className="px-4 py-3">Специалист</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Цена</th>
                <th className="px-4 py-3">Чат</th>
                <th className="px-4 py-3">Сообщение</th>
                <th className="px-4 py-3">Создан</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((application) => (
                <tr key={application.id} className="border-t border-border-100 align-top">
                  <td className="px-4 py-3 text-body">{application.id}</td>
                  <td className="min-w-[220px] px-4 py-3">
                    <div className="font-medium text-heading">{application.task_title || '-'}</div>
                    <div className="text-xs text-body">#{application.task_id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{application.specialist_name || '-'}</div>
                    <div className="text-xs text-body">{application.specialist_phone || ''}</div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={application.status} /></td>
                  <td className="px-4 py-3">{application.price ? `${application.price} ₽` : '-'}</td>
                  <td className="px-4 py-3">{application.chat_id ? `#${application.chat_id}` : '-'}</td>
                  <td className="min-w-[260px] px-4 py-3">
                    <div className="line-clamp-2">{application.message || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-body">{formatDate(application.created_at)}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-body" colSpan={8}>
                    Откликов пока нет
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

ProffiApplications.authenticate = {
  permissions: adminOnly,
};
ProffiApplications.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
