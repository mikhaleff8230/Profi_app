import Layout from '@/components/layouts/admin';
import { ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import { getProffiAdmin, putProffiAdmin, TreaboMatchingSettings } from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useState } from 'react';

const defaults: TreaboMatchingSettings = {
  category_weight: 30,
  work_weight: 25,
  rating_weight: 20,
  reviews_weight: 10,
  online_weight: 10,
  profile_relevance_weight: 5,
  min_rating: 0,
  min_reviews: 0,
  max_recommended: 5,
  is_active: true,
};

export default function TreaboMatchingSettingsPage() {
  const [form, setForm] = useState<TreaboMatchingSettings>(defaults);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProffiAdmin<TreaboMatchingSettings>('/api/admin/matching-settings')
      .then((data) => setForm({ ...defaults, ...data }))
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const data = await putProffiAdmin<TreaboMatchingSettings>('/api/admin/matching-settings', {
        category_weight: Number(form.category_weight || 0),
        work_weight: Number(form.work_weight || 0),
        rating_weight: Number(form.rating_weight || 0),
        reviews_weight: Number(form.reviews_weight || 0),
        online_weight: Number(form.online_weight || 0),
        profile_relevance_weight: Number(form.profile_relevance_weight || 0),
        min_rating: Number(form.min_rating || 0),
        min_reviews: Number(form.min_reviews || 0),
        max_recommended: Number(form.max_recommended || 5),
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
        title="Настройки подбора мастеров"
        subtitle="Веса критериев ранжирования при автоматическом подборе специалистов к заявке."
      />
      {error ? <ProffiError message={error} /> : null}
      {saved ? (
        <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          Настройки сохранены
        </div>
      ) : null}

      <form onSubmit={submit} className="max-w-4xl rounded border border-border-200 bg-light p-6">
        <div className="grid gap-5 md:grid-cols-2">
          {(
            [
              ['category_weight', 'Вес совпадения категории'],
              ['work_weight', 'Вес совпадения работ'],
              ['rating_weight', 'Вес рейтинга'],
              ['reviews_weight', 'Вес количества отзывов'],
              ['online_weight', 'Вес онлайн-статуса'],
              ['profile_relevance_weight', 'Вес релевантности анкеты'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-2 block text-sm font-semibold text-heading">{label}</span>
              <input
                type="number"
                min={0}
                max={1000}
                className="w-full rounded border border-border-200 px-3 py-2"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
              />
            </label>
          ))}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">Минимальный рейтинг</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              className="w-full rounded border border-border-200 px-3 py-2"
              value={form.min_rating}
              onChange={(e) => setForm({ ...form, min_rating: Number(e.target.value) })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">Минимум отзывов</span>
            <input
              type="number"
              min={0}
              className="w-full rounded border border-border-200 px-3 py-2"
              value={form.min_reviews}
              onChange={(e) => setForm({ ...form, min_reviews: Number(e.target.value) })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-heading">Максимум рекомендуемых мастеров</span>
            <input
              type="number"
              min={1}
              max={5}
              className="w-full rounded border border-border-200 px-3 py-2"
              value={form.max_recommended}
              onChange={(e) => setForm({ ...form, max_recommended: Number(e.target.value) })}
            />
          </label>
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm font-semibold text-heading">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Настройки активны
        </label>

        <button className="mt-6 rounded bg-accent px-5 py-3 font-semibold text-light" disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </form>
    </>
  );
}

TreaboMatchingSettingsPage.authenticate = {
  permissions: adminOnly,
};
TreaboMatchingSettingsPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
