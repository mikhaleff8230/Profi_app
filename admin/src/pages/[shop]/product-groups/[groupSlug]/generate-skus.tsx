import Card from '@/components/common/card';
import ShopLayout from '@/components/layouts/shop';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { adminOwnerAndStaffOnly } from '@/utils/auth-utils';
import { useProductGroupQuery } from '@/data/product-group';
import SkuGeneratorProper from '@/components/product-group/sku-generator-proper';

export default function GenerateSkusPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { query, locale } = router;

  const {
    productGroup,
    isLoading: loading,
    error,
  } = useProductGroupQuery({
    slug: query.groupSlug as string,
    language: locale!,
  });

  const handleSuccess = () => {
    // Переходим на страницу со списком SKU
    router.push(`/${query.shop}/product-groups/${query.groupSlug}/skus`);
  };

  if (loading) return <Loader text={t('common:text-loading')} />;
  if (error) return <ErrorMessage message={error.message} />;
  if (!productGroup) {
    return <ErrorMessage message="Product group not found" />;
  }

  return (
    <>
      <div className="flex border-b border-dashed border-border-base pb-5 sm:pb-8">
        <h1 className="text-lg font-semibold text-heading">
          {t('form:form-title-generate-skus')} - {productGroup.title}
        </h1>
      </div>
      <SkuGeneratorProper productGroup={productGroup} onSuccess={handleSuccess} />
    </>
  );
}

GenerateSkusPage.authenticate = {
  permissions: adminOwnerAndStaffOnly,
};
GenerateSkusPage.Layout = ShopLayout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'form', 'table'])),
  },
});

