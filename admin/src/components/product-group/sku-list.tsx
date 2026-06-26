import { Table } from '@/components/ui/table';
import { useTranslation } from 'next-i18next';
import { useIsRTL } from '@/utils/locals';
import { ProductSku } from '@/types';
import Badge from '@/components/ui/badge/badge';
import { EditIcon } from '@/components/icons/edit';
import { TrashIcon } from '@/components/icons/trash';
import { useModalAction } from '@/components/ui/modal/modal.context';
import Image from 'next/image';
import { siteSettings } from '@/settings/site.settings';

export type IProps = {
  skus: ProductSku[] | undefined;
  onEdit: (sku: ProductSku) => void;
  onDelete: (id: string) => void;
};

const SkuList = ({ skus, onEdit, onDelete }: IProps) => {
  const { t } = useTranslation();
  const { alignLeft } = useIsRTL();
  const { openModal } = useModalAction();

  const columns = [
    {
      title: t('table:table-item-image'),
      dataIndex: 'image',
      key: 'image',
      align: alignLeft,
      width: 80,
      render: (image: any) => {
        const imageUrl = image?.thumbnail || image?.original || siteSettings.product.placeholder;
        return (
          <div className="relative h-12 w-12 overflow-hidden rounded">
            <Image
              src={imageUrl}
              alt="SKU"
              layout="fill"
              objectFit="cover"
            />
          </div>
        );
      },
    },
    {
      title: t('table:table-item-title'),
      dataIndex: 'title',
      key: 'title',
      align: alignLeft,
      width: 200,
      render: (title: string, record: ProductSku) => (
        <div>
          <div className="font-medium">{title || record.slug}</div>
          {record.sku && (
            <div className="text-xs text-gray-500">SKU: {record.sku}</div>
          )}
        </div>
      ),
    },
    {
      title: t('table:table-item-properties'),
      dataIndex: 'propertyValues',
      key: 'properties',
      align: alignLeft,
      width: 300,
      render: (propertyValues: any[], record: ProductSku) => {
        // ВАЖНО: API возвращает property_values (с подчеркиванием), а не propertyValues!
        const attrs = (record as any).property_values || propertyValues;
        
        if (!attrs || !Array.isArray(attrs) || attrs.length === 0) {
          return <span className="text-gray-400 italic">Нет атрибутов</span>;
        }
        return (
          <div className="flex flex-wrap gap-1.5">
            {attrs.map((pv: any, idx: number) => {
              const attrName = pv.attribute?.name || 'Атрибут';
              const attrValue = pv.value || pv.name || 'Значение';
              return (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-xs whitespace-nowrap relative text-light bg-accent/10 text-accent text-xs font-medium border border-accent/20"
                >
                  <strong style={{ color: '#67732b' }}>{attrName}:</strong> <span style={{ color: 'chocolate' }}>{attrValue}</span>
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      title: t('table:table-item-price'),
      dataIndex: 'price',
      key: 'price',
      align: 'center',
      width: 120,
      render: (price: number, record: ProductSku) => {
        const salePrice = (record as any).sale_price || (record as any).old_price;
        return (
          <div>
            <div className="font-semibold">{price} ₽</div>
            {salePrice && salePrice > price && (
              <div className="text-xs text-gray-400 line-through">
                {salePrice} ₽
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: t('table:table-item-quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      width: 100,
      render: (quantity: number) => (
        <Badge
          text={quantity.toString()}
          color={quantity > 0 ? 'bg-accent' : 'bg-status-failed'}
        />
      ),
    },
    {
      title: t('table:table-item-status'),
      dataIndex: 'is_active',
      key: 'is_active',
      align: 'center',
      width: 100,
      render: (isActive: boolean) => (
        <Badge
          text={isActive ? t('common:text-active') : t('common:text-inactive')}
          color={isActive ? 'bg-accent' : 'bg-status-failed'}
        />
      ),
    },
    {
      title: t('table:table-item-actions'),
      dataIndex: 'id',
      key: 'actions',
      align: 'center',
      width: 120,
      render: (id: string, record: ProductSku) => (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onEdit(record)}
            className="transition duration-200 hover:opacity-80 focus:outline-none"
            style={{ color: '#627eeb' }}
            title={t('common:text-edit')}
          >
            <EditIcon width={16} />
          </button>
          <button
            onClick={() => {
              openModal('DELETE_PRODUCT_SKU', id);
            }}
            className="text-red-500 transition duration-200 hover:text-red-600 focus:outline-none"
            title={t('common:text-delete')}
          >
            <TrashIcon width={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mb-6 overflow-hidden rounded shadow">
      <Table
        //@ts-ignore
        columns={columns}
        emptyText={t('table:empty-table-data')}
        data={skus}
        rowKey="id"
        scroll={{ x: 900 }}
      />
    </div>
  );
};

export default SkuList;



