import Layout from '@/components/layouts/admin';
import { ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import Card from '@/components/common/card';
import Description from '@/components/ui/description';
import FileInput from '@/components/ui/file-input';
import Loader from '@/components/ui/loader/loader';
import Button from '@/components/ui/button';
import { useSettingsQuery, useUpdateSettingsMutation } from '@/data/settings';
import { siteSettings } from '@/settings/site.settings';
import { adminOnly } from '@/utils/auth-utils';
import { getFormattedImage } from '@/utils/get-formatted-image';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

type BrandingForm = {
  logo: ReturnType<typeof getFormattedImage>;
  dark_logo: ReturnType<typeof getFormattedImage>;
};

export default function TreaboBrandingSettingsPage() {
  const { t } = useTranslation();
  const { locale } = useRouter();
  const { settings, loading, error } = useSettingsQuery({ language: locale! });
  const { mutate: updateSettings, isLoading: saving } = useUpdateSettingsMutation();

  const options = settings?.options ?? {};
  const uploadMaxFilesizeKb =
    options?.server_info?.upload_max_filesize ?? 2048;
  const uploadMaxFilesizeMb = uploadMaxFilesizeKb / 1024;
  const maxFileSize = uploadMaxFilesizeKb * 1000;

  const {
    control,
    handleSubmit,
    reset,
    watch,
  } = useForm<BrandingForm>({
    defaultValues: {
      logo: getFormattedImage(options?.logo),
      dark_logo: getFormattedImage(options?.dark_logo),
    },
  });

  useEffect(() => {
    reset({
      logo: getFormattedImage(options?.logo),
      dark_logo: getFormattedImage(options?.dark_logo),
    });
  }, [options?.logo, options?.dark_logo, reset]);

  const logoPreview = watch('logo');
  const darkLogoPreview = watch('dark_logo');

  const onSubmit = (values: BrandingForm) => {
    updateSettings({
      language: locale,
      options: {
        ...options,
        logo: values.logo,
        dark_logo: values.dark_logo,
      },
    });
  };

  if (loading) {
    return <Loader text={t('common:text-loading')} />;
  }

  if (error) {
    return <ProffiError message={error.message} />;
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

        <Button loading={saving} disabled={saving}>
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
