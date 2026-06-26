import { useState } from 'react';
import { Table } from '@/components/ui/table';
import { Attribute, Shop, SortOrder } from '@/types';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import TitleWithSort from '@/components/ui/title-with-sort';
import { Config } from '@/config';
import Link from '@/components/ui/link';
import { Routes } from '@/config/routes';
import LanguageSwitcher from '@/components/ui/lang-action/action';

export type IProps = {
  attributes: Attribute[] | undefined;
  onSort: (current: any) => void;
  onOrder: (current: string) => void;
};
const AttributeList = ({ attributes, onSort, onOrder }: IProps) => {
  const { t } = useTranslation();
  const router = useRouter();

  const alignLeft =
    router.locale === 'ar' || router.locale === 'he' ? 'right' : 'left';
  const alignRight =
    router.locale === 'ar' || router.locale === 'he' ? 'left' : 'right';

  const [sortingObj, setSortingObj] = useState<{
    sort: SortOrder;
    column: string | null;
  }>({
    sort: SortOrder.Desc,
    column: null,
  });

  const onHeaderClick = (column: string | null) => ({
    onClick: () => {
      onSort((currentSortDirection: SortOrder) =>
        currentSortDirection === SortOrder.Desc ? SortOrder.Asc : SortOrder.Desc
      );
      onOrder(column!);

      setSortingObj({
        sort:
          sortingObj.sort === SortOrder.Desc ? SortOrder.Asc : SortOrder.Desc,
        column: column,
      });
    },
  });

  let columns = [
    {
      title: t('table:table-item-id'),
      dataIndex: 'id',
      key: 'id',
      align: 'center',
      width: 60,
    },
    {
      title: (
        <TitleWithSort
          title={t('table:table-item-title')}
          ascending={
            sortingObj.sort === SortOrder.Asc && sortingObj.column === 'name'
          }
          isActive={sortingObj.column === 'name'}
        />
      ),
      className: 'cursor-pointer',
      dataIndex: 'name',
      key: 'name',
      align: alignLeft,
      onHeaderCell: () => onHeaderClick('name'),
      render: (name: any) => <span className="whitespace-nowrap">{name}</span>,
    },
    {
      title: t('table:table-item-type'),
      dataIndex: 'type',
      key: 'type',
      width: 120,
      align: 'center',
      render: (type: string) => (
        <span className="whitespace-nowrap capitalize">{type || 'text'}</span>
      ),
    },
    {
      title: t('table:table-item-display-type'),
      dataIndex: 'display_type',
      key: 'display_type',
      width: 150,
      align: 'center',
      render: (displayType: string) => (
        <span className="whitespace-nowrap capitalize">
          {displayType ? displayType.replace('_', ' ') : 'input'}
        </span>
      ),
    },
    {
      title: t('table:table-item-values'),
      dataIndex: 'values',
      key: 'values',
      align: alignLeft,
      render: (values: any) => {
        return (
          <span className="whitespace-nowrap">
            {values?.map((singleValues: any, index: number) => {
              return index > 0
                ? `, ${singleValues.value}`
                : `${singleValues.value}`;
            })}
          </span>
        );
      },
    },
    {
      title: t('table:table-item-actions'),
      dataIndex: 'slug',
      key: 'actions',
      align: alignRight,
      render: (slug: string, record: Attribute) => (
        <LanguageSwitcher
          slug={slug}
          record={record}
          deleteModalView="DELETE_ATTRIBUTE"
          routes={Routes?.attribute}
        />
      ),
    },
  ];

  // Убираем колонку SHOP из списка атрибутов (всегда скрыта)
  columns = columns?.filter((column) => column?.key !== 'shop');
  return (
    <div className="mb-8 overflow-hidden rounded shadow">
      <Table
        // @ts-ignore
        columns={columns}
        emptyText={t('table:empty-table-data')}
        data={attributes}
        rowKey="id"
        scroll={{ x: 380 }}
      />
    </div>
  );
};

export default AttributeList;
