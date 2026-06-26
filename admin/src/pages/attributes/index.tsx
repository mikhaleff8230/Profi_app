import Card from '@/components/common/card';
import Layout from '@/components/layouts/admin';
import AttributeList from '@/components/attribute/attribute-list';
import Search from '@/components/common/search';
import { Routes } from '@/config/routes';
import { Config } from '@/config';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { SortOrder } from '@/types';
import { useState } from 'react';
import LinkButton from '@/components/ui/link-button';
import { adminOnly } from '@/utils/auth-utils';

import { useRouter } from 'next/router';
import { useAttributesQuery } from '@/data/attributes';

export default function AttributePage() {
  const { t } = useTranslation();
  const [orderBy, setOrder] = useState('created_at');
  const [sortedBy, setColumn] = useState<SortOrder>(SortOrder.Desc);
  const { locale } = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const { attributes, loading, error } = useAttributesQuery({
    name: searchTerm,
    orderBy,
    sortedBy,
    language: locale,
  });

  if (loading) return <Loader text={t('common:text-loading')} />;
  if (error) return <ErrorMessage message={error.message} />;
  return (
    <>
      <Card className="mb-8 flex flex-col items-center justify-between md:flex-row">
        <div className="mb-4 md:mb-0 md:w-1/4">
          <h1 className="text-xl font-semibold text-heading">
            {t('common:sidebar-nav-item-attributes')}
          </h1>
        </div>
        <div className="flex w-full flex-col items-center space-y-4 ms-auto md:w-3/4 md:flex-row md:space-y-0 xl:w-2/4">
          <Search
            onSearch={({ searchText }) => setSearchTerm(searchText)}
            placeholderText={t('form:input-placeholder-search-name')}
          />
          {locale === Config.defaultLanguage && (
            <LinkButton
              href={Routes.attribute.create}
              className="h-12 w-full md:w-auto md:ms-6"
            >
              <span>
                + {t('form:button-label-add')} {t('common:attribute')}
              </span>
            </LinkButton>
          )}
        </div>
      </Card>
      <AttributeList
        attributes={attributes}
        onOrder={setOrder}
        onSort={setColumn}
      />
    </>
  );
}

AttributePage.authenticate = {
  permissions: adminOnly,
};

AttributePage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
