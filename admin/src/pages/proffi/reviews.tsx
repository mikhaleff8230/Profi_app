import Layout from '@/components/layouts/admin';
import { formatDate, ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import { deleteProffiAdmin, getProffiAdmin, ProffiReview } from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';

export default function ProffiReviews() {
  const [rows, setRows] = useState<ProffiReview[]>([]);
  const [error, setError] = useState('');

  function load() {
    getProffiAdmin<ProffiReview[]>('/api/admin/reviews')
      .then(setRows)
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }

  useEffect(load, []);

  async function remove(id: string) {
    if (!confirm('Удалить отзыв?')) return;
    await deleteProffiAdmin(`/api/admin/reviews/${encodeURIComponent(id)}`);
    load();
  }

  return (
    <>
      <ProffiPageHeader title="Отзывы Treabo" subtitle="Отзывы заказчиков о специалистах." />
      {error ? <ProffiError message={error} /> : null}
      <div className="overflow-hidden rounded border border-border-200 bg-light">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-body">
              <tr>
                <th className="px-4 py-3">id</th>
                <th className="px-4 py-3">Специалист</th>
                <th className="px-4 py-3">Заказчик</th>
                <th className="px-4 py-3">Заказ</th>
                <th className="px-4 py-3">Оценка</th>
                <th className="px-4 py-3">Комментарий</th>
                <th className="px-4 py-3">Фото</th>
                <th className="px-4 py-3">Создан</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border-100 align-top">
                  <td className="px-4 py-3 text-body">{row.id}</td>
                  <td className="px-4 py-3">
                    <div>{row.specialist_name || '-'}</div>
                    <div className="text-xs text-body">#{row.specialist_id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.customer_name || '-'}</div>
                    <div className="text-xs text-body">#{row.customer_id}</div>
                  </td>
                  <td className="min-w-[180px] px-4 py-3">
                    <div className="font-medium text-heading">{row.task_title || '-'}</div>
                    <div className="text-xs text-body">{row.task_id ? `#${row.task_id}` : '-'}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{row.rating}/5</td>
                  <td className="min-w-[220px] px-4 py-3">
                    <div className="line-clamp-3">{row.comment || '-'}</div>
                  </td>
                  <td className="px-4 py-3">{(row.photos || []).length}</td>
                  <td className="px-4 py-3 text-body">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(row.id)} className="text-red-600">Удалить</button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-body" colSpan={9}>
                    Отзывов пока нет
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

ProffiReviews.authenticate = {
  permissions: adminOnly,
};
ProffiReviews.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
