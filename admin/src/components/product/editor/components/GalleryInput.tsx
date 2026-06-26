import { useFormContext, Controller } from 'react-hook-form';
import Uploader from '@/components/common/uploader';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useEffect, useRef } from 'react';
import { Attachment } from '@/types';

interface GalleryInputProps {
  name: string;
  maxSize?: number;
}

/**
 * Надежный компонент для работы с галереей товара
 * Гарантирует сохранение всех загруженных изображений
 */
export default function GalleryInput({ name, maxSize = 5 * 1024 * 1024 }: GalleryInputProps) {
  const { control, watch, setValue, getValues } = useFormContext<ProductEditorFormData>();
  const galleryValue = watch(name);
  const prevGalleryRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // Инициализация при первой загрузке
  useEffect(() => {
    if (!isInitializedRef.current) {
      const currentGallery = getValues(name as any);
      if (Array.isArray(currentGallery) && currentGallery.length > 0) {
        prevGalleryRef.current = [...currentGallery];
        isInitializedRef.current = true;
        console.log('GalleryInput - Initialized with existing gallery:', {
          count: currentGallery.length,
          items: currentGallery.map((img: any) => ({
            id: img?.id,
            hasThumbnail: !!img?.thumbnail,
            hasOriginal: !!img?.original,
          })),
        });
      } else {
        prevGalleryRef.current = [];
        isInitializedRef.current = true;
        console.log('GalleryInput - Initialized with empty gallery');
      }
    }
  }, []);

  // Отслеживание изменений галереи
  useEffect(() => {
    if (isInitializedRef.current) {
      const currentGallery = Array.isArray(galleryValue) ? galleryValue : [];
      const prevGallery = Array.isArray(prevGalleryRef.current) ? prevGalleryRef.current : [];

      // Проверяем, действительно ли изменилась галерея
      const currentIds = currentGallery.map((img: any) => img?.id || img?.thumbnail || img?.original).filter(Boolean);
      const prevIds = prevGallery.map((img: any) => img?.id || img?.thumbnail || img?.original).filter(Boolean);

      if (JSON.stringify(currentIds.sort()) !== JSON.stringify(prevIds.sort())) {
        console.log('GalleryInput - Gallery changed:', {
          prevCount: prevIds.length,
          currentCount: currentIds.length,
          prevIds: prevIds.slice(0, 5),
          currentIds: currentIds.slice(0, 5),
        });
        prevGalleryRef.current = [...currentGallery];
      }
    }
  }, [galleryValue]);

  const handleChange = (newValue: any) => {
    try {
      // Нормализуем значение
      let normalizedGallery: Attachment[] = [];

      if (Array.isArray(newValue)) {
        // Фильтруем пустые значения и нормализуем структуру
        normalizedGallery = newValue
          .filter((item: any) => {
            // Проверяем, что элемент валиден
            return (
              item &&
              typeof item === 'object' &&
              (item.id || item.thumbnail || item.original || item.url)
            );
          })
          .map((item: any) => {
            // Нормализуем структуру каждого изображения
            return {
              id: item.id || undefined,
              thumbnail: item.thumbnail || item.url || '',
              original: item.original || item.url || item.thumbnail || '',
              url: item.url || item.thumbnail || item.original || '',
              ...(item.file_name ? { file_name: item.file_name } : {}),
            };
          });
      } else if (newValue && typeof newValue === 'object') {
        // Одиночное изображение - преобразуем в массив
        normalizedGallery = [
          {
            id: newValue.id || undefined,
            thumbnail: newValue.thumbnail || newValue.url || '',
            original: newValue.original || newValue.url || newValue.thumbnail || '',
            url: newValue.url || newValue.thumbnail || newValue.original || '',
            ...(newValue.file_name ? { file_name: newValue.file_name } : {}),
          },
        ];
      }

      console.log('GalleryInput - handleChange:', {
        inputType: Array.isArray(newValue) ? 'array' : typeof newValue,
        inputLength: Array.isArray(newValue) ? newValue.length : 1,
        normalizedLength: normalizedGallery.length,
        normalizedItems: normalizedGallery.map((img: any) => ({
          id: img?.id,
          hasThumbnail: !!img?.thumbnail,
          hasOriginal: !!img?.original,
        })),
      });

      // Обновляем значение в форме
      setValue(name as any, normalizedGallery, {
        shouldValidate: true,
        shouldDirty: true,
      });

      // Сохраняем в ref для отслеживания
      prevGalleryRef.current = [...normalizedGallery];
    } catch (error) {
      console.error('GalleryInput - Error in handleChange:', error);
      // В случае ошибки сохраняем пустой массив
      setValue(name as any, [], {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  return (
    <Controller
      control={control}
      name={name as any}
      defaultValue={[]}
      render={({ field: { ref, value, ...rest } }) => {
        // Нормализуем значение для отображения
        const displayValue = Array.isArray(value) ? value : value ? [value] : [];

        return (
          <div className="gallery-input-wrapper">
            <Uploader
              {...rest}
              value={displayValue}
              onChange={handleChange}
              multiple={true}
              maxSize={maxSize}
            />
            {/* Скрытая информация для отладки (можно убрать в продакшене) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-xs text-gray-500">
                Галерея: {displayValue.length} изображений
                {displayValue.length > 0 && (
                  <span className="ml-2">
                    (ID: {displayValue.map((img: any) => img?.id || 'new').join(', ')})
                  </span>
                )}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

