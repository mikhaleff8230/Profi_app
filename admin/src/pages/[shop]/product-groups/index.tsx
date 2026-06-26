import Card from '@/components/common/card';
import Search from '@/components/common/search';
import ShopLayout from '@/components/layouts/shop';
import ProductGroupList from '@/components/product-group/product-group-list';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { useProductGroupsQuery, useDeleteProductGroupMutation } from '@/data/product-group';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { SortOrder } from '@/types';
import { adminOnly, getAuthCredentials, hasAccess, adminOwnerAndStaffOnly } from '@/utils/auth-utils';
import { Routes } from '@/config/routes';
import { useShopQuery } from '@/data/shop';
import { useMeQuery } from '@/data/user';
import { Config } from '@/config';
import LinkButton from '@/components/ui/link-button';
import { toast } from 'react-toastify';
import Pagination from '@/components/ui/pagination';

export default function ProductGroupsPage() {
  const router = useRouter();
  const { locale } = useRouter();
  const { t } = useTranslation();
  const { permissions } = getAuthCredentials();
  const { data: me } = useMeQuery();
  const { data: shopData } = useShopQuery({
    slug: router.query.shop as string,
  });
  const shopId = shopData?.id!;

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const { productGroups, paginatorInfo, loading, error } = useProductGroupsQuery({
    limit: 20,
    page,
    name: searchTerm,
    shop_id: shopId,
    language: locale,
    orderBy: 'created_at',
    sortedBy: SortOrder.Desc,
  });

  const { mutate: deleteProductGroup } = useDeleteProductGroupMutation();

  function handleSearch({ searchText }: { searchText: string }) {
    setSearchTerm(searchText);
    setPage(1);
  }

  function handlePagination(current: number) {
    setPage(current);
  }

  if (
    !hasAccess(adminOnly, permissions) &&
    !me?.shops?.map((shop) => shop.id).includes(shopId) &&
    me?.managed_shop?.id != shopId
  ) {
    router.replace(Routes.dashboard);
  }

  if (loading) return <Loader text={t('common:text-loading')} />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <>
      <Card className="mb-8 flex flex-col">
        <div className="flex w-full flex-col items-center md:flex-row">
          <div className="mb-4 md:mb-0 md:w-1/4">
            <h1 className="text-lg font-semibold text-heading">
              {t('form:input-label-product-groups')}
            </h1>
          </div>

          <div className="flex w-full flex-col items-center md:w-3/4 md:flex-row">
            <div className="flex w-full items-center">
              <Search
                onSearch={handleSearch}
                placeholderText={t('form:input-placeholder-search-name')}
              />

              {locale === Config.defaultLanguage && (
                <LinkButton
                  href={`/${router.query.shop}/product-groups/create`}
                  className="ms-4 h-12 md:ms-6"
                >
                  <span className="hidden md:block">
                    + {t('form:button-label-add-product-group')}
                  </span>
                  <span className="md:hidden">+</span>
                </LinkButton>
              )}
            </div>
          </div>
        </div>
      </Card>

      <ProductGroupList
        productGroups={productGroups}
        onDelete={(id: string) => {
          deleteProductGroup({ id });
        }}
      />

      {!!paginatorInfo?.total && (
        <div className="flex items-center justify-end">
          <Pagination
            total={paginatorInfo.total}
            current={paginatorInfo.currentPage}
            pageSize={paginatorInfo.perPage}
            onChange={handlePagination}
          />
        </div>
      )}
    </>
  );
}

ProductGroupsPage.authenticate = {
  permissions: adminOwnerAndStaffOnly,
};
ProductGroupsPage.Layout = ShopLayout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'form', 'table'])),
  },
});



