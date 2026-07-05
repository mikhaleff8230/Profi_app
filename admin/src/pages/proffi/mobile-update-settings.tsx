import Layout from '@/components/layouts/admin';
import { ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import { getProffiAdmin, putProffiAdmin, TreaboMobileUpdateSettings } from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useState } from 'react';

const defaults: TreaboMobileUpdateSettings = {
  latest_version: '1.0.0',
  latest_build: 1,
  min_supported_build: 1,
  force_update: false,
  android_url: 'https://treabo.ru/downloads/treabo-proffi.apk',
  ios_url: '',
  release_notes: '',
  is_active: true,
};

export default function TreaboMobileUpdateSettingsPage() {
  const [form, setForm] = useState<TreaboMobileUpdateSettings>(defaults);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProffiAdmin<TreaboMobileUpdateSettings>('/api/admin/mobile-update-settings')
      .then((data) => setForm({ ...defaults, ...data }))
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const data = await putProffiAdmin<TreaboMobileUpdateSettings>('/api/admin/mobile-update-settings', {
        latest_version: form.latest_version || '1.0.0',
        latest_build: Number(form.latest_build || 1),
        min_supported_build: Number(form.min_supported_build || 1),
        force_update: form.force_update,
        android_url: form.android_url || null,
        ios_url: form.ios_url || null,
        release_notes: form.release_notes || null,
        is_active: form.is_active,
      });
      setForm({ ...defaults, ...data });
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
        title="Mobile app update settings"
        subtitle="Version, minimum supported build and APK link for the mobile update dialog."
      />
      {error ? <ProffiError message={error} /> : null}
      {saved ? (
        <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          Settings saved
        </div>
      ) : null}

      <form onSubmit={submit} className="max-w-4xl rounded border border-border-200 bg-light p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">Latest version</span>
            <input
              className="w-full rounded border border-border-200 px-3 py-2"
              value={form.latest_version}
              onChange={(e) => setForm({ ...form, latest_version: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">Latest build</span>
            <input
              type="number"
              min={1}
              className="w-full rounded border border-border-200 px-3 py-2"
              value={form.latest_build}
              onChange={(e) => setForm({ ...form, latest_build: Number(e.target.value) })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">Minimum supported build</span>
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
            <span className="mb-2 block text-sm font-semibold text-heading">Release notes</span>
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
            Force update
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Version check active
          </label>
        </div>

        <button className="mt-6 rounded bg-accent px-5 py-3 font-semibold text-light" disabled={saving}>
          {saving ? 'Saving...' : 'Save settings'}
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
