import Layout from '@/components/layouts/admin';
import { formatDate, ProffiError, ProffiPageHeader, StatusBadge } from '@/components/proffi-admin/common';
import { getProffiAdmin, postProffiAdmin, ProffiVerification } from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';

function verificationPhotoUrl(value?: string | null) {
  if (!value) return '';
  const apiEndpoint =
    process.env.NEXT_PUBLIC_REST_API_ENDPOINT ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://api.treabo.ru';
  const apiOrigin = (() => {
    try {
      return new URL(apiEndpoint).origin;
    } catch {
      return 'https://api.treabo.ru';
    }
  })();

  if (/^https?:\/\//i.test(value)) {
    return value.replace(
      /^https:\/\/treabo\.ru\/api\/files\//i,
      'https://api.treabo.ru/api/proffi/files/',
    );
  }
  if (value.startsWith('/api/proffi/files/')) return `${apiOrigin}${value}`;
  if (value.startsWith('/api/files/')) {
    return `${apiOrigin}/api/proffi/files/${value.replace(/^\/api\/files\/?/, '')}`;
  }
  if (value.startsWith('/storage/') || value.startsWith('storage/')) {
    return `${apiOrigin}/${value.replace(/^\/+/, '')}`;
  }
  return `${apiOrigin}/api/proffi/files/${value.replace(/^\/+/, '')}`;
}

const photoLabels = ['Разворот паспорта', 'Страница прописки', 'Селфи с паспортом'];

export default function ProffiVerifications() {
  const [rows, setRows] = useState<ProffiVerification[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    getProffiAdmin<ProffiVerification[]>('/api/admin/verifications')
      .then(setRows)
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }

  useEffect(load, []);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await postProffiAdmin(`/api/admin/verifications/${encodeURIComponent(id)}/approve`, {});
      load();
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const comment = prompt('Комментарий модератора (необязательно)') || '';
    setBusyId(id);
    try {
      await postProffiAdmin(`/api/admin/verifications/${encodeURIComponent(id)}/reject`, {
        moderator_comment: comment || null,
      });
      load();
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <ProffiPageHeader title="Верификация Treabo" subtitle="Проверка паспортных данных мастеров." />
      {error ? <ProffiError message={error} /> : null}
      <div className="overflow-hidden rounded border border-border-200 bg-light">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-body">
              <tr>
                <th className="px-4 py-3">id</th>
                <th className="px-4 py-3">Мастер</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Фото</th>
                <th className="px-4 py-3">Комментарий</th>
                <th className="px-4 py-3">Создан</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border-100 align-top">
                  <td className="px-4 py-3 text-body">{row.id}</td>
                  <td className="px-4 py-3">
                    <div>{row.user_name || '-'}</div>
                    <div className="text-xs text-body">{row.user_phone || ''}</div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
                  <td className="min-w-[220px] px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {[row.passport_main_photo, row.passport_registration_photo, row.passport_selfie_photo]
                        .filter(Boolean)
                        .map((url, idx) => (
                          <a
                            key={idx}
                            href={verificationPhotoUrl(url)}
                            target="_blank"
                            rel="noreferrer"
                            className="group block w-28 text-xs font-semibold text-accent"
                          >
                            <img
                              src={verificationPhotoUrl(url)}
                              alt={photoLabels[idx]}
                              className="mb-1 h-20 w-28 rounded border border-border-200 bg-gray-50 object-cover"
                              loading="lazy"
                            />
                            <span className="group-hover:underline">{photoLabels[idx]}</span>
                          </a>
                        ))}
                      {!row.passport_main_photo && !row.passport_registration_photo && !row.passport_selfie_photo ? '-' : null}
                    </div>
                  </td>
                  <td className="min-w-[180px] px-4 py-3">{row.moderator_comment || '-'}</td>
                  <td className="px-4 py-3 text-body">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {row.status === 'pending' ? (
                      <>
                        <button
                          disabled={busyId === row.id}
                          onClick={() => approve(row.id)}
                          className="me-3 text-accent"
                        >
                          Одобрить
                        </button>
                        <button
                          disabled={busyId === row.id}
                          onClick={() => reject(row.id)}
                          className="text-red-600"
                        >
                          Отклонить
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-body" colSpan={7}>
                    Заявок на верификацию пока нет
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

ProffiVerifications.authenticate = {
  permissions: adminOnly,
};
ProffiVerifications.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
