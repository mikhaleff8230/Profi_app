import Layout from '@/components/layouts/admin';
import { ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import {
  deleteProffiAdmin,
  getProffiAdmin,
  postProffiAdmin,
  putProffiAdmin,
  TreaboCategory,
  uploadProffiAdminFile,
} from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useMemo, useState, type ChangeEvent } from 'react';

const emptyForm = {
  id: '',
  parent_id: '',
  icon: 'MoreHorizontal',
  image: '',
  name_ru: '',
  slug: '',
  is_active: true,
  sort_order: '0',
};

function categoryLabel(category: TreaboCategory) {
  return `${category.name_ru || category.id}${category.parent_id ? ` / ${category.parent_id}` : ''}`;
}

export default function TreaboCategories() {
  const [rows, setRows] = useState<TreaboCategory[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const parentCompare = String(a.parent_id || '').localeCompare(String(b.parent_id || ''));
        if (parentCompare) return parentCompare;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name_ru.localeCompare(b.name_ru);
      }),
    [rows],
  );

  function load() {
    getProffiAdmin<TreaboCategory[]>('/api/admin/categories')
      .then(setRows)
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }

  useEffect(load, []);

  function edit(row: TreaboCategory) {
    setEditingId(row.id);
    setForm({
      id: row.id,
      parent_id: row.parent_id || '',
      icon: row.icon || 'MoreHorizontal',
      image: row.image || '',
      name_ru: row.name_ru || '',
      slug: row.slug || row.id,
      is_active: row.is_active ?? true,
      sort_order: String(row.sort_order ?? 0),
    });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      parent_id: form.parent_id || null,
      slug: form.slug || null,
      name_ro: form.name_ru,
      sort_order: Number(form.sort_order || 0),
    };

    try {
      if (editingId) {
        await putProffiAdmin<TreaboCategory>(`/api/admin/categories/${encodeURIComponent(editingId)}`, payload);
      } else {
        await postProffiAdmin<TreaboCategory>('/api/admin/categories', payload);
      }
      reset();
      load();
    } catch (e: any) {
      setError(e.response?.data?.message || e.response?.data?.detail || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Удалить категорию? Дочерние категории лучше сначала перенести вручную.')) return;
    await deleteProffiAdmin(`/api/admin/categories/${encodeURIComponent(id)}`);
    if (editingId === id) reset();
    load();
  }

  async function onImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const upload = await uploadProffiAdminFile(file, 'categories');
      setForm((prev) => ({ ...prev, image: upload.url || upload.path }));
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  return (
    <>
      <ProffiPageHeader
        title="Категории Treabo"
        subtitle="Дерево услуг: категория, подкатегория, вид работ. Эти slug используются заявками, фильтрами и AI."
      />
      {error ? <ProffiError message={error} /> : null}

      <form onSubmit={submit} className="mb-6 grid gap-3 rounded border border-border-200 bg-light p-5 md:grid-cols-6">
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="ID — создастся автоматически"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value, slug: form.slug || e.target.value })}
          disabled={!!editingId}
        />
        <select
          className="rounded border border-border-200 px-3 py-2"
          value={form.parent_id}
          onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
        >
          <option value="">Без родителя</option>
          {sortedRows
            .filter((row) => row.id !== editingId)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {categoryLabel(row)}
              </option>
            ))}
        </select>
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="Иконка"
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
        />
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="Название RU"
          value={form.name_ru}
          onChange={(e) => setForm({ ...form, name_ru: e.target.value })}
          required
        />
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="Сортировка"
          value={form.sort_order}
          onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
        />
        <input
          className="rounded border border-border-200 px-3 py-2 md:col-span-2"
          placeholder="ЧПУ/slug — создастся из названия"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
        />
        <input
          className="rounded border border-border-200 px-3 py-2 md:col-span-2"
          placeholder="URL изображения"
          value={form.image}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
        />
        <label className="flex items-center gap-2 rounded border border-border-200 px-3 py-2 md:col-span-2">
          <input type="file" accept="image/*" onChange={onImageUpload} disabled={uploading} />
          {uploading ? 'Загрузка...' : 'Загрузить фото'}
        </label>
        <label className="flex items-center gap-2 rounded border border-border-200 px-3 py-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Активна
        </label>
        <button className="rounded bg-accent px-4 py-2 font-semibold text-light" disabled={saving}>
          {saving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Добавить'}
        </button>
        {editingId ? (
          <button type="button" onClick={reset} className="rounded bg-gray-100 px-4 py-2 font-semibold">
            Отмена
          </button>
        ) : null}
      </form>

      <div className="overflow-hidden rounded border border-border-200 bg-light">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-body">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Родитель</th>
              <th className="px-4 py-3">Название</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Фото</th>
              <th className="px-4 py-3">Активна</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} className="border-t border-border-100">
                <td className="px-4 py-3 font-medium text-heading">{row.id}</td>
                <td className="px-4 py-3">{row.parent_id || '-'}</td>
                <td className="px-4 py-3">
                  {row.name_ru}
                </td>
                <td className="px-4 py-3">{row.slug || '-'}</td>
                <td className="px-4 py-3">{row.image ? 'Да' : '-'}</td>
                <td className="px-4 py-3">{row.is_active === false ? 'Нет' : 'Да'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => edit(row)} className="me-4 text-accent">
                    Редактировать
                  </button>
                  <button onClick={() => remove(row.id)} className="text-red-600">
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
            {!sortedRows.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-body" colSpan={7}>
                  Категорий пока нет
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

TreaboCategories.authenticate = {
  permissions: adminOnly,
};
TreaboCategories.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
