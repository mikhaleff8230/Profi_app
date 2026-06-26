import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { SortOrder } from '@/types';
import { adminOnly } from '@/utils/auth-utils';
import { useCategoriesQuery } from '@/data/category';
import { Config } from '@/config';
import Layout from '@/components/layouts/admin';
import Card from '@/components/common/card';
import Search from '@/components/common/search';
import LinkButton from '@/components/ui/link-button';
import Button from '@/components/ui/button';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import DraggableCategoryList from '@/components/category/draggable-category-list';
import { Routes } from '@/config/routes';

export default function CategoriesReorder() {
  const { locale } = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const { t } = useTranslation();
  const [orderBy, setOrder] = useState('sort_order');
  const [sortedBy, setColumn] = useState<SortOrder>(SortOrder.Asc);
  const [statusFilter, setStatusFilter] = useState<'all' | 'publish' | 'draft'>('all');

  const { categories, paginatorInfo, loading, error, refetch } = useCategoriesQuery({
    limit: perPage,
    page,
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

  function handlePerPageChange(newPerPage: number) {
    setPerPage(newPerPage);
    setPage(1);
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

            {/* Status Filter */}
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

            {/* Per Page Selector */}
            <div className="flex items-center gap-2 md:ms-6">
              <span className="text-sm text-gray-600">{t('common:text-per-page')}:</span>
              <select
                value={perPage}
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-2 md:ms-6">
              <LinkButton
                href={`${Routes.category.list}`}
                className="h-12 w-full md:w-auto"
                variant="outline"
              >
                {t('common:text-back-to-list')}
              </LinkButton>
              
              {locale === Config.defaultLanguage && (
                <LinkButton
                  href={`${Routes.category.create}`}
                  className="h-12 w-full md:w-auto"
                >
                  <span className="block md:hidden xl:block">
                    + {t('form:button-label-add-categories')}
                  </span>
                  <span className="hidden md:block xl:hidden">
                    + {t('form:button-label-add')}
                  </span>
                </LinkButton>
              )}
            </div>
          </div>
        </div>
      </Card>

      

      {/* Draggable Category List */}
      <DraggableCategoryList
        categories={categories}
        paginatorInfo={paginatorInfo}
        onPagination={handlePagination}
        onRefresh={refetch}
      />
    </>
  );
}

CategoriesReorder.authenticate = {
  permissions: adminOnly,
};
CategoriesReorder.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});

