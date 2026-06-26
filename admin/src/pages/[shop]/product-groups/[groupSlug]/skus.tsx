import Card from '@/components/common/card';
import Layout from '@/components/layouts/admin';
import Search from '@/components/common/search';
import LinkButton from '@/components/ui/link-button';
import { useState } from 'react';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import ShopLayout from '@/components/layouts/shop';
import { useRouter } from 'next/router';
import { adminOwnerAndStaffOnly } from '@/utils/auth-utils';
import { useProductGroupQuery, useProductSkusQuery, useDeleteProductSkuMutation } from '@/data/product-group';
import { Routes } from '@/config/routes';
import SkuList from '@/components/product-group/sku-list';
import { SortOrder, ProductSku } from '@/types';
import { useModalAction } from '@/components/ui/modal/modal.context';
import Pagination from '@/components/ui/pagination';

export default function ProductGroupSkusPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { query, locale } = router;
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState('created_at');
  const [sortedBy, setSortedBy] = useState<SortOrder>(SortOrder.Desc);
  const { openModal } = useModalAction();
  const { mutate: deleteSku } = useDeleteProductSkuMutation();

  const {
    productGroup,
    isLoading: loadingGroup,
    error: errorGroup,
  } = useProductGroupQuery({
    slug: query.groupSlug as string,
    language: locale!,
  });

  const {
    productSkus: skus,
    paginatorInfo,
    loading: loadingSkus,
    error: errorSkus,
  } = useProductSkusQuery({
    group_id: productGroup?.id?.toString(),
    limit: 20,
    page,
    orderBy,
    sortedBy,
    language: locale,
  });

  if (loadingGroup) return <Loader text={t('common:text-loading')} />;
  if (errorGroup) return <ErrorMessage message={errorGroup.message} />;
  if (!productGroup) {
    return <ErrorMessage message="Product group not found" />;
  }

  function handleSearch({ searchText }: { searchText: string }) {
    setSearchTerm(searchText);
    setPage(1);
  }

  function handlePagination(current: number) {
    setPage(current);
  }

  function handleEdit(sku: ProductSku) {
    // ✅ Используем slug вместо id!
    const skuSlug = sku.slug || sku.id;
    const editUrl = shop
      ? `/${shop}${Routes.productGroup.list}/${productGroup!.slug}/skus/${skuSlug}/edit`
      : `${Routes.productGroup.list}/${productGroup!.slug}/skus/${skuSlug}/edit`;
    router.push(editUrl);
  }

  function handleDelete(id: string) {
    deleteSku({ id });
  }

  const shop = query.shop as string;
  const createSkuUrl = shop
    ? `/${shop}${Routes.productGroup.list}/${productGroup.slug}/skus/create`
    : `${Routes.productGroup.list}/${productGroup.slug}/skus/create`;
  const generateSkusUrl = shop
    ? `/${shop}${Routes.productGroup.list}/${productGroup.slug}/generate-skus`
    : `${Routes.productGroup.list}/${productGroup.slug}/generate-skus`;

  // URL для списка групповых товаров
  const productGroupsListUrl = shop
    ? `/${shop}${Routes.productGroup.list}`
    : Routes.productGroup.list;

  return (
    <>
      <Card className="mb-8 flex flex-col items-center xl:flex-row">
        <div className="mb-4 md:w-1/3 xl:mb-0">
          <div className="flex items-center gap-3 mb-2">
            <LinkButton
              href={productGroupsListUrl}
              className="h-9 px-3 text-sm"
              variant="outline"
            >
              ← {t('common:text-back-to-product-groups-list') || 'Назад к списку товаров'}
            </LinkButton>
          </div>
          <h1 className="text-xl font-semibold text-heading">
            {productGroup.title}
          </h1>
          <p className="text-sm text-body">
            {t('common:text-manage-skus')} - {productGroup.slug}
          </p>
        </div>

        <div className="flex w-full flex-col items-center space-y-4 ms-auto md:w-2/3 md:flex-row md:space-y-0 xl:w-1/2">
          <Search 
            onSearch={handleSearch} 
            placeholderText={t('form:input-placeholder-search')}
          />
          
          <LinkButton
            href={generateSkusUrl}
            className="h-12 w-full md:w-auto md:ms-6"
          >
            <span className="block md:hidden xl:block">
              + {t('form:button-label-generate-skus')}
            </span>
            <span className="hidden md:block xl:hidden">
              + {t('form:button-label-generate-skus')}
            </span>
          </LinkButton>

          <LinkButton
            href={createSkuUrl}
            className="h-12 w-full md:w-auto md:ms-6"
          >
            <span className="block md:hidden xl:block">
              + {t('form:button-label-add-sku')}
            </span>
            <span className="hidden md:block xl:hidden">
              + {t('form:button-label-add')}
            </span>
          </LinkButton>
        </div>
      </Card>

      {loadingSkus ? (
        <Loader text={t('common:text-loading')} />
      ) : errorSkus ? (
        <ErrorMessage message={errorSkus.message} />
      ) : !skus || skus.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">{t('table:empty-table-data')}</p>
          <p className="text-sm text-gray-400 mt-2">
            {t('form:help-text-no-skus') || 'Создайте SKU используя кнопки выше'}
          </p>
        </Card>
      ) : (
        <>
          <SkuList
            skus={skus}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          
          {!!paginatorInfo?.total && (
            <div className="flex items-center justify-end mt-6">
              <Pagination
                total={paginatorInfo.total}
                current={paginatorInfo.currentPage}
                pageSize={paginatorInfo.perPage}
                onChange={handlePagination}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}

ProductGroupSkusPage.authenticate = {
  permissions: adminOwnerAndStaffOnly,
};
ProductGroupSkusPage.Layout = ShopLayout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
