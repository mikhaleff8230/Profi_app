import { useState } from 'react';
import Pagination from '@/components/ui/pagination';
import Image from 'next/image';
import { Table } from '@/components/ui/table';
import { siteSettings } from '@/settings/site.settings';
import { useTranslation } from 'next-i18next';
import { useIsRTL } from '@/utils/locals';
import Badge from '@/components/ui/badge/badge';
import { SortOrder, MappedPaginatorInfo } from '@/types';
import TitleWithSort from '@/components/ui/title-with-sort';
import Link from '@/components/ui/link';
import { ShopBillingData } from '@/data/billing-shop';

type IProps = {
  shops: ShopBillingData[] | undefined;
  paginatorInfo: MappedPaginatorInfo | null;
  onPagination: (current: number) => void;
  onSort: (current: any) => void;
  onOrder: (current: string) => void;
};

// Format date helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const ShopBillingList = ({
  shops,
  paginatorInfo,
  onPagination,
  onSort,
  onOrder,
}: IProps) => {
  const { t } = useTranslation();
  const { alignLeft, alignRight } = useIsRTL();

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

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    const statusLabels: Record<string, string> = {
      pending: 'Ожидает оплаты',
      paid: 'Оплачен',
      overdue: 'Просрочен',
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          statusClasses[status] || statusClasses.pending
        }`}
      >
        {statusLabels[status] || status}
      </span>
    );
  };

  const columns = [
    {
      title: t('table:table-item-logo'),
      dataIndex: 'logo',
      key: 'logo',
      align: 'center' as const,
      width: 74,
      render: (logo: any, record: ShopBillingData) => (
        <Image
          src={logo?.thumbnail ?? siteSettings.product.placeholder}
          alt={record?.name}
          width={42}
          height={42}
          className="overflow-hidden rounded"
        />
      ),
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
      render: (name: string, record: ShopBillingData) => (
        <Link href={`/${record.slug}`}>
          <span className="whitespace-nowrap">{name}</span>
        </Link>
      ),
    },
    {
      title: t('table:table-item-owner-name'),
      dataIndex: 'owner',
      key: 'owner',
      align: 'center' as const,
      render: (owner: any) => owner.name,
    },
    {
      title: t('table:table-item-total-products'),
      dataIndex: 'billing',
      key: 'active_products',
      align: 'center' as const,
      render: (billing: any) => billing.active_products,
    },
    {
      title: 'Текущий период',
      dataIndex: 'billing',
      key: 'current_period',
      align: 'center' as const,
      render: (billing: any) => {
        if (!billing.current_invoice) return '-';
        return `${formatDate(billing.current_invoice.period_start)} - ${formatDate(billing.current_invoice.period_end)}`;
      },
    },
    {
      title: 'Статус счёта',
      dataIndex: 'billing',
      key: 'invoice_status',
      align: 'center' as const,
      render: (billing: any) => {
        if (!billing.current_invoice) return '-';
        return getStatusBadge(billing.current_invoice.status);
      },
    },
    {
      title: 'Предстоящий платёж',
      dataIndex: 'billing',
      key: 'upcoming_payment',
      align: 'center' as const,
      render: (billing: any) => {
        if (billing.upcoming_payment > 0) {
          return <span className="font-medium text-heading">{billing.upcoming_payment.toFixed(2)} ₽</span>;
        }
        return '-';
      },
    },
    {
      title: 'Неоплачено',
      dataIndex: 'billing',
      key: 'unpaid_count',
      align: 'center' as const,
      render: (billing: any) => {
        if (billing.unpaid_invoices_count > 0) {
          return <span className="text-red-600 font-medium">{billing.unpaid_invoices_count}</span>;
        }
        return '0';
      },
    },
    {
      title: (
        <TitleWithSort
          title={t('table:table-item-status')}
          ascending={
            sortingObj.sort === SortOrder.Asc &&
            sortingObj.column === 'is_active'
          }
          isActive={sortingObj.column === 'is_active'}
        />
      ),
      className: 'cursor-pointer',
      dataIndex: 'is_active',
      key: 'is_active',
      align: 'center' as const,
      onHeaderCell: () => onHeaderClick('is_active'),
      render: (is_active: boolean) => (
        <Badge
          textKey={is_active ? 'common:text-active' : 'common:text-inactive'}
          color={is_active ? 'bg-accent' : 'bg-red-500'}
        />
      ),
    },
  ];

  return (
    <>
      <div className="mb-6 overflow-hidden rounded shadow">
        <Table
          //@ts-ignore
          columns={columns}
          emptyText={t('table:empty-table-data')}
          data={shops}
          rowKey="id"
          scroll={{ x: 1200 }}
        />
      </div>

      {!!paginatorInfo?.total && (
        <div className="flex items-center justify-end">
          <Pagination
            total={paginatorInfo.total}
            current={paginatorInfo.currentPage}
            pageSize={paginatorInfo.perPage}
            onChange={onPagination}
          />
        </div>
      )}
    </>
  );
};

export default ShopBillingList;



