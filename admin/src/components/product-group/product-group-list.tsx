import { Table } from '@/components/ui/table';
import ActionButtons from '@/components/common/action-buttons';
import { useTranslation } from 'next-i18next';
import { useIsRTL } from '@/utils/locals';
import { Routes } from '@/config/routes';
import { ProductGroup } from '@/types';
import Badge from '@/components/ui/badge/badge';
import { useRouter } from 'next/router';

export type IProps = {
  productGroups: ProductGroup[] | undefined;
  onDelete: (id: string) => void;
};

const ProductGroupList = ({ productGroups, onDelete }: IProps) => {
  const { t } = useTranslation();
  const { alignLeft } = useIsRTL();
  const router = useRouter();

  const columns = [
    {
      title: t('table:table-item-id'),
      dataIndex: 'id',
      key: 'id',
      align: alignLeft,
      width: 80,
    },
    {
      title: t('table:table-item-title'),
      dataIndex: 'title',
      key: 'title',
      align: alignLeft,
      width: 250,
      render: (title: string, record: ProductGroup) => (
        <div>
          <span className="font-semibold">{title}</span>
          <div className="text-xs text-gray-500">{record.slug}</div>
        </div>
      ),
    },
    {
      title: t('table:table-item-shop'),
      dataIndex: 'shop',
      key: 'shop',
      align: alignLeft,
      width: 150,
      render: (shop: any) => shop?.name || '-',
    },
    {
      title: t('table:table-item-type'),
      dataIndex: 'type',
      key: 'type',
      align: alignLeft,
      width: 120,
      render: (type: any) => type?.name || '-',
    },
    {
      title: 'SKU',
      dataIndex: 'skus_count',
      key: 'skus_count',
      align: 'center',
      width: 80,
      render: (count: number, record: ProductGroup) => {
        // Используем skus_count из данных, или считаем из массива skus/activeSkus
        const skuCount = count ?? record.skus?.length ?? record.activeSkus?.length ?? 0;
        return (
          <Badge text={skuCount.toString()} color="bg-accent" />
        );
      },
    },
    {
      title: t('table:table-item-price-range'),
      key: 'price',
      align: 'center',
      width: 150,
      render: (record: ProductGroup) => {
        const minPrice = record.min_price ?? 0;
        const maxPrice = record.max_price ?? 0;
        
        // Если цены не определены или равны 0
        if (!minPrice && !maxPrice) {
          return '-';
        }
        
        if (minPrice === maxPrice) {
          return `${minPrice} ₽`;
        }
        return `${minPrice} - ${maxPrice} ₽`;
      },
    },
    {
      title: t('table:table-item-status'),
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      width: 100,
      render: (status: string) => {
        // Функция перевода статуса
        const getStatusTranslation = (statusValue: string): string => {
          const statusLower = statusValue?.toLowerCase() || '';
          switch (statusLower) {
            case 'publish':
              return t('common:text-status-publish');
            case 'draft':
              return t('common:text-status-draft');
            case 'under_review':
              return t('common:text-status-under-review');
            default:
              return statusValue;
          }
        };

        const translatedStatus = getStatusTranslation(status);

        return (
          <Badge
            text={translatedStatus}
            color={
              status.toLowerCase() === 'publish'
                ? 'bg-accent'
                : 'bg-status-failed'
            }
          />
        );
      },
    },
    {
      title: t('table:table-item-actions'),
      dataIndex: 'id',
      key: 'actions',
      align: 'center',
      width: 200,
      render: (id: string, record: ProductGroup) => {
        const shop = router.query.shop;
        
        return (
          <div className="flex items-center justify-center gap-2">
            <ActionButtons
              id={id}
              editUrl={
                shop
                  ? `/${shop}/product-groups/${record.slug}/edit`
                  : `/product-groups/${record.slug}/edit`
              }
              deleteModalView="DELETE_PRODUCT_GROUP"
            />
            <button
              onClick={() => {
                const skuUrl = shop
                  ? `/${shop}/product-groups/${record.slug}/skus`
                  : `/product-groups/${record.slug}/skus`;
                router.push(skuUrl);
              }}
              className="text-sm transition-colors duration-200 hover:opacity-80 focus:outline-none"
              style={{ color: '#627eeb' }}
              title={t('common:text-manage-skus')}
            >
              SKU
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="mb-6 overflow-hidden rounded shadow">
      <Table
        //@ts-ignore
        columns={columns}
        emptyText={t('table:empty-table-data')}
        data={productGroups}
        rowKey="id"
        scroll={{ x: 1000 }}
      />
    </div>
  );
};

export default ProductGroupList;



