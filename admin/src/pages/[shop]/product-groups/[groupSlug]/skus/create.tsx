import ShopLayout from '@/components/layouts/shop';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { adminOwnerAndStaffOnly } from '@/utils/auth-utils';
import { useProductGroupQuery } from '@/data/product-group';
import SkuForm from '@/components/product-group/sku-form';
import Card from '@/components/common/card';
import Description from '@/components/ui/description';

export default function CreateSkuPage() {
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
    const skuListUrl = query.shop
      ? `/${query.shop}/product-groups/${query.groupSlug}/skus`
      : `/product-groups/${query.groupSlug}/skus`;
    router.push(skuListUrl);
  };

  const handleCancel = () => {
    const skuListUrl = query.shop
      ? `/${query.shop}/product-groups/${query.groupSlug}/skus`
      : `/product-groups/${query.groupSlug}/skus`;
    router.push(skuListUrl);
  };

  // Отладка
  console.log('=== Create SKU Page Debug ===');
  console.log('Query:', query);
  console.log('Group Slug:', query.groupSlug);
  console.log('ProductGroup:', productGroup);
  console.log('ProductGroup ID:', productGroup?.id);
  console.log('Loading:', loading);
  console.log('Error:', error);

  if (loading) return <Loader text={t('common:text-loading')} />;
  if (error) return <ErrorMessage message={error.message} />;
  if (!productGroup) {
    return <ErrorMessage message="Product group not found" />;
  }
  
  if (!productGroup.id) {
    return <ErrorMessage message="Product group ID is missing" />;
  }

  return (
    <>
      <div className="flex border-b border-dashed border-border-base pb-5 sm:pb-8">
        <h1 className="text-lg font-semibold text-heading">
          {t('form:form-title-create-sku')} - {productGroup.title}
        </h1>
      </div>

      <div className="my-5 flex flex-wrap sm:my-8">
        <Description
          title={t('form:form-title-create-sku')}
          details={t('form:input-label-sku')}
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />

        <Card className="w-full sm:w-8/12 md:w-2/3">
          <SkuForm
            productGroup={productGroup}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </Card>
      </div>
    </>
  );
}

CreateSkuPage.authenticate = {
  permissions: adminOwnerAndStaffOnly,
};
CreateSkuPage.Layout = ShopLayout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'form', 'table'])),
  },
});

