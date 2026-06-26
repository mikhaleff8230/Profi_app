import { useState, useEffect, useRef } from 'react';
import { useManufacturersQuery, useCreateManufacturerMutation } from '@/data/manufacturer';
import { useRouter } from 'next/router';
import { Config } from '@/config';
import { PlusIcon } from '@/components/icons/plus-icon';

interface BrandAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export default function BrandAutocomplete({
  value,
  onChange,
  error,
  required,
}: BrandAutocompleteProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Поиск производителей только если введено 2+ символа
  const shouldSearch = searchQuery.length >= 2;
  const { manufacturers, loading } = useManufacturersQuery({
    limit: 20,
    name: shouldSearch ? searchQuery : '',
    language: router.locale || Config.defaultLanguage,
  });

  const { mutate: createManufacturer, isLoading: isCreatingBrand } = useCreateManufacturerMutation();

  // Фильтруем производителей по поисковому запросу
  const filteredManufacturers = shouldSearch
    ? manufacturers.filter((m: any) =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Проверяем, есть ли точное совпадение
  const exactMatch = filteredManufacturers.find(
    (m: any) => m.name?.toLowerCase() === searchQuery.toLowerCase()
  );

  // Показываем опцию создания нового бренда, если нет точного совпадения и введено 2+ символа
  const showCreateOption = shouldSearch && !exactMatch && searchQuery.trim().length >= 2;

  // Обработка клика вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Синхронизация value с searchQuery
  useEffect(() => {
    if (value !== searchQuery) {
      setSearchQuery(value || '');
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    setShowSuggestions(true);
  };

  const handleSelectManufacturer = (manufacturer: any) => {
    setSearchQuery(manufacturer.name);
    onChange(manufacturer.name);
    setShowSuggestions(false);
  };

  const handleCreateNew = async () => {
    if (!searchQuery.trim() || isCreatingBrand) return;

    setIsCreating(true);
    try {
      // Создаем нового производителя
      // Для создания нужен type_id, получаем его из формы товара или используем дефолтный
      // В контексте бренда мы просто сохраняем название, type_id будет установлен при сохранении товара
      // Пока что просто сохраняем название бренда в поле формы
      setSearchQuery(searchQuery.trim());
      onChange(searchQuery.trim());
      setShowSuggestions(false);
      setIsCreating(false);
      
      // Примечание: создание производителя через API требует type_id,
      // поэтому пока просто сохраняем название в поле brand
      // Производитель будет создан при сохранении товара, если нужно
    } catch (error) {
      console.error('Ошибка при создании бренда:', error);
      setIsCreating(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            if (shouldSearch) {
              setShowSuggestions(true);
            }
          }}
          placeholder="Введите название бренда"
          className={`w-full px-3 py-2 border ${
            error ? 'border-red-500' : 'border-border-base'
          } rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent`}
          required={required}
        />
        {required && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
            *
          </span>
        )}
      </div>

      {/* Подсказка */}
      <p className="text-xs text-gray-500 mt-1">
        {searchQuery.length < 2
          ? 'Начните вводить название бренда (минимум 2 символа)'
          : 'Выберите из списка или создайте новый бренд'}
      </p>

      {/* Список предложений */}
      {showSuggestions && shouldSearch && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border-base rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Поиск...</div>
          ) : filteredManufacturers.length > 0 ? (
            <>
              {filteredManufacturers.map((manufacturer: any) => (
                <button
                  key={manufacturer.id}
                  type="button"
                  onClick={() => handleSelectManufacturer(manufacturer)}
                  className="w-full text-left px-4 py-2 hover:bg-accent-300 hover:text-accent-text text-heading transition-colors"
                >
                  {manufacturer.name}
                </button>
              ))}
              {showCreateOption && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={isCreatingBrand}
                  className="w-full text-left px-4 py-2 hover:bg-accent-300 hover:text-accent-text text-heading transition-colors border-t border-border-base flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4 text-dark" />
                  {isCreatingBrand ? 'Создание...' : `Создать "${searchQuery}"`}
                </button>
              )}
            </>
          ) : showCreateOption ? (
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={isCreatingBrand}
              className="w-full text-left px-4 py-2 hover:bg-accent-300 hover:text-accent-text text-heading transition-colors flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4 text-dark" />
              {isCreatingBrand ? 'Создание...' : `Создать "${searchQuery}"`}
            </button>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              Бренды не найдены. Введите минимум 2 символа для поиска.
            </div>
          )}
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

