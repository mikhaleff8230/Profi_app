import Layout from '@/components/layouts/admin';
import { ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import {
  deleteProffiAdmin,
  getProffiAdmin,
  postProffiAdmin,
  ProffiWork,
  ProffiWorkInput,
  putProffiAdmin,
  TreaboCategory,
} from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useMemo, useState } from 'react';

const emptyForm = {
  category_id: '',
  title: '',
  slug: '',
  aliases: '',
  description: '',
  sort_order: '0',
  is_active: true,
};

function fieldClass() {
  return 'w-full rounded border border-border-200 bg-white px-3 py-2 text-sm text-heading outline-none focus:border-accent';
}

function parseAliases(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function aliasesToText(aliases?: string[] | null) {
  return (aliases || []).join('\n');
}

export default function TreaboWorks() {
  const [rows, setRows] = useState<ProffiWork[]>([]);
  const [categories, setCategories] = useState<TreaboCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredRows = useMemo(() => {
    if (!categoryFilter) return rows;
    return rows.filter((row) => row.category_id === categoryFilter);
  }, [rows, categoryFilter]);

  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.title.localeCompare(b.title),
      ),
    [filteredRows],
  );

  function load() {
    const worksPath = categoryFilter
      ? `/api/admin/works?category_id=${encodeURIComponent(categoryFilter)}`
      : '/api/admin/works';

    Promise.all([
      getProffiAdmin<ProffiWork[]>(worksPath),
      getProffiAdmin<TreaboCategory[]>('/api/admin/categories'),
    ])
      .then(([works, cats]) => {
        setRows(works);
        setCategories(cats);
      })
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }

  useEffect(load, [categoryFilter]);

  function edit(row: ProffiWork) {
    setEditingId(row.id);
    setForm({
      category_id: row.category_id || '',
      title: row.title || '',
      slug: row.slug || '',
      aliases: aliasesToText(row.aliases),
      description: row.description || '',
      sort_order: String(row.sort_order ?? 0),
      is_active: row.is_active ?? true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  function toPayload(): ProffiWorkInput {
    return {
      category_id: form.category_id || null,
      title: form.title.trim(),
      slug: form.slug.trim() || null,
      aliases: parseAliases(form.aliases),
      description: form.description.trim() || null,
      sort_order: Number(form.sort_order || 0),
      is_active: form.is_active,
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = toPayload();
      if (editingId) {
        await putProffiAdmin<ProffiWork>(`/api/admin/works/${editingId}`, payload);
      } else {
        await postProffiAdmin<ProffiWork>('/api/admin/works', payload);
      }
      reset();
      load();
    } catch (e: any) {
      setError(e.response?.data?.message || e.response?.data?.detail || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Удалить работу? Все вопросы этой работы тоже будут удалены.')) return;
    await deleteProffiAdmin(`/api/admin/works/${id}`);
    if (editingId === id) reset();
    load();
  }

  function categoryName(categoryId?: string | null) {
    if (!categoryId) return '-';
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name_ru || categoryId;
  }

  return (
    <>
      <ProffiPageHeader
        title="Работы Treabo"
        subtitle="Справочник видов работ для AI-заявок. Каждая работа привязана к категории из /proffi/categories."
      />
      {error ? <ProffiError message={error} /> : null}

      <div className="mb-4">
        <select
          className="rounded border border-border-200 px-3 py-2 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Все категории</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name_ru}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={submit} className="grid gap-3 rounded border border-border-200 bg-light p-5">
          <h3 className="text-lg font-semibold text-heading">
            {editingId ? 'Редактирование работы' : 'Новая работа'}
          </h3>

          <label className="grid gap-1 text-sm">
            <span>Категория</span>
            <select
              className={fieldClass()}
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">Без категории</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name_ru}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Название</span>
            <input
              className={fieldClass()}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>ЧПУ (slug)</span>
            <input
              className={fieldClass()}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="Создастся автоматически из названия"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Алиасы (по одному на строку)</span>
            <textarea
              className={fieldClass()}
              rows={3}
              value={form.aliases}
              onChange={(e) => setForm({ ...form, aliases: e.target.value })}
              placeholder="укладка плитки&#10;кафель"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Описание</span>
            <textarea
              className={fieldClass()}
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span>Сортировка</span>
              <input
                className={fieldClass()}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 rounded border border-border-200 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Активна
            </label>
          </div>

          <div className="flex gap-2">
            <button className="rounded bg-accent px-4 py-2 font-semibold text-light" disabled={saving}>
              {saving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Добавить'}
            </button>
            {editingId ? (
              <button type="button" onClick={reset} className="rounded bg-gray-100 px-4 py-2 font-semibold">
                Отмена
              </button>
            ) : null}
          </div>
        </form>

        <div className="overflow-hidden rounded border border-border-200 bg-light">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-body">
              <tr>
                <th className="px-4 py-3">Категория</th>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Активна</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id} className="border-t border-border-100">
                  <td className="px-4 py-3">{categoryName(row.category_id)}</td>
                  <td className="px-4 py-3 font-medium text-heading">{row.title}</td>
                  <td className="px-4 py-3">{row.slug || '-'}</td>
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
                  <td className="px-4 py-8 text-center text-body" colSpan={5}>
                    Работ пока нет
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

TreaboWorks.authenticate = {
  permissions: adminOnly,
};
TreaboWorks.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
