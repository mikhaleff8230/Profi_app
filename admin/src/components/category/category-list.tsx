import Pagination from '@/components/ui/pagination';
import { Table } from '@/components/ui/table';
import { getIcon } from '@/utils/get-icon';
import * as categoriesIcon from '@/components/icons/category';
import { SortOrder, ProductStatus } from '@/types';
import { useTranslation } from 'next-i18next';
import { useIsRTL } from '@/utils/locals';
import { useState, useMemo, useEffect } from 'react';
import TitleWithSort from '@/components/ui/title-with-sort';
import { Category, MappedPaginatorInfo } from '@/types';
//
import Link from '@/components/ui/link';
import { Routes } from '@/config/routes';
import LanguageSwitcher from '@/components/ui/lang-action/action';
import BulkEditCategories from './bulk-edit-categories';
import Button from '@/components/ui/button';

export type IProps = {
  categories: Category[] | undefined;
  paginatorInfo: MappedPaginatorInfo | null;
  onPagination: (key: number) => void;
  onSort: (current: any) => void;
  onOrder: (current: string) => void;
  onRefresh?: () => void;
  autoExpandLevels?: number;
  searchTerm?: string;
  statusFilter?: 'all' | 'publish' | 'draft';
};
const CategoryList = ({
  categories,
  paginatorInfo,
  onPagination,
  onSort,
  onOrder,
  onRefresh,
  autoExpandLevels = 0,
  searchTerm = '',
  statusFilter = 'all',
}: IProps) => {
  const { t } = useTranslation();
  const rowExpandable = (record: any) => record.children?.length;
  const { alignLeft, alignRight } = useIsRTL();

	const [sortingObj, setSortingObj] = useState<{
		sort: SortOrder;
		column: string | null;
	}>({
		sort: SortOrder.Desc,
		column: null,
	});

  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [showBulkEdit, setShowBulkEdit] = useState(false);

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

  const handleSelectCategory = (category: Category, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, category]);
    } else {
      setSelectedCategories(prev => prev.filter(cat => cat.id !== category.id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCategories(flattenedVisibleCategories);
    } else {
      setSelectedCategories([]);
    }
  };

  const handleBulkEditSuccess = () => {
    setSelectedCategories([]);
    if (onRefresh) {
      onRefresh();
    }
  };

  // Limit hierarchy to 3 levels and annotate metadata for better display and control
  const trimmedCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [] as Category[];

    const cloneWithDepth = (
      nodes: Category[],
      depth: number,
      ancestors: string[],
      ancestorIds: (string | number)[]
    ): Category[] => {
      // depth starts at 1 for roots
      return nodes.map((node) => {
        const path = ancestors.join(' › ');
        const children = Array.isArray(node.children) ? node.children : [];
        const nextAncestors = [...ancestors, node.name];
        const nextAncestorIds = [...ancestorIds, node.id as any];
        const limitedChildren = depth < 3 ? cloneWithDepth(children, depth + 1, nextAncestors, nextAncestorIds) : [];
        // Return a shallow clone with possibly trimmed children and extra readonly fields for rendering
        return {
          ...node,
          // @ts-ignore annotate for rendering only
          __path: path,
          // @ts-ignore
          __depth: depth,
          // @ts-ignore
          __ancestorIds: ancestorIds,
          children: limitedChildren,
        } as Category;
      });
    };

    return cloneWithDepth(categories, 1, [], []);
  }, [categories]);

  const normalize = (v: string) => (v || '').toString().toLowerCase();
  const activeSearch = '';

  // Filter tree to only nodes that match or have matching descendants
  const filteredCategories = useMemo(() => {
    if (statusFilter === 'all') return trimmedCategories;
    const match = (node: any) => (node?.status || '').toString().toLowerCase() === statusFilter;
    const filterNodes = (nodes: Category[]): Category[] => {
      const result: Category[] = [];
      for (const node of nodes) {
        const childMatches = Array.isArray(node.children) ? filterNodes(node.children) : [];
        if (match(node) || childMatches.length > 0) {
          result.push({
            ...node,
            children: childMatches,
          } as Category);
        }
      }
      return result;
    };
    return filterNodes(trimmedCategories);
  }, [trimmedCategories, statusFilter]);

  const flattenedVisibleCategories = useMemo(() => {
    const result: Category[] = [];
    const traverse = (nodes: Category[]) => {
      for (const node of nodes) {
        result.push(node);
        if (Array.isArray(node.children) && node.children.length) {
          traverse(node.children);
        }
      }
    };
    traverse(filteredCategories);
    return result;
  }, [filteredCategories]);

  // Auto-expand logic - по умолчанию все свернуто (раскрываем только если autoExpandLevels > 0)
  const [expandedRowKeys, setExpandedRowKeys] = useState<(string | number)[]>([]);

  useEffect(() => {
    const keys = new Set<string | number>();
    const levels = Math.max(0, Math.min(3, autoExpandLevels || 0));

    // Если autoExpandLevels = 0, ничего не раскрываем
    if (levels === 0) {
      setExpandedRowKeys([]);
      return;
    }

    const collectKeysByLevel = (nodes: any[], currentDepth = 1) => {
      for (const node of nodes) {
        if (currentDepth < levels && Array.isArray(node.children) && node.children.length > 0) {
          keys.add(node.id);
          collectKeysByLevel(node.children, currentDepth + 1);
        }
      }
    };

    collectKeysByLevel(filteredCategories as any);
    setExpandedRowKeys(Array.from(keys));
  }, [filteredCategories, autoExpandLevels]);

  const columns = [
    {
      title: (
        <input
          type="checkbox"
          checked={
            flattenedVisibleCategories.length > 0 &&
            selectedCategories.length > 0 &&
            selectedCategories.length === flattenedVisibleCategories.length
          }
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded border-gray-300"
        />
      ),
      dataIndex: 'select',
      key: 'select',
      align: 'center',
      width: 50,
      render: (_: any, record: Category) => (
        <input
          type="checkbox"
          checked={selectedCategories.some(cat => cat.id === record.id)}
          onChange={(e) => handleSelectCategory(record, e.target.checked)}
          className="rounded border-gray-300"
        />
      ),
    },
    {
      title: t('table:table-item-id'),
      dataIndex: 'id',
      key: 'id',
      align: 'center',
      width: 60,
    },
    {
      title: t('table:table-item-status'),
      dataIndex: 'status',
      key: 'status',
      align: 'left',
      width: 150,
      render: (status: string) => (
        <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold ${
          (status || '').toLowerCase() === ProductStatus.Draft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
        }`}>
          {status}
        </span>
      ),
    },
    {
      title: (
        <TitleWithSort
          title={t('table:table-item-sort-order')}
          ascending={
            sortingObj.sort === SortOrder.Asc && sortingObj.column === 'sort_order'
          }
          isActive={sortingObj.column === 'sort_order'}
        />
      ),
      className: 'cursor-pointer',
      dataIndex: 'sort_order',
      key: 'sort_order',
      align: 'center',
      width: 120,
      onHeaderCell: () => onHeaderClick('sort_order'),
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
      className: 'cursor-pointer whitespace-nowrap',
      dataIndex: 'name',
      key: 'name',
      align: alignLeft,
      width: 400,
      onHeaderCell: () => onHeaderClick('name'),
      render: (name: string, record: any) => {
        const depth = record.__depth || 1;
        const hasChildren = Array.isArray(record.children) && record.children.length > 0;
        return (
          <div className="flex items-center group">
            <div
              className="flex-1 flex items-center min-w-0"
              style={{ paddingLeft: `${(depth - 1) * 28}px` }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">{name}</span>
                  {hasChildren && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                      {record.children.length}
                    </span>
                  )}
                </div>
                {record.slug && (
                  <div className="text-xs text-gray-500 truncate mt-0.5">/{record.slug}</div>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: t('table:table-item-icon'),
      dataIndex: 'icon',
      key: 'icon',
      align: 'center',
      width: 120,
      render: (icon: string) => {
        if (!icon) return null;
        return (
          <span className="flex items-center justify-center">
            {getIcon({
              iconList: categoriesIcon,
              iconName: icon,
              className: 'w-5 h-5 max-h-full max-w-full',
            })}
          </span>
        );
      },
    },
    {
      title: (
        <TitleWithSort
          title={t('table:table-item-slug')}
          ascending={
            sortingObj.sort === SortOrder.Asc && sortingObj.column === 'slug'
          }
          isActive={sortingObj.column === 'slug'}
        />
      ),
      className: 'cursor-pointer',
      dataIndex: 'name',
      key: 'slug',
      align: alignLeft,
      width: 150,
      onHeaderCell: () => onHeaderClick('slug'),
    },
    {
      title: t('table:table-item-actions'),
      dataIndex: 'slug',
      key: 'actions',
      align: alignRight,
      width: 290,
      render: (slug: string, record: Category) => (
        <LanguageSwitcher
          slug={slug}
          record={record}
          deleteModalView="DELETE_CATEGORY"
          routes={Routes?.category}
        />
      ),
    },
  ];

  return (
    <>
      {selectedCategories.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {t('form:selected-categories-count', { count: selectedCategories.length })}
            </span>
            <div className="flex space-x-2">
              <Button
                size="small"
                onClick={() => setShowBulkEdit(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {t('form:button-label-bulk-edit')}
              </Button>
              <Button
                size="small"
                variant="outline"
                onClick={() => setSelectedCategories([])}
              >
                {t('common:text-cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <Table
          //@ts-ignore
          columns={columns}
          emptyText={t('table:empty-table-data')}
          data={filteredCategories}
          rowKey="id"
          scroll={{ x: 1000 }}
          indentSize={0}
          expandIconColumnIndex={4}
          childrenColumnName="children"
          rowExpandable={(record: any) => Array.isArray(record.children) && record.children.length > 0}
          expandIcon={({ expanded, onExpand, record }: any) => {
            const hasChildren = Array.isArray(record.children) && record.children.length > 0;
            if (!hasChildren) return <span className="w-5 h-5 inline-block mr-2" />;
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpand(record, e);
                }}
                aria-label={expanded ? t('common:text-collapse') : t('common:text-expand')}
                className="mr-2 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 transition-colors duration-150 group"
              >
                <svg
                  className={`w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          }}
          expandedRowKeys={expandedRowKeys}
          onExpand={(expanded: boolean, record: any) => {
            setExpandedRowKeys((prev) => {
              const set = new Set(prev);
              if (expanded) set.add(record.id);
              else set.delete(record.id);
              return Array.from(set);
            });
          }}
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

      {showBulkEdit && (
        <BulkEditCategories
          selectedCategories={selectedCategories}
          onClose={() => setShowBulkEdit(false)}
          onSuccess={handleBulkEditSuccess}
        />
      )}
    </>
  );
};

export default CategoryList;
