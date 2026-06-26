import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { HttpClient } from '@/data/client/http-client';

interface HashtagAutocompleteProps {
  value: Array<{ id?: string; name: string } | string> | string[];
  onChange: (value: Array<{ id?: string; name: string } | string>) => void;
  error?: string;
  maxTags?: number;
}

export default function HashtagAutocomplete({
  value,
  onChange,
  error,
  maxTags = 10,
}: HashtagAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Нормализуем значение - преобразуем в массив объектов
  const selectedTags = Array.isArray(value) 
    ? value.map((tag: any) => {
        if (typeof tag === 'string') {
          return { name: tag };
        }
        if (typeof tag === 'object' && tag !== null) {
          return { id: tag.id, name: tag.name || tag };
        }
        return null;
      }).filter(Boolean)
    : [];

  // Поиск хештегов только если введено 2+ символа
  const shouldSearch = searchQuery.length >= 2;
  const { data: hashtagsData, isLoading: loading } = useQuery(
    ['hashtags', { name: shouldSearch ? searchQuery : '', limit: 20 }],
    async () => {
      if (!shouldSearch) {
        return { data: [] };
      }
      try {
        const response = await HttpClient.get<any>('/hashtags', {
          params: { name: searchQuery, limit: 20 },
        });
        return response?.data || { data: [] };
      } catch (error) {
        return { data: [] };
      }
    },
    {
      enabled: shouldSearch,
      keepPreviousData: true,
      retry: false,
    }
  );

  // Хештеги приходят в формате { data: [...], links: {...}, meta: {...} } от Laravel paginate()
  const hashtags = Array.isArray(hashtagsData?.data) 
    ? hashtagsData.data 
    : (Array.isArray(hashtagsData) ? hashtagsData : []);

  // Фильтруем хештеги по поисковому запросу и исключаем уже выбранные
  const filteredTags = shouldSearch
    ? hashtags.filter((tag: any) => {
        const tagName = tag.name?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        if (!tagName.includes(query)) return false;
        
        // Исключаем уже выбранные хештеги
        const isSelected = selectedTags.some(
          (selected: any) => 
            (selected.id && selected.id === tag.id) || 
            (selected.name && selected.name.toLowerCase() === tagName)
        );
        return !isSelected;
      })
    : [];

  // Проверяем, есть ли точное совпадение среди выбранных
  const exactMatch = filteredTags.find(
    (tag: any) => tag.name?.toLowerCase() === searchQuery.toLowerCase()
  );

  // Показываем опцию создания нового тега, если нет точного совпадения и введено 2+ символа
  const showCreateOption = shouldSearch && !exactMatch && searchQuery.trim().length >= 2 && selectedTags.length < maxTags;

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setShowSuggestions(true);
  };

  const handleSelectTag = (tag: any) => {
    if (selectedTags.length >= maxTags) {
      return;
    }
    
    const newTag = { id: tag.id, name: tag.name };
    const updatedTags = [...selectedTags.filter(Boolean), newTag] as Array<{ id?: string; name: string } | string>;
    onChange(updatedTags);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (indexToRemove: number) => {
    const updatedTags = selectedTags.filter((_, index) => index !== indexToRemove).filter(Boolean) as Array<{ id?: string; name: string } | string>;
    onChange(updatedTags);
  };

  const handleCreateNew = () => {
    if (!searchQuery.trim() || selectedTags.length >= maxTags) return;

    // Добавляем новый тег как строку (без id) - бэкенд создаст его автоматически
    const tagToAdd = { name: searchQuery.trim() };
    const updatedTags = [...selectedTags.filter(Boolean), tagToAdd] as Array<{ id?: string; name: string } | string>;
    onChange(updatedTags);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim().length >= 2 && !exactMatch && selectedTags.length < maxTags) {
      e.preventDefault();
      handleCreateNew();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className="space-y-2 relative">
      {/* Поле ввода */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (shouldSearch) {
              setShowSuggestions(true);
            }
          }}
          placeholder={selectedTags.length >= maxTags ? `Достигнут лимит (${maxTags} хештегов)` : "Введите название хештега (минимум 2 символа)"}
          disabled={selectedTags.length >= maxTags}
          className={`w-full px-3 py-2 text-sm border ${
            error ? 'border-red-500' : 'border-gray-300'
          } rounded bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            selectedTags.length >= maxTags ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        />
      </div>

      {/* Выбранные хештеги в плашках */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag: any, index: number) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
            >
              <span>#{tag.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(index)}
                className="hover:text-blue-900 transition-colors text-sm font-bold"
                title="Удалить"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Список предложений */}
      {showSuggestions && shouldSearch && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-600">Поиск...</div>
          ) : filteredTags.length > 0 ? (
            <>
              {filteredTags.map((tag: any) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleSelectTag(tag)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900 transition-colors"
                >
                  #{tag.name}
                </button>
              ))}
              {showCreateOption && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900 transition-colors border-t border-gray-300 flex items-center gap-2"
                >
                  <span className="text-blue-600">+</span>
                  <span>Создать "{searchQuery}"</span>
                </button>
              )}
            </>
          ) : showCreateOption ? (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900 transition-colors flex items-center gap-2"
            >
              <span className="text-blue-600">+</span>
              <span>Создать "{searchQuery}"</span>
            </button>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-600">
              Хештеги не найдены. Введите минимум 2 символа для поиска.
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

