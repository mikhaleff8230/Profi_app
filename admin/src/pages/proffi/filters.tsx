import Layout from '@/components/layouts/admin';
import { ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import {
  deleteProffiAdmin,
  getProffiAdmin,
  postProffiAdmin,
  putProffiAdmin,
  TreaboFilter,
} from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useState } from 'react';

const emptyForm = {
  id: '',
  name: '',
  key: '',
  value: '',
};

export default function TreaboFilters() {
  const [rows, setRows] = useState<TreaboFilter[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    getProffiAdmin<TreaboFilter[]>('/api/admin/filters')
      .then(setRows)
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }

  useEffect(load, []);

  function edit(row: TreaboFilter) {
    setEditingId(row.id);
    setForm({
      id: row.id,
      name: row.name || '',
      key: row.key || '',
      value: row.value || '',
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
    try {
      if (editingId) {
        await putProffiAdmin<TreaboFilter>(`/api/admin/filters/${encodeURIComponent(editingId)}`, form);
      } else {
        await postProffiAdmin<TreaboFilter>('/api/admin/filters', form);
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
    if (!confirm('Удалить фильтр?')) return;
    await deleteProffiAdmin(`/api/admin/filters/${encodeURIComponent(id)}`);
    if (editingId === id) reset();
    load();
  }

  return (
    <>
      <ProffiPageHeader
        title="Фильтры Treabo"
        subtitle="Фильтры для списка заданий, мастеров и будущих AI-правил."
      />
      {error ? <ProffiError message={error} /> : null}

      <form onSubmit={submit} className="mb-6 grid gap-3 rounded border border-border-200 bg-light p-5 md:grid-cols-5">
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="id, можно пусто"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          disabled={!!editingId}
        />
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="Название"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="key"
          value={form.key}
          onChange={(e) => setForm({ ...form, key: e.target.value })}
          required
        />
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="value"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          required
        />
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
              <th className="px-4 py-3">Название</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border-100">
                <td className="px-4 py-3 font-medium text-heading">{row.id}</td>
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">{row.key}</td>
                <td className="px-4 py-3">{row.value}</td>
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
            {!rows.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-body" colSpan={5}>
                  Фильтров пока нет
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

TreaboFilters.authenticate = {
  permissions: adminOnly,
};
TreaboFilters.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
