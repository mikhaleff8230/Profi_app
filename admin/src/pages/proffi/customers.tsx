import Layout from '@/components/layouts/admin';
import RussiaCityInput from '@/components/proffi-admin/RussiaCityInput';
import { formatDate, ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import {
  deleteProffiAdmin,
  getProffiAdmin,
  postProffiAdmin,
  ProffiUser,
  putProffiAdmin,
} from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useState } from 'react';

const emptyForm = {
  name: '',
  phone: '+7',
  email: '',
  city: 'Москва',
  password: 'Treabo12345',
};

export default function ProffiCustomers() {
  const [rows, setRows] = useState<ProffiUser[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    getProffiAdmin<ProffiUser[]>('/api/admin/customers')
      .then(setRows)
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }

  useEffect(load, []);

  function edit(user: ProffiUser) {
    setEditingId(user.id);
    setForm({
      name: user.name || '',
      phone: user.phone || '+7',
      email: user.email || '',
      city: user.city || 'Москва',
      password: '',
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
      role: 'customer',
      password: form.password || undefined,
    };

    try {
      if (editingId) {
        await putProffiAdmin<ProffiUser>(`/api/admin/users/${encodeURIComponent(editingId)}`, payload);
      } else {
        await postProffiAdmin<ProffiUser>('/api/admin/users', payload);
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
    if (!confirm('Удалить заказчика?')) return;
    await deleteProffiAdmin(`/api/admin/users/${encodeURIComponent(id)}`);
    if (editingId === id) reset();
    load();
  }

  return (
    <>
      <ProffiPageHeader title="Заказчики Treabo" subtitle="Клиенты, которые создают заявки." />
      {error ? <ProffiError message={error} /> : null}

      <form onSubmit={submit} className="mb-6 grid gap-3 rounded border border-border-200 bg-light p-5 md:grid-cols-6">
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="Имя"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="Телефон +7"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="Email, можно пусто"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <RussiaCityInput value={form.city} onChange={(city) => setForm({ ...form, city })} />
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder={editingId ? 'Новый пароль, можно пусто' : 'Пароль'}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required={!editingId}
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

      <UsersTable rows={rows} onDelete={remove} onEdit={edit} />
    </>
  );
}

function UsersTable({
  rows,
  onDelete,
  onEdit,
}: {
  rows: ProffiUser[];
  onDelete: (id: string) => void;
  onEdit: (user: ProffiUser) => void;
}) {
  return (
    <div className="overflow-hidden rounded border border-border-200 bg-light">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-body">
            <tr>
              <th className="px-4 py-3">id</th>
              <th className="px-4 py-3">Имя</th>
              <th className="px-4 py-3">Телефон</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Город</th>
              <th className="px-4 py-3">Создан</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.id} className="border-t border-border-100">
                <td className="px-4 py-3 text-body">{user.id}</td>
                <td className="px-4 py-3 font-medium text-heading">{user.name || '-'}</td>
                <td className="px-4 py-3">{user.phone || '-'}</td>
                <td className="px-4 py-3">{user.email || '-'}</td>
                <td className="px-4 py-3">{user.city || '-'}</td>
                <td className="px-4 py-3 text-body">{formatDate(user.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => onEdit(user)} className="me-4 text-accent">
                    Редактировать
                  </button>
                  <button type="button" onClick={() => onDelete(user.id)} className="text-red-600">
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-body" colSpan={7}>
                  Данных пока нет
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

ProffiCustomers.authenticate = {
  permissions: adminOnly,
};
ProffiCustomers.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
