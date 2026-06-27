import Layout from '@/components/layouts/admin';
import RussiaCityInput from '@/components/proffi-admin/RussiaCityInput';
import { formatDate, ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import {
  deleteProffiAdmin,
  getProffiAdmin,
  postProffiAdmin,
  ProffiUser,
  putProffiAdmin,
  uploadProffiAdminFile,
} from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useState } from 'react';

type SpecialistForm = {
  name: string;
  phone: string;
  email: string;
  city: string;
  services: string;
  password: string;
  avatar: string;
  portfolio: string[];
};

const emptyForm: SpecialistForm = {
  name: '',
  phone: '+7',
  email: '',
  city: 'Москва',
  services: '',
  password: 'Treabo12345',
  avatar: '',
  portfolio: [],
};

export default function ProffiSpecialists() {
  const [rows, setRows] = useState<ProffiUser[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function load() {
    getProffiAdmin<ProffiUser[]>('/api/admin/specialists')
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
      services: user.services?.join(', ') || '',
      password: '',
      avatar: user.avatar || '',
      portfolio: user.portfolio || [],
    });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  async function uploadAvatar(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const upload = await uploadProffiAdminFile(file, 'avatars');
      setForm((current) => ({ ...current, avatar: upload.url }));
    } catch (e: any) {
      setError(e.response?.data?.message || e.response?.data?.detail || e.message);
    } finally {
      setUploading(false);
    }
  }

  async function uploadPortfolio(files: FileList | null) {
    const selected = Array.from(files || []).slice(0, Math.max(0, 10 - form.portfolio.length));
    if (!selected.length) return;

    setUploading(true);
    setError('');
    try {
      const uploads = await Promise.all(selected.map((file) => uploadProffiAdminFile(file, 'portfolio')));
      setForm((current) => ({
        ...current,
        portfolio: [...current.portfolio, ...uploads.map((upload) => upload.url)].slice(0, 10),
      }));
    } catch (e: any) {
      setError(e.response?.data?.message || e.response?.data?.detail || e.message);
    } finally {
      setUploading(false);
    }
  }

  function removePortfolioPhoto(url: string) {
    setForm((current) => ({
      ...current,
      portfolio: current.portfolio.filter((photo) => photo !== url),
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      role: 'specialist',
      services: form.services
        .split(',')
        .map((service) => service.trim())
        .filter(Boolean),
      password: form.password || undefined,
      avatar: form.avatar || null,
      portfolio: form.portfolio,
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
    if (!confirm('Удалить специалиста?')) return;
    await deleteProffiAdmin(`/api/admin/users/${encodeURIComponent(id)}`);
    if (editingId === id) reset();
    load();
  }

  return (
    <>
      <ProffiPageHeader title="Специалисты Treabo" subtitle="Мастера, которые откликаются на заявки." />
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
        <input
          className="rounded border border-border-200 px-3 py-2 md:col-span-4"
          placeholder="Услуги через запятую: санузел, плитка, сантехника"
          value={form.services}
          onChange={(e) => setForm({ ...form, services: e.target.value })}
        />
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-heading">Аватар мастера</label>
          <input
            type="file"
            accept="image/*"
            className="w-full rounded border border-border-200 px-3 py-2"
            disabled={uploading}
            onChange={(event) => uploadAvatar(event.target.files)}
          />
          {form.avatar ? (
            <div className="mt-3 flex items-center gap-3">
              <img src={form.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, avatar: '' }))}
                className="text-sm text-red-600"
              >
                Удалить
              </button>
            </div>
          ) : null}
        </div>
        <div className="md:col-span-6">
          <label className="mb-2 block text-sm font-semibold text-heading">Портфолио мастера</label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="w-full rounded border border-border-200 px-3 py-2"
            disabled={uploading || form.portfolio.length >= 10}
            onChange={(event) => uploadPortfolio(event.target.files)}
          />
          <div className="mt-2 text-xs text-body">
            {uploading ? 'Загрузка фото...' : `Загружено ${form.portfolio.length}/10`}
          </div>
          {form.portfolio.length ? (
            <div className="mt-3 flex flex-wrap gap-3">
              {form.portfolio.map((photo) => (
                <div key={photo} className="relative h-20 w-20 overflow-hidden rounded border border-border-200">
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePortfolioPhoto(photo)}
                    className="absolute right-1 top-1 rounded bg-red-600 px-1.5 py-0.5 text-xs text-light"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {editingId ? (
          <button type="button" onClick={reset} className="rounded bg-gray-100 px-4 py-2 font-semibold">
            Отмена
          </button>
        ) : null}
      </form>

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
                <th className="px-4 py-3">Услуги</th>
                <th className="px-4 py-3">Создан</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id} className="border-t border-border-100">
                  <td className="px-4 py-3 text-body">{user.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-heading">
                          {(user.name || '?').slice(0, 1)}
                        </span>
                      )}
                      <div>
                        <div className="font-medium text-heading">{user.name || '-'}</div>
                        {user.portfolio?.length ? (
                          <div className="mt-1 text-xs text-body">Портфолио: {user.portfolio.length}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{user.phone || '-'}</td>
                  <td className="px-4 py-3">{user.email || '-'}</td>
                  <td className="px-4 py-3">{user.city || '-'}</td>
                  <td className="px-4 py-3">{user.services?.length ? user.services.join(', ') : '-'}</td>
                  <td className="px-4 py-3 text-body">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => edit(user)} className="me-4 text-accent">
                      Редактировать
                    </button>
                    <button type="button" onClick={() => remove(user.id)} className="text-red-600">
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-body" colSpan={8}>
                    Данных пока нет
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

ProffiSpecialists.authenticate = {
  permissions: adminOnly,
};
ProffiSpecialists.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
