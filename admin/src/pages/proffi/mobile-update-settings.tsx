import Layout from '@/components/layouts/admin';
import { ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import { getProffiAdmin, putProffiAdmin, TreaboMobileUpdateSettings } from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useState } from 'react';

type AppType = 'specialist' | 'client';

const defaults = (appType: AppType): TreaboMobileUpdateSettings => ({
  app_type: appType,
  latest_version: '1.0.0',
  latest_build: 1,
  min_supported_build: 1,
  force_update: false,
  android_url: appType === 'specialist'
    ? 'https://treabo.ru/downloads/treabo-proffi.apk'
    : 'https://treabo.ru/downloads/treabo-client.apk',
  ios_url: '',
  release_notes: '',
  is_active: true,
});

export default function TreaboMobileUpdateSettingsPage() {
  const [appType, setAppType] = useState<AppType>('specialist');
  const [forms, setForms] = useState<Record<AppType, TreaboMobileUpdateSettings>>({
    specialist: defaults('specialist'),
    client: defaults('client'),
  });
  const form = forms[appType];
  const setForm = (next: TreaboMobileUpdateSettings) => setForms((current) => ({ ...current, [appType]: next }));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all((['specialist', 'client'] as AppType[]).map(async (type) => {
      const data = await getProffiAdmin<TreaboMobileUpdateSettings>(`/api/admin/mobile-update-settings?app_type=${type}`);
      return [type, { ...defaults(type), ...data }] as const;
    }))
      .then((entries) => setForms(Object.fromEntries(entries) as Record<AppType, TreaboMobileUpdateSettings>))
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const data = await putProffiAdmin<TreaboMobileUpdateSettings>('/api/admin/mobile-update-settings', {
        app_type: appType,
        latest_version: form.latest_version || '1.0.0',
        latest_build: Number(form.latest_build || 1),
        min_supported_build: Number(form.min_supported_build || 1),
        force_update: form.force_update,
        android_url: form.android_url || null,
        ios_url: form.ios_url || null,
        release_notes: form.release_notes || null,
        is_active: form.is_active,
      });
      setForm({ ...defaults(appType), ...data });
      setSaved(true);
    } catch (e: any) {
      setError(e.response?.data?.message || e.response?.data?.detail || e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ProffiPageHeader
        title="Версии мобильных приложений"
        subtitle="Отдельные версии, минимальные сборки и APK для мастера и заказчика."
      />
      <div className="mb-5 flex max-w-4xl gap-2 rounded border border-border-200 bg-light p-2">
        {(['specialist', 'client'] as AppType[]).map((type) => (
          <button key={type} type="button" onClick={() => { setAppType(type); setSaved(false); setError(''); }} className={`flex-1 rounded px-4 py-3 text-sm font-semibold ${appType === type ? 'bg-accent text-light' : 'bg-gray-100 text-heading'}`}>
            {type === 'specialist' ? 'Treabo-specialist' : 'Treabo-client'}
          </button>
        ))}
      </div>
      {error ? <ProffiError message={error} /> : null}
      {saved ? (
        <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          Настройки {appType === 'specialist' ? 'Treabo-specialist' : 'Treabo-client'} сохранены
        </div>
      ) : null}

      <form onSubmit={submit} className="max-w-4xl rounded border border-border-200 bg-light p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">Последняя версия</span>
            <input
              className="w-full rounded border border-border-200 px-3 py-2"
              value={form.latest_version}
              onChange={(e) => setForm({ ...form, latest_version: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">Номер сборки</span>
            <input
              type="number"
              min={1}
              className="w-full rounded border border-border-200 px-3 py-2"
              value={form.latest_build}
              onChange={(e) => setForm({ ...form, latest_build: Number(e.target.value) })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">Минимальная поддерживаемая сборка</span>
            <input
              type="number"
              min={1}
              className="w-full rounded border border-border-200 px-3 py-2"
              value={form.min_supported_build}
              onChange={(e) => setForm({ ...form, min_supported_build: Number(e.target.value) })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">iOS URL</span>
            <input
              className="w-full rounded border border-border-200 px-3 py-2"
              placeholder="https://apps.apple.com/..."
              value={form.ios_url || ''}
              onChange={(e) => setForm({ ...form, ios_url: e.target.value })}
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-heading">Android APK URL</span>
            <input
              className="w-full rounded border border-border-200 px-3 py-2"
              placeholder="https://treabo.ru/downloads/treabo-proffi.apk"
              value={form.android_url || ''}
              onChange={(e) => setForm({ ...form, android_url: e.target.value })}
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-heading">Что изменилось</span>
            <textarea
              className="min-h-[120px] w-full rounded border border-border-200 px-3 py-2"
              value={form.release_notes || ''}
              onChange={(e) => setForm({ ...form, release_notes: e.target.value })}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 text-sm font-semibold text-heading md:grid-cols-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.force_update}
              onChange={(e) => setForm({ ...form, force_update: e.target.checked })}
            />
            Обязательное обновление
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Проверка версии включена
          </label>
        </div>

        <button className="mt-6 rounded bg-accent px-5 py-3 font-semibold text-light" disabled={saving}>
          {saving ? 'Сохраняем...' : 'Сохранить настройки'}
        </button>
      </form>
    </>
  );
}

TreaboMobileUpdateSettingsPage.authenticate = {
  permissions: adminOnly,
};
TreaboMobileUpdateSettingsPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
