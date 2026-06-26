import React, { useState, useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Category, MappedPaginatorInfo } from '@/types';
import { useReorderCategoriesMutation } from '@/data/category';
import Pagination from '@/components/ui/pagination';
import Button from '@/components/ui/button';
import Link from '@/components/ui/link';
import { Routes } from '@/config/routes';
import LanguageSwitcher from '@/components/ui/lang-action/action';
import { getIcon } from '@/utils/get-icon';
import * as categoriesIcon from '@/components/icons/category';
import { ProductStatus } from '@/types';

interface DraggableCategoryItemProps {
  category: Category;
  onEdit?: (category: Category) => void;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggle?: (id: number) => void;
}

const DraggableCategoryItem: React.FC<DraggableCategoryItemProps> = ({ category, onEdit, hasChildren, isExpanded, onToggle }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const depth = (category as any).__depth ? Number((category as any).__depth) : 1;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginLeft: Math.max(0, depth - 1) * 32,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center p-4 bg-white border border-gray-200 rounded-lg mb-2 ${
        isDragging ? 'shadow-lg' : 'hover:shadow-md'
      } transition-shadow`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-8 h-8 mr-3 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10 13a1 1 0 100-2 1 1 0 000 2zM10 5a1 1 0 100-2 1 1 0 000 2zM10 9a1 1 0 100-2 1 1 0 000 2zM6 13a1 1 0 100-2 1 1 0 000 2zM6 5a1 1 0 100-2 1 1 0 000 2zM6 9a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      </div>

      {/* Category Info */}
      <div className="flex-1 grid grid-cols-12 gap-4 items-center">
        {/* ID */}
        <div className="col-span-1 text-center text-sm text-gray-600">
          {category.id}
        </div>

        {/* Status */}
        <div className="col-span-1">
          <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold ${
            (category.status || '').toLowerCase() === ProductStatus.Draft 
              ? 'bg-yellow-100 text-yellow-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {category.status}
          </span>
        </div>

        {/* Sort Order */}
        <div className="col-span-1 text-center text-sm text-gray-600">
          {category.sort_order || 0}
        </div>

        {/* Name with caret indicator */}
        <div className="col-span-4">
          <div className="flex items-center">
            {hasChildren ? (
              <button
                type="button"
                className={`mr-2 text-gray-400 hover:text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                title="Есть подкатегории"
                onClick={() => {
                  const id = typeof (category as any).id === 'string' ? parseInt((category as any).id) : (category as any).id;
                  onToggle && onToggle(id);
                }}
              >
                ▸
              </button>
            ) : <span className="mr-2 w-3" />}
            <div className="font-medium text-gray-900">{category.name}</div>
          </div>
          {category.slug && (
            <div className="text-sm text-gray-500">/{category.slug}</div>
          )}
        </div>

        {/* Icon */}
        <div className="col-span-1 text-center">
          {category.icon && (
            <span className="flex items-center justify-center">
              {getIcon({
                iconList: categoriesIcon,
                iconName: category.icon,
                className: 'w-5 h-5 max-h-full max-w-full',
              })}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="col-span-4 flex justify-end space-x-2">
          <LanguageSwitcher
            slug={category.slug}
            record={category}
            deleteModalView="DELETE_CATEGORY"
            routes={Routes?.category}
          />
        </div>
      </div>
    </div>
  );
};

interface DraggableCategoryListProps {
  categories: Category[] | undefined;
  paginatorInfo: MappedPaginatorInfo | null;
  onPagination: (key: number) => void;
  onRefresh?: () => void;
}

