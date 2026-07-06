import Layout from '@/components/layouts/admin';
import { formatDate, ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import {
  deleteProffiAdmin,
  getProffiAdmin,
  postProffiAdmin,
  ProffiReview,
  putProffiAdmin,
} from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type ReviewForm = {
  task_id: string;
  specialist_id: string;
  customer_id: string;
  rating: number;
  comment: string;
  photos: string;
};

const emptyForm: ReviewForm = {
  task_id: '',
  specialist_id: '',
  customer_id: '',
  rating: 5,
  comment: '',
  photos: '',
};

function photosToText(photos?: string[]) {
  return (photos || []).join('\n');
}

function textToPhotos(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProffiReviews() {
  const [rows, setRows] = useState<ProffiReview[]>([]);
  const [form, setForm] = useState<ReviewForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const formTitle = useMemo(() => (editingId ? `Редактировать отзыв #${editingId}` : 'Создать отзыв'), [editingId]);

  function load() {
    getProffiAdmin<ProffiReview[]>('/api/admin/reviews')
      .then(setRows)
      .catch((e) => setError(e.response?.data?.detail || e.response?.data?.message || e.message));
  }

  useEffect(load, []);

  function edit(row: ProffiReview) {
    setEditingId(row.id);
    setForm({
      task_id: row.task_id || '',
      specialist_id: row.specialist_id || '',
      customer_id: row.customer_id || '',
      rating: Number(row.rating || 5),
      comment: row.comment || '',
      photos: photosToText(row.photos),
    });
    setError('');
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      task_id: form.task_id ? Number(form.task_id) : null,
      specialist_id: Number(form.specialist_id),
      customer_id: Number(form.customer_id),
      rating: Number(form.rating),
      comment: form.comment.trim() || null,
      photos: textToPhotos(form.photos),
    };

    try {
      if (!payload.specialist_id || !payload.customer_id) {
        throw new Error('Укажите ID специалиста и заказчика');
      }

      if (editingId) {
        await putProffiAdmin<ProffiReview>(`/api/admin/reviews/${encodeURIComponent(editingId)}`, payload);
      } else {
        await postProffiAdmin<ProffiReview>('/api/admin/reviews', payload);
      }

      reset();
      load();
    } catch (e: any) {
      setError(e.response?.data?.detail || e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Удалить отзыв?')) return;
    await deleteProffiAdmin(`/api/admin/reviews/${encodeURIComponent(id)}`);
    load();
  }

  return (
    <>
      <ProffiPageHeader title="Отзывы Treabo" subtitle="Отзывы заказчиков о специалистах: создание, редактирование и удаление." />
      {error ? <ProffiError message={error} /> : null}

      <form onSubmit={save} className="mb-6 rounded border border-border-200 bg-light p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-heading">{formTitle}</h2>
          {editingId ? (
            <button type="button" onClick={reset} className="text-sm font-medium text-body hover:text-heading">
              Отменить
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <label className="block text-sm font-medium text-heading">
            ID специалиста *
            <input
              value={form.specialist_id}
              onChange={(e) => setForm({ ...form, specialist_id: e.target.value })}
              className="mt-1 w-full rounded border border-border-200 px-3 py-2"
              inputMode="numeric"
              required
            />
          </label>
          <label className="block text-sm font-medium text-heading">
            ID заказчика *
            <input
              value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
              className="mt-1 w-full rounded border border-border-200 px-3 py-2"
              inputMode="numeric"
              required
            />
          </label>
          <label className="block text-sm font-medium text-heading">
            ID заявки
            <input
              value={form.task_id}
              onChange={(e) => setForm({ ...form, task_id: e.target.value })}
              className="mt-1 w-full rounded border border-border-200 px-3 py-2"
              inputMode="numeric"
            />
          </label>
          <label className="block text-sm font-medium text-heading">
            Оценка *
            <select
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
              className="mt-1 w-full rounded border border-border-200 px-3 py-2"
            >
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} звезд
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-heading">
            Текст отзыва
            <textarea
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              className="mt-1 min-h-[112px] w-full rounded border border-border-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-heading">
            Фото, каждое URL/путь с новой строки
            <textarea
              value={form.photos}
              onChange={(e) => setForm({ ...form, photos: e.target.value })}
              className="mt-1 min-h-[112px] w-full rounded border border-border-200 px-3 py-2"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded bg-accent px-5 py-2 text-sm font-semibold text-light disabled:opacity-60"
        >
          {saving ? 'Сохраняем...' : editingId ? 'Сохранить отзыв' : 'Создать отзыв'}
        </button>
      </form>

      <div className="overflow-hidden rounded border border-border-200 bg-light">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-body">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Специалист</th>
                <th className="px-4 py-3">Заказчик</th>
                <th className="px-4 py-3">Заявка</th>
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
                  <td className="px-4 py-3">
                    <div className="flex max-w-[160px] flex-wrap gap-1">
                      {(row.photos || []).slice(0, 4).map((photo, index) => (
                        <a key={`${row.id}-${index}`} href={photo} target="_blank" rel="noreferrer" className="text-xs text-accent underline">
                          фото {index + 1}
                        </a>
                      ))}
                      {!(row.photos || []).length ? '-' : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-body">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => edit(row)} className="text-accent">
                        Редактировать
                      </button>
                      <button onClick={() => remove(row.id)} className="text-red-600">
                        Удалить
                      </button>
                    </div>
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
