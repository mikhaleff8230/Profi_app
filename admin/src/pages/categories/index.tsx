import CategoryList from '@/components/category/category-list';
import Card from '@/components/common/card';
import Layout from '@/components/layouts/admin';
import Search from '@/components/common/search';
import LinkButton from '@/components/ui/link-button';
import Button from '@/components/ui/button';
import { useState } from 'react';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { SortOrder, Type } from '@/types';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Routes } from '@/config/routes';
import TypeFilter from '@/components/category/type-filter';
import { adminOnly } from '@/utils/auth-utils';
import { useCategoriesQuery } from '@/data/category';
import { useRouter } from 'next/router';
import { Config } from '@/config';

export default function Categories() {
  const { locale } = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const { t } = useTranslation();
  const [orderBy, setOrder] = useState('created_at');
  const [sortedBy, setColumn] = useState<SortOrder>(SortOrder.Desc);
  const [statusFilter, setStatusFilter] = useState<'all' | 'publish' | 'draft'>('all');
  const { categories, paginatorInfo, loading, error, refetch } = useCategoriesQuery({
    limit: 20,
    page,
    type,
    name: searchTerm,
    orderBy,
    sortedBy,
    parent: null,
    language: locale,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  if (loading) return <Loader text={t('common:text-loading')} />;
  if (error) return <ErrorMessage message={error.message} />;

  function handleSearch({ searchText }: { searchText: string }) {
    setSearchTerm(searchText);
    setPage(1);
  }

  function handlePagination(current: any) {
    setPage(current);
  }

  return (
    <>
      <Card className="mb-8 flex flex-col">
        <div className="flex w-full flex-col items-center md:flex-row">
          <div className="mb-4 md:mb-0 md:w-1/4">
            <h1 className="text-xl font-semibold text-heading">
              {t('form:input-label-categories')}
            </h1>
          </div>

          <div className="flex w-full flex-col items-center space-y-4 ms-auto md:flex-row md:space-y-0 md:gap-4 xl:w-3/4 xl:gap-6">
            <Search
              onSearch={handleSearch}
              placeholderText={t('form:input-placeholder-search-name')}
            />

            <div className="flex items-center gap-2 md:ms-6">
              <Button
                variant={statusFilter === 'all' ? 'normal' : 'outline'}
                size="small"
                onClick={() => {
                  setStatusFilter('all');
                  setPage(1);
                }}
              >
                {t('common:text-all')}
              </Button>
              <Button
                variant={statusFilter === 'publish' ? 'normal' : 'outline'}
                size="small"
                onClick={() => {
                  setStatusFilter('publish');
                  setPage(1);
                }}
              >
                {t('common:text-status-publish')}
              </Button>
              <Button
                variant={statusFilter === 'draft' ? 'normal' : 'outline'}
                size="small"
                onClick={() => {
                  setStatusFilter('draft');
                  setPage(1);
                }}
              >
                {t('common:text-status-draft')}
              </Button>
            </div>

						{/* <TypeFilter
              className="md:ms-6"
              onTypeFilter={(type: Type) => {
                setType(type?.slug!);
                setPage(1);
              }}
            /> */}

            {locale === Config.defaultLanguage && (
              <div className="flex items-center gap-2">
                <LinkButton
                  href={`${Routes.category.list}/reorder`}
                  className="h-9 px-3 text-sm w-full md:w-auto"
                  variant="outline"
                >
                  {t('common:text-reorder')}
                </LinkButton>
                <LinkButton
                  href={`${Routes.category.create}`}
                  className="h-12 w-full md:w-auto md:ms-8"
                >
                  <span className="block md:hidden xl:block">
                    + {t('form:button-label-add-categories')}
                  </span>
                  <span className="hidden md:block xl:hidden">
                    + {t('form:button-label-add')}
                  </span>
                </LinkButton>
              </div>
            )}
          </div>
        </div>
      </Card>
      <CategoryList
        categories={categories}
        paginatorInfo={paginatorInfo}
        onPagination={handlePagination}
        onOrder={setOrder}
        onSort={setColumn}
        onRefresh={refetch}
        autoExpandLevels={0}
        statusFilter={statusFilter}
      />
    </>
  );
}

Categories.authenticate = {
	permissions: adminOnly,
};
Categories.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