const DraggableCategoryList: React.FC<DraggableCategoryListProps> = ({
  categories = [],
  paginatorInfo,
  onPagination,
  onRefresh,
}) => {
  const { t } = useTranslation();
  // Flatten tree with depth and parent metadata for rendering and DnD
  const flattenWithMeta = (nodes: Category[], depth = 1, parent: number | null = null): any[] => {
    const out: any[] = [];
    for (const n of nodes) {
      const id = typeof n.id === 'string' ? parseInt(n.id) : n.id;
      const item: any = { ...n, id, __depth: depth, parent };
      out.push(item);
      if (Array.isArray(n.children) && n.children.length) {
        out.push(...flattenWithMeta(n.children as any, depth + 1, id));
      }
    }
    return out;
  };

  const [localCategories, setLocalCategories] = useState<any[]>(flattenWithMeta(categories));
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const reorderMutation = useReorderCategoriesMutation();

  // Update local state when categories prop changes
  React.useEffect(() => {
    setLocalCategories(flattenWithMeta(categories));
  }, [categories]);

  const parentMap = useMemo(() => {
    const map = new Map<number, number | null>();
    for (const n of localCategories) {
      const id = typeof n.id === 'string' ? parseInt(n.id) : n.id;
      map.set(id, n.parent ?? null);
    }
    return map;
  }, [localCategories]);

  const isVisible = (node: any) => {
    const depth = node?.__depth || 1;
    if (depth === 1) return true;
    let p: any = node.parent ?? null;
    while (p) {
      if (!expandedIds.has(p)) return false;
      p = parentMap.get(p) ?? null;
    }
    return true;
  };

  const visibleItems = useMemo(() => localCategories.filter(isVisible), [localCategories, expandedIds, parentMap]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndexVisible = visibleItems.findIndex((item) => item.id === active.id);
      const newIndexVisible = visibleItems.findIndex((item) => item.id === over?.id);

      if (oldIndexVisible === -1 || newIndexVisible === -1) return;

      const source = visibleItems[oldIndexVisible];
      const target = visibleItems[newIndexVisible];
      const oldIndex = localCategories.findIndex((i) => i.id === source.id);
      const newIndex = localCategories.findIndex((i) => i.id === target.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(localCategories, oldIndex, newIndex);
      setLocalCategories(newOrder);

      // Compute new sort orders per parent within current page
      const siblingIndex: Record<string, number> = {};
      const items = newOrder.map((cat: any) => {
        const parentId = cat.parent ?? null;
        const key = String(parentId ?? 'root');
        siblingIndex[key] = (siblingIndex[key] || 0) + 1;
        const sortOrder = siblingIndex[key];
        const id = typeof cat.id === 'string' ? parseInt(cat.id) : cat.id;
        return { id, parent_id: parentId, sort_order: sortOrder };
      }).filter((i) => !isNaN(i.id));

      if (items.length > 0) {
        reorderMutation.mutate({ items }, {
          onError: (error) => {
            console.error('Reorder error:', error);
            // Revert on error
            setLocalCategories(categories);
          },
        });
      }
    }
  };

  const categoryIds = visibleItems.map((category) => category.id);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
          <div className="col-span-1 text-center">{t('table:table-item-id')}</div>
          <div className="col-span-1">{t('table:table-item-status')}</div>
          <div className="col-span-1 text-center">{t('table:table-item-sort-order')}</div>
          <div className="col-span-4">{t('table:table-item-title')}</div>
          <div className="col-span-1 text-center">{t('table:table-item-icon')}</div>
          <div className="col-span-4 text-right">{t('table:table-item-actions')}</div>
        </div>
      </div>

      {/* Draggable List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
          {visibleItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('table:empty-table-data')}
            </div>
          ) : (
            visibleItems.map((category: any) => (
              <DraggableCategoryItem
                key={category.id}
                category={category}
                hasChildren={Array.isArray(category.children) && category.children.length > 0}
                isExpanded={expandedIds.has(typeof category.id === 'string' ? parseInt(category.id) : category.id)}
                onToggle={toggleExpand}
              />
            ))
          )}
        </SortableContext>
      </DndContext>

      {/* Pagination */}
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

      {/* Loading indicator */}
      {reorderMutation.isLoading && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {t('common:text-loading')}...
        </div>
      )}
    </div>
  );
};

export default DraggableCategoryList;
