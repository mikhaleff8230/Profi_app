import Pagination from '@/components/ui/pagination';
import Image from 'next/image';
import { Table } from '@/components/ui/table';
import { siteSettings } from '@/settings/site.settings';
import usePrice from '@/utils/use-price';
import Badge from '@/components/ui/badge/badge';
import { Router, useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import {
  Product,
  MappedPaginatorInfo,
  ProductType,
  Shop,
  SortOrder,
} from '@/types';
import { useIsRTL } from '@/utils/locals';
import { useState } from 'react';
import TitleWithSort from '@/components/ui/title-with-sort';
import cn from 'classnames';
import { Routes } from '@/config/routes';
import LanguageSwitcher from '@/components/ui/lang-action/action';
import ProductStatusAction from '@/components/ui/product-status-action';
import Button from '@/components/ui/button';
import { TrashIcon } from '@/components/icons/trash';

export type IProps = {
  products: Product[] | undefined;
  paginatorInfo: MappedPaginatorInfo | null;
  onPagination: (current: number) => void;
  onSort: (current: any) => void;
  onOrder: (current: string) => void;
  onBulkDelete?: (productIds: string[]) => void;
  isDeleting?: boolean;
  selectedProducts?: string[];
  onSelectedProductsChange?: (products: string[]) => void;
  onUngroup?: () => void;
  canUngroup?: boolean;
  isUngrouping?: boolean;
  onEditGroup?: () => void;
  canEditGroup?: boolean;
};

type SortingObjType = {
  sort: SortOrder;
  column: string | null;
};

const ProductList = ({
  products,
  paginatorInfo,
  onPagination,
  onSort,
  onOrder,
  onBulkDelete,
  isDeleting = false,
  selectedProducts: externalSelectedProducts,
  onSelectedProductsChange,
  onUngroup,
  canUngroup = false,
  isUngrouping = false,
  onEditGroup,
  canEditGroup = false,
}: IProps) => {
  // const { data, paginatorInfo } = products! ?? {};
  const router = useRouter();
  const { t } = useTranslation();
  const { alignLeft, alignRight } = useIsRTL();

  const [sortingObj, setSortingObj] = useState<SortingObjType>({
    sort: SortOrder.Desc,
    column: null,
  });

  // Используем внешнее состояние, если передано, иначе внутреннее
  const [internalSelectedProducts, setInternalSelectedProducts] = useState<string[]>([]);
  const selectedProducts = externalSelectedProducts !== undefined ? externalSelectedProducts : internalSelectedProducts;
  const setSelectedProducts = onSelectedProductsChange || setInternalSelectedProducts;
  const [selectAll, setSelectAll] = useState(false);

  // Функции для работы с выбранными товарами
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const allProductIds = products?.map(product => product.id) || [];
      // Если используется внешнее состояние, обновляем его напрямую
      if (onSelectedProductsChange) {
        onSelectedProductsChange(allProductIds);
      } else {
        setInternalSelectedProducts(allProductIds);
      }
    } else {
      // Если используется внешнее состояние, обновляем его напрямую
      if (onSelectedProductsChange) {
        onSelectedProductsChange([]);
      } else {
        setInternalSelectedProducts([]);
      }
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      // Если используется внешнее состояние, обновляем его напрямую
      if (onSelectedProductsChange) {
        onSelectedProductsChange([...selectedProducts, productId]);
      } else {
        setInternalSelectedProducts(prev => [...prev, productId]);
      }
    } else {
      // Если используется внешнее состояние, обновляем его напрямую
      if (onSelectedProductsChange) {
        onSelectedProductsChange(selectedProducts.filter(id => id !== productId));
      } else {
        setInternalSelectedProducts(prev => prev.filter(id => id !== productId));
      }
      setSelectAll(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedProducts.length === 0) {
      return;
    }
    if (!onBulkDelete) {
      return;
    }
    onBulkDelete(selectedProducts);
    // Не сбрасываем выбор сразу, пусть это сделает родительский компонент после успешного удаления
  };

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
      title: (
        <input
          type="checkbox"
          checked={selectAll}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded border-gray-300 text-accent focus:ring-accent"
        />
      ),
      dataIndex: 'select',
      key: 'select',
      align: 'center',
      width: 50,
      render: (_, record: Product) => (
        <input
          type="checkbox"
          checked={selectedProducts.includes(record.id)}
          onChange={(e) => handleSelectProduct(record.id, e.target.checked)}
          className="rounded border-gray-300 text-accent focus:ring-accent"
        />
      ),
    },
    {
      title: t('table:table-item-image'),
      dataIndex: 'image',
      key: 'image',
      align: alignLeft,
      width: 74,
      render: (image: any, { name, id }: { name: string; id: string }) => {
        // Отладочная информация для изображений
        console.log(`ProductList [${id}] image data:`, image);
        console.log(`ProductList [${id}] image type:`, typeof image);
        console.log(`ProductList [${id}] image thumbnail:`, image?.thumbnail);
        console.log(`ProductList [${id}] image original:`, image?.original);
        console.log(`ProductList [${id}] image is null/undefined:`, image === null || image === undefined);
        
        const imageSrc = image?.thumbnail || image?.original || siteSettings.product.placeholder;
        console.log(`ProductList [${id}] final image src:`, imageSrc);
        
        return (
          <div className="relative flex h-[42px] w-[42px] items-center">
            <Image
              src={imageSrc}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw"
              className="overflow-hidden rounded object-fill"
              onError={() => {
                console.error(`ProductList [${id}] failed to load image:`, imageSrc);
              }}
            />
          </div>
        );
      },
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
      width: 300,
      ellipsis: true,
      onHeaderCell: () => onHeaderClick('name'),
      render: (name: string, record: Product) => {
        const productData = record as any;
        const hasGroupKey = !!productData?.group_key;
        
        return (
          <div className="flex items-center gap-2">
            <span className="truncate" title={name}>{name}</span>
            {hasGroupKey && (
              <Badge
                text="Группа"
                color="bg-purple-500 text-white"
                className="text-xs"
                title={`Групповой товар: ${productData.group_key}`}
              />
            )}
          </div>
        );
      },
    },
    {
      title: t('table:table-item-group'),
      dataIndex: 'type',
      key: 'type',
      width: 120,
      align: 'center',
      ellipsis: true,
      render: (type: any, record: Product) => {
        const groupKey = (record as any)?.group_key;
        return (
          <div className="flex flex-col items-center gap-1">
            <span className="truncate whitespace-nowrap">{type?.name}</span>
            {groupKey && (
              <span 
                className="text-xs text-purple-600 cursor-pointer hover:underline"
                title={`Показать все варианты группы: ${groupKey}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const shop = router.query.shop;
                  router.push(`/${shop}/products?group_key=${groupKey}`);
                }}
              >
                🔗 Варианты
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: t('table:table-item-shop'),
      dataIndex: 'shop',
      key: 'shop',
      width: 120,
      align: 'center',
      ellipsis: true,
      render: (shop: Shop) => (
        <span className="truncate whitespace-nowrap">{shop?.name}</span>
      ),
    },
    {
      title: (
        <TitleWithSort
          title={t('table:table-item-unit')}
          ascending={
            sortingObj.sort === SortOrder.Asc && sortingObj.column === 'price'
          }
          isActive={sortingObj.column === 'price'}
        />
      ),
      className: 'cursor-pointer',
      dataIndex: 'price',
      key: 'price',
      align: alignRight,
      width: 180,
      onHeaderCell: () => onHeaderClick('price'),
      render: function Render(value: number, record: Product) {
        const { price: max_price } = usePrice({
          amount: record?.max_price as number,
        });
        const { price: min_price } = usePrice({
          amount: record?.min_price as number,
        });

        const { price } = usePrice({
          amount: value,
        });

        const renderPrice =
          record?.product_type === ProductType.Variable
            ? `${min_price} - ${max_price}`
            : price;

        return (
          <span className="whitespace-nowrap" title={renderPrice}>
            {renderPrice}
          </span>
        );
      },
    },
    {
      title: (
        <TitleWithSort
          title={t('table:table-item-quantity')}
          ascending={
            sortingObj.sort === SortOrder.Asc &&
            sortingObj.column === 'quantity'
          }
          isActive={sortingObj.column === 'quantity'}
        />
      ),
      className: 'cursor-pointer',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      width: 150,
      onHeaderCell: () => onHeaderClick('quantity'),
      render: (quantity: number) => {
        if (quantity < 1) {
          return (
            <Badge
              text={t('common:text-out-of-stock')}
              color="bg-red-500 text-white"
            />
          );
        }
        return <span>{quantity}</span>;
      },
    },
    {
      title: t('table:table-item-status'),
      dataIndex: 'status',
      key: 'status',
      align: 'left',
      width: 180,
      render: (status: string, record: any) => {
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
            case 'unpublish':
              return t('common:text-status-unpublish');
            default:
              return statusValue;
          }
        };

        const translatedStatus = getStatusTranslation(status);
        const statusLower = status?.toLowerCase() || '';

        return (
          <div
            className={`flex justify-start ${
              record?.quantity > 0 && record?.quantity < 10
                ? 'flex-col items-baseline space-y-3 3xl:flex-row 3xl:space-x-3 3xl:space-y-0 rtl:3xl:space-x-reverse'
                : 'items-center space-x-3 rtl:space-x-reverse'
            }`}
          >
            <Badge
              text={translatedStatus}
              color={
                statusLower === 'draft'
                  ? 'bg-yellow-400'
                  : statusLower === 'unpublish'
                  ? 'bg-gray-500'
                  : 'bg-accent'
              }
            />
            {/* Плашка "мало" временно закомментирована - не актуально */}
            {/* {record?.quantity > 0 && record?.quantity < 10 && (
              <Badge
                text={t('common:text-low-quantity')}
                color="bg-red-600"
                animate={true}
              />
            )} */}
          </div>
        );
      },
    },
    {
      title: t('table:table-item-actions'),
      dataIndex: 'slug',
      key: 'actions',
      align: 'right',
      width: 220,
      render: (slug: string, record: Product) => (
        <div className="flex items-center gap-2 justify-end">
          <LanguageSwitcher
            slug={record?.full_slug || record?.canonical_url?.replace(/^https?:\/\/[^\/]+\/element\//, '') || slug}
            record={record}
            deleteModalView="DELETE_PRODUCT"
            routes={Routes?.product}
          />
          <ProductStatusAction product={record} />
        </div>
      ),
    },
  ];

  if (router?.query?.shop) {
    columns = columns?.filter((column) => column?.key !== 'shop');
  }

  return (
    <>
      {/* Панель массовых операций */}
      {selectedProducts.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {t('common:text-selected')}: {selectedProducts.length}
            </span>
            <span className="text-xs text-gray-500">
              {t('common:text-total-on-page')}: {products?.length || 0}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {canEditGroup && onEditGroup && (
              <Button
                onClick={onEditGroup}
                variant="outline"
                size="small"
                className="text-blue-600 hover:bg-blue-50"
                disabled={isDeleting || isUngrouping}
              >
                ✏️ Редактировать группу
              </Button>
            )}
            {canUngroup && onUngroup && (
              <Button
                onClick={onUngroup}
                variant="outline"
                size="small"
                className="text-orange-600 hover:bg-orange-50"
                disabled={isDeleting || isUngrouping}
              >
                {isUngrouping ? 'Разгруппировка...' : '🔓 Разгруппировать'}
              </Button>
            )}
            <Button
              onClick={handleBulkDelete}
              variant="outline"
              size="small"
              className="text-red-600 hover:bg-red-50"
              disabled={isDeleting || isUngrouping}
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              {isDeleting ? t('common:text-deleting') : t('common:text-delete-selected')}
            </Button>
            <Button
              onClick={() => {
                // Если используется внешнее состояние, обновляем его напрямую
                if (onSelectedProductsChange) {
                  onSelectedProductsChange([]);
                } else {
                  setInternalSelectedProducts([]);
                }
                setSelectAll(false);
              }}
              variant="outline"
              size="small"
              disabled={isDeleting || isUngrouping}
            >
              {t('common:text-cancel')}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-6 overflow-hidden rounded shadow">
        <Table
          /* @ts-ignore */
          columns={columns}
          emptyText={t('table:empty-table-data')}
          data={products}
          rowKey="id"
          scroll={{ x: 900 }}
        />
      </div>

      {!!paginatorInfo?.total && (
        <div className="flex items-center justify-end">
          <Pagination
            total={paginatorInfo.total}
            current={paginatorInfo.currentPage}
            pageSize={paginatorInfo.perPage}
            onChange={onPagination}
            showLessItems
          />
        </div>
      )}
    </>
  );
};

export default ProductList;
