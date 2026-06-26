import ProductEditor from '@/components/product/editor/ProductEditor';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import ShopLayout from '@/components/layouts/shop';
import {
  adminOnly,
  adminOwnerAndStaffOnly,
  getAuthCredentials,
  hasAccess,
} from '@/utils/auth-utils';
import { useProductQuery } from '@/data/product';
import { Config } from '@/config';
import { Routes } from '@/config/routes';
import { useShopQuery } from '@/data/shop';
import { useMeQuery } from '@/data/user';

export default function EditProductWizardPage() {
  const { query, locale, isReady } = useRouter();
  const { t } = useTranslation();
  const router = useRouter();
  const { permissions } = getAuthCredentials();
  const { data: me } = useMeQuery();
  const { data: shopData, isLoading: loadingShop } = useShopQuery(
    {
      slug: query?.shop as string,
    },
    {
      enabled: Boolean(query?.shop),
    }
  );
  const shopId = shopData?.id;
  const productSlug = query.productSlug as string;
  const shouldFetchProduct = Boolean(productSlug);
  const {
    product,
    isLoading: loading,
    error,
  } = useProductQuery(
    {
      slug: productSlug,
      language: locale || Config.defaultLanguage,
    },
    {
      enabled: shouldFetchProduct && isReady,
      retry: 3, // Повторяем запрос до 3 раз при ошибке 404
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Экспоненциальная задержка
    }
  );

  // Если shop не указан в URL, но товар загружен, получаем shop из товара
  // и редиректим на правильный URL
  if (!query?.shop && product?.shop_id && product?.shop?.slug && isReady && !loading) {
    router.replace(`/${product.shop.slug}/products/${productSlug}/edit-wizard`);
    return <Loader text={t('common:text-loading')} />;
  }

  if (!isReady || (query?.shop && loadingShop) || loading) {
    return <Loader text={t('common:text-loading')} />;
  }
  if (error) return <ErrorMessage message={error.message} />;

  // Если shop указан в URL, проверяем права доступа
  // Суперадмин (adminOnly) имеет доступ ко всем товарам
  if (
    shopId &&
    !hasAccess(adminOnly, permissions) &&
    !me?.shops?.map((shop) => shop.id).includes(shopId) &&
    me?.managed_shop?.id !== shopId
  ) {
    router.replace(Routes.dashboard);
    return null;
  }

  return (
    <>
      <div className="flex py-5 border-b border-dashed border-border-base sm:py-8">
        <h1 className="text-lg font-semibold text-heading">
          Редактирование товара
        </h1>
      </div>
      <ProductEditor initialProduct={product} productId={product?.id} />
    </>
  );
}

EditProductWizardPage.authenticate = {
  permissions: adminOwnerAndStaffOnly,
};

EditProductWizardPage.Layout = ShopLayout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common'])),
  },
});


