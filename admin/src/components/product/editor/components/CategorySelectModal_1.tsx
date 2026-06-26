import { useState, useMemo } from 'react';
import { Category } from '@/types';
import { useCategoriesQuery } from '@/data/category';
import { ChevronRight } from '@/components/icons/chevron-right';
import { ExpandMoreIcon } from '@/components/icons/expand-more-icon';
import { CloseIcon } from '@/components/icons/close-icon';
import { SearchIcon } from '@/components/icons/search-icon';
import Modal from '@/components/ui/modal/modal';
import Button from '@/components/ui/button';

type CategorySelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (categoryId: number) => void;
  selectedCategoryId?: number;
};

export default function CategorySelectModal({
  isOpen,
  onClose,
  onSelect,
  selectedCategoryId,
}: CategorySelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  // Загрузка всех категорий
  const { categories, loading } = useCategoriesQuery({
    limit: 1000,
  });

  // Безопасная нормализация категорий
  const normalizedCategories = useMemo(() => {
    try {
      if (!categories) return [];
      if (Array.isArray(categories)) return categories;
      if (categories && typeof categories === 'object' && 'data' in categories) {
        const data = (categories as any).data;
        if (Array.isArray(data)) return data;
      }
      return [];
    } catch (error) {
      console.error('Ошибка при нормализации категорий:', error);
      return [];
    }
  }, [categories]);

  // Построение дерева категорий (только родительские категории с детьми)
  const categoryTree = useMemo(() => {
    try {
      // Используем нормализованные категории
      const allCategories = normalizedCategories;
      if (!allCategories || allCategories.length === 0) return [];

      const categoryMap = new Map<number, Category & { children: Category[] }>();
      const rootCategories: (Category & { children: Category[] })[] = [];

      // Создаем карту всех категорий
      allCategories.forEach((cat: Category) => {
        if (!cat || !cat.id) return; // Пропускаем невалидные категории
        categoryMap.set(Number(cat.id), {
          ...cat,
          children: Array.isArray(cat.children) ? cat.children : [],
        });
      });

      // Строим дерево
      allCategories.forEach((cat: Category) => {
        if (!cat || !cat.id) return; // Пропускаем невалидные категории
        
        const category = categoryMap.get(Number(cat.id));
        if (!category) return;

        // Обрабатываем parent - может быть числом или объектом с id
        const parentId = typeof cat.parent === 'object' && cat.parent !== null
          ? Number(cat.parent.id)
          : cat.parent
          ? Number(cat.parent)
          : null;

        if (parentId) {
          const parent = categoryMap.get(parentId);
          if (parent) {
            parent.children.push(category);
          } else {
            rootCategories.push(category);
          }
        } else {
          rootCategories.push(category);
        }
      });

      return rootCategories;
    } catch (error) {
      console.error('Ошибка при построении дерева категорий:', error);
      return [];
    }
  }, [normalizedCategories]);

  // Фильтрация категорий по поисковому запросу
  const filteredCategories = useMemo(() => {
    try {
      // Безопасная проверка categoryTree
      if (!categoryTree || !Array.isArray(categoryTree) || categoryTree.length === 0) {
        return [];
      }

      if (!searchQuery || !searchQuery.trim()) {
        return categoryTree;
      }

      const query = searchQuery.toLowerCase().trim();
      if (!query) {
        return categoryTree;
      }

      const filtered: (Category & { children: Category[] })[] = [];

      const searchInCategory = (
        category: Category & { children: Category[] }, 
        depth: number = 0,
        visited: Set<number> = new Set()
      ): boolean => {
        // Защита от слишком глубокой рекурсии
        if (depth > 10) return false;
        
        if (!category || !category.id || !category.name) return false;

        const categoryId = Number(category.id);
        if (isNaN(categoryId) || visited.has(categoryId)) return false;
        
        visited.add(categoryId);

        try {
          const categoryName = String(category.name || '').toLowerCase();
          const matches = categoryName.includes(query);
          const childrenMatches: (Category & { children: Category[] })[] = [];

          // Безопасная обработка дочерних категорий
          if (Array.isArray(category.children) && category.children.length > 0) {
            category.children.forEach((child) => {
              try {
                if (!child || !child.id) return;
                
                // Убеждаемся, что child имеет правильную структуру
                const childWithChildren = {
                  ...child,
                  children: Array.isArray(child.children) ? child.children : [],
                } as Category & { children: Category[] };
                
                if (searchInCategory(childWithChildren, depth + 1, visited)) {
                  childrenMatches.push(childWithChildren);
                }
              } catch (error) {
                console.error('Ошибка при поиске в дочерней категории:', error);
              }
            });
          }

          if (matches || childrenMatches.length > 0) {
            filtered.push({
              ...category,
              children: matches 
                ? (Array.isArray(category.children) ? category.children : [])
                : childrenMatches,
            });
            return true;
          }

          return false;
        } catch (error) {
          console.error('Ошибка при обработке категории:', error);
          return false;
        }
      };

      // Безопасный обход дерева категорий
      categoryTree.forEach((category) => {
        try {
          if (category && category.id) {
            const visited = new Set<number>(); // Новый Set для каждой корневой категории
            searchInCategory(category, 0, visited);
          }
        } catch (error) {
          console.error('Ошибка при поиске в категории:', error);
        }
      });

      return filtered;
    } catch (error) {
      console.error('Ошибка при фильтрации категорий:', error);
      // В случае ошибки возвращаем пустой массив
      return [];
    }
  }, [categoryTree, searchQuery]);

  // Переключение раскрытия категории
  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Обработка выбора категории (без закрытия модального окна)
  const handleSelectCategory = (categoryId: number) => {
    onSelect(categoryId);
  };

  // Обработка подтверждения выбора
  const handleConfirm = () => {
    if (selectedCategoryId) {
      onSelect(selectedCategoryId);
      onClose();
    }
  };

  // Рендер категории с вложенными
  const renderCategory = (category: Category & { children: Category[] }, level: number = 0) => {
    if (!category || !category.id) return null; // Защита от невалидных категорий
    
    const categoryId = Number(category.id);
    if (isNaN(categoryId)) return null; // Защита от невалидного ID
    
    const isExpanded = expandedCategories.has(categoryId);
    const isSelected = selectedCategoryId === categoryId;
    const hasChildren = Array.isArray(category.children) && category.children.length > 0;

    return (
      <div key={categoryId} className="select-none">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
            isSelected
              ? 'bg-accent-300 text-accent-text'
              : 'hover:bg-accent-300 hover:text-accent-text text-heading'
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => {
            // При клике на категорию - выбираем её
            handleSelectCategory(categoryId);
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory(categoryId);
              }}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
              title={isExpanded ? 'Свернуть' : 'Развернуть'}
            >
              {isExpanded ? (
                <ExpandMoreIcon />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          <span className="flex-1 text-sm font-normal">{category.name}</span>
          {isSelected && (
            <span className="text-xs text-accent-600 font-medium">Выбрано</span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {category.children
              .filter((child) => child && child.id) // Фильтруем невалидные категории
              .map((child) => {
                try {
                  const childWithChildren = {
                    ...child,
                    children: Array.isArray(child.children) ? child.children : [],
                  } as Category & { children: Category[] };
                  return renderCategory(childWithChildren, level + 1);
                } catch (error) {
                  console.error('Ошибка при рендеринге дочерней категории:', error);
                  return null;
                }
              })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Выберите категорию
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Поиск */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                try {
                  setSearchQuery(e.target.value);
                } catch (error) {
                  console.error('Ошибка при изменении поискового запроса:', error);
                }
              }}
              placeholder="Поиск категории..."
              className="w-full pl-10 pr-10 py-2 border border-border-base rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Список категорий */}
        <div className="max-h-96 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Загрузка категорий...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'Категории не найдены' : 'Категории отсутствуют'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCategories.map((category) => renderCategory(category))}
            </div>
          )}
        </div>

        {/* Кнопка подтверждения */}
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <Button
            onClick={handleConfirm}
            disabled={!selectedCategoryId}
            className="bg-accent hover:bg-accent-hover text-accent-text px-6 py-2 rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
            variant="solid"
          >
            Подтвердить
          </Button>
        </div>
      </div>
    </Modal>
  );
}

