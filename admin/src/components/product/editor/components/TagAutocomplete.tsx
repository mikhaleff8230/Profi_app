import { useState, useEffect, useRef } from 'react';
import { useTagsQuery } from '@/data/tag';
import { tagClient } from '@/data/client/tag';
import { useRouter } from 'next/router';
import { Config } from '@/config';
import { PlusIcon } from '@/components/icons/plus-icon';
import { CloseIcon } from '@/components/icons/close-icon';
import { useQueryClient } from 'react-query';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';

interface TagAutocompleteProps {
  value: Array<{ id?: string; name: string } | string> | string[];
  onChange: (value: Array<{ id?: string; name: string } | string>) => void;
  error?: string;
  maxTags?: number;
}

export default function TagAutocomplete({
  value,
  onChange,
  error,
  maxTags = 5,
}: TagAutocompleteProps) {
  const router = useRouter();
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

  // Поиск тегов только если введено 2+ символа
  const shouldSearch = searchQuery.length >= 2;
  const { tags, loading } = useTagsQuery({
    limit: 20,
    name: shouldSearch ? searchQuery : '',
    language: router.locale || Config.defaultLanguage,
  });

  const queryClient = useQueryClient();
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Фильтруем теги по поисковому запросу и исключаем уже выбранные
  const filteredTags = shouldSearch
    ? tags.filter((tag: any) => {
        const tagName = tag.name?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        if (!tagName.includes(query)) return false;
        
        // Исключаем уже выбранные теги
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
    const updatedTags = [...selectedTags, newTag];
    onChange(updatedTags);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (indexToRemove: number) => {
    const updatedTags = selectedTags.filter((_, index) => index !== indexToRemove);
    onChange(updatedTags);
  };

  const handleCreateNew = async () => {
    if (!searchQuery.trim() || isCreatingTag || selectedTags.length >= maxTags) return;

    setIsCreatingTag(true);
    try {
      // Создаем новый тег через API
      const newTag = await tagClient.create({
        name: searchQuery.trim(),
        language: router.locale || Config.defaultLanguage,
      } as any);
      
      // Обновляем кэш тегов
      queryClient.invalidateQueries(API_ENDPOINTS.TAGS);
      
      // Добавляем созданный тег в список
      const tagToAdd = { id: newTag.id, name: newTag.name || searchQuery.trim() };
      const updatedTags = [...selectedTags, tagToAdd];
      onChange(updatedTags);
      setSearchQuery('');
      setShowSuggestions(false);
      setIsCreatingTag(false);
    } catch (error) {
      console.error('Ошибка при создании тега:', error);
      // Если создание не удалось, просто добавляем как строку (без id)
      const tagToAdd = { name: searchQuery.trim() };
      const updatedTags = [...selectedTags, tagToAdd];
      onChange(updatedTags);
      setSearchQuery('');
      setShowSuggestions(false);
      setIsCreatingTag(false);
    }
  };

  return (
    <div ref={wrapperRef} className="space-y-2">
      {/* Поле ввода */}
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
          placeholder={selectedTags.length >= maxTags ? `Достигнут лимит (${maxTags} тегов)` : "Введите название тега"}
          disabled={selectedTags.length >= maxTags}
          className={`w-full px-3 py-2 border ${
            error ? 'border-red-500' : 'border-border-base'
          } rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent ${
            selectedTags.length >= maxTags ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        />
      </div>

      {/* Выбранные теги в плашках */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag: any, index: number) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-3 py-1 bg-accent-300 text-accent-text rounded-full text-sm"
            >
              <span>{tag.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(index)}
                className="hover:text-dark transition-colors"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Подсказка */}
      <p className="text-xs text-gray-500">
        {searchQuery.length < 2
          ? `Начните вводить название тега (минимум 2 символа). Максимум ${maxTags} тегов.`
          : selectedTags.length >= maxTags
          ? `Достигнут лимит в ${maxTags} тегов`
          : 'Выберите из списка или создайте новый тег'}
      </p>

      {/* Список предложений */}
      {showSuggestions && shouldSearch && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border-base rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Поиск...</div>
          ) : filteredTags.length > 0 ? (
            <>
              {filteredTags.map((tag: any) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleSelectTag(tag)}
                  className="w-full text-left px-4 py-2 hover:bg-accent-300 hover:text-accent-text text-heading transition-colors"
                >
                  {tag.name}
                </button>
              ))}
              {showCreateOption && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={isCreatingTag}
                  className="w-full text-left px-4 py-2 hover:bg-accent-300 hover:text-accent-text text-heading transition-colors border-t border-border-base flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4 text-dark" />
                  {isCreatingTag ? 'Создание...' : `Создать "${searchQuery}"`}
                </button>
              )}
            </>
          ) : showCreateOption ? (
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={isCreatingTag}
              className="w-full text-left px-4 py-2 hover:bg-accent-300 hover:text-accent-text text-heading transition-colors flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4 text-dark" />
              {isCreatingTag ? 'Создание...' : `Создать "${searchQuery}"`}
            </button>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              Теги не найдены. Введите минимум 2 символа для поиска.
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

