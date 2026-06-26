import ProductEditor from '@/components/product/editor/ProductEditor';
import ShopLayout from '@/components/layouts/shop';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { adminOwnerAndStaffOnly } from '@/utils/auth-utils';
import { useTranslation } from 'next-i18next';

export default function CreateProductPage() {
  const { t } = useTranslation();

  return (
    <>
      <ProductEditor />
    </>
  );
}

CreateProductPage.authenticate = {
  permissions: adminOwnerAndStaffOnly,
};

CreateProductPage.Layout = ShopLayout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common'])),
  },
});
