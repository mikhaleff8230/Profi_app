import ShopLayout from '@/components/layouts/shop';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { adminOwnerAndStaffOnly } from '@/utils/auth-utils';
import { useProductGroupQuery, useProductSkuQuery } from '@/data/product-group';
import SkuForm from '@/components/product-group/sku-form';
import LinkButton from '@/components/ui/link-button';
import { Routes } from '@/config/routes';

export default function EditSkuPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { query, locale } = router;

  const {
    productGroup,
    isLoading: loadingGroup,
    error: errorGroup,
  } = useProductGroupQuery({
    slug: query.groupSlug as string,
    language: locale!,
  });

  // ✅ Используем slug из query (skuId на самом деле slug!)
  const skuSlug = query.skuId as string;

  const {
    sku,
    isLoading: loadingSku,
    error: errorSku,
  } = useProductSkuQuery({
    slug: skuSlug, // ✅ Используем slug!
    language: locale,
  });


  if (loadingGroup || loadingSku) return <Loader text={t('common:text-loading')} />;
  if (errorGroup) return <ErrorMessage message={errorGroup.message} />;
  if (errorSku) return <ErrorMessage message={errorSku.message} />;
  if (!productGroup) {
    return <ErrorMessage message="Product group not found" />;
  }
  if (!sku) {
    return <ErrorMessage message="SKU not found" />;
  }

  // URL для списка SKU
  const skusListUrl = Routes.productGroup.manageSkus(
    query.groupSlug as string,
    query.shop as string
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-dashed border-border-base pb-5 sm:pb-8">
        <div className="flex items-center gap-3">
          <LinkButton
            href={skusListUrl}
            className="h-9 px-3 text-sm"
            variant="outline"
          >
            ← {t('common:text-back-to-skus-list') || 'Назад к списку SKU'}
          </LinkButton>
          <h1 className="text-lg font-semibold text-heading">
            {t('form:form-title-edit-sku')} - {sku.title}
          </h1>
        </div>
      </div>
      
      <SkuForm productGroup={productGroup} initialValues={sku} />
    </>
  );
}

EditSkuPage.authenticate = {
  permissions: adminOwnerAndStaffOnly,
};
EditSkuPage.Layout = ShopLayout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'form', 'table'])),
  },
});


