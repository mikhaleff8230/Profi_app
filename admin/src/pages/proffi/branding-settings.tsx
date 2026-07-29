import Layout from '@/components/layouts/admin';
import { ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import Card from '@/components/common/card';
import Description from '@/components/ui/description';
import FileInput from '@/components/ui/file-input';
import Loader from '@/components/ui/loader/loader';
import Button from '@/components/ui/button';
import { getProffiAdmin, putProffiAdmin } from '@/data/proffi-admin';
import { siteSettings } from '@/settings/site.settings';
import { adminOnly } from '@/utils/auth-utils';
import { getFormattedImage } from '@/utils/get-formatted-image';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

type BrandingForm = {
  logo: ReturnType<typeof getFormattedImage>;
  dark_logo: ReturnType<typeof getFormattedImage>;
};

type BrandingSettings = BrandingForm;

export default function TreaboBrandingSettingsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const uploadMaxFilesizeKb = 20480;
  const uploadMaxFilesizeMb = uploadMaxFilesizeKb / 1024;
  const maxFileSize = uploadMaxFilesizeKb * 1000;

  const {
    control,
    handleSubmit,
    reset,
    watch,
  } = useForm<BrandingForm>({
    defaultValues: {
      logo: null,
      dark_logo: null,
    },
  });

  useEffect(() => {
    getProffiAdmin<BrandingSettings>('/api/admin/branding-settings')
      .then((data) => {
        reset({
          logo: getFormattedImage(data.logo || undefined),
          dark_logo: getFormattedImage(data.dark_logo || undefined),
        });
      })
      .catch((requestError) => setError(requestError.response?.data?.message || requestError.message))
      .finally(() => setLoading(false));
  }, [reset]);

  const logoPreview = watch('logo');
  const darkLogoPreview = watch('dark_logo');

  const onSubmit = async (values: BrandingForm) => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const result = await putProffiAdmin<BrandingSettings>('/api/admin/branding-settings', {
        logo: values.logo || null,
        dark_logo: values.dark_logo || null,
      });
      reset({
        logo: getFormattedImage(result.logo || undefined),
        dark_logo: getFormattedImage(result.dark_logo || undefined),
      });
      setSaved(true);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || requestError.response?.data?.detail || requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader text={t('common:text-loading')} />;
  }

  const logoHelp = (
    <span>
      Логотип для мобильного приложения и сайта Treabo.
      <br />
      Рекомендуемый размер:{' '}
      <span className="font-bold">
        {siteSettings.logo.width}x{siteSettings.logo.height} px
      </span>
      , до <span className="font-bold">{uploadMaxFilesizeMb} MB</span>.
    </span>
  );

  return (
    <>
      <ProffiPageHeader
        title="Treabo — логотип"
        subtitle="Загрузите логотип для мобильного приложения и витрины. Изменения сразу попадают в API /site-settings."
      />
      {error ? <ProffiError message={error} /> : null}
      {saved ? (
        <div className="mb-5 max-w-3xl rounded border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          Логотип сохранён и доступен сайту и приложению.
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
        <Card className="p-5">
          <Description title={t('form:input-label-logo')} details={logoHelp} />
          <FileInput
            name="logo"
            control={control}
            multiple={false}
            maxSize={maxFileSize}
          />
          {logoPreview?.thumbnail || logoPreview?.original ? (
            <img
              src={logoPreview.thumbnail || logoPreview.original}
              alt="Treabo logo preview"
              className="mt-4 max-h-24 rounded border border-border-200 bg-white p-2"
            />
          ) : null}
        </Card>

        <Card className="p-5">
          <Description
            title={t('form:dark-input-label-logo')}
            details="Тёмная версия логотипа для тёмной темы (опционально)."
          />
          <FileInput
            name="dark_logo"
            control={control}
            multiple={false}
            maxSize={maxFileSize}
          />
          {darkLogoPreview?.thumbnail || darkLogoPreview?.original ? (
            <img
              src={darkLogoPreview.thumbnail || darkLogoPreview.original}
              alt="Treabo dark logo preview"
              className="mt-4 max-h-24 rounded border border-border-200 bg-gray-900 p-2"
            />
          ) : null}
        </Card>

        <Button type="submit" loading={saving} disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить логотип'}
        </Button>
      </form>
    </>
  );
}

TreaboBrandingSettingsPage.authenticate = {
  permissions: adminOnly,
};
TreaboBrandingSettingsPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common'])),
  },
});
