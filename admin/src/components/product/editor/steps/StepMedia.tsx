import { useFormContext } from 'react-hook-form';
import FileInput from '@/components/ui/file-input';
import Card from '@/components/common/card';
import Description from '@/components/ui/description';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useEffect } from 'react';
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
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Компонент для сортируемого элемента галереи
function SortableGalleryItem({ img, index }: { img: any; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id || img.thumbnail || img.url || img.original || index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group border rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <img
        src={img.thumbnail || img.url || img.original}
        alt={`Gallery ${index + 1}`}
        className="w-full aspect-[3/4] object-contain bg-gray-50"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}

export default function StepMedia() {
  const { t } = useTranslation();
  const { control, watch, setValue } = useFormContext<ProductEditorFormData>();

  const image = watch('image');
  const gallery = watch('gallery');
  // const videos = watch('videos'); // ВРЕМЕННО ЗАКОММЕНТИРОВАНО
  
  // Просто убеждаемся, что gallery - массив
  const galleryArray = Array.isArray(gallery) ? gallery : [];
  // const videosArray = Array.isArray(videos) ? videos : []; // ВРЕМЕННО ЗАКОММЕНТИРОВАНО

  // Минимальная инициализация - только один раз при монтировании
  useEffect(() => {
    if (gallery === undefined || gallery === null) {
      setValue('gallery', []);
    } else if (!Array.isArray(gallery)) {
      setValue('gallery', []);
    }
    // ВРЕМЕННО ЗАКОММЕНТИРОВАНО
    // if (videos === undefined || videos === null) {
    //   setValue('videos', []);
    // } else if (!Array.isArray(videos)) {
    //   setValue('videos', []);
    // }
  }, []); // Только при монтировании

  // Настройка сенсоров для drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Обработка окончания перетаскивания
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && galleryArray.length > 0) {
      const oldIndex = galleryArray.findIndex(
        (img: any) => (img.id || img.thumbnail || img.url || img.original) === active.id
      );
      const newIndex = galleryArray.findIndex(
        (img: any) => (img.id || img.thumbnail || img.url || img.original) === over?.id
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(galleryArray, oldIndex, newIndex);
        setValue('gallery', newOrder);
      }
    }
  };

  // Создаем уникальные ID для элементов галереи
  const galleryIds = galleryArray.map(
    (img: any, index: number) => img.id || img.thumbnail || img.url || img.original || `gallery-${index}`
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-heading mb-4">
          Фото
        </h2>
        <p className="text-sm text-body mb-6">
          Загрузите изображения товара. Первое изображение будет использовано как главное.
        </p>
      </div>

      {/* Главное изображение */}
      <div className="flex flex-wrap border-b border-dashed border-border-base pb-8">
        <Description
          title={t('form:featured-image-title')}
          details={t('form:featured-image-help-text')}
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />
        <Card className="w-full sm:w-8/12 md:w-2/3">
          <FileInput
            name="image"
            control={control}
            multiple={false}
            maxSize={5 * 1024 * 1024}
          />
        </Card>
      </div>

      {/* Галерея */}
      <div className="flex flex-wrap border-b border-dashed border-border-base pb-8">
        <Description
          title={t('form:gallery-title')}
          details={t('form:gallery-help-text')}
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />
        <Card className="w-full sm:w-8/12 md:w-2/3">
          <FileInput
            name="gallery"
            control={control}
            maxSize={5 * 1024 * 1024}
          />
          {galleryArray.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">
                Перетащите изображения, чтобы изменить порядок
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={galleryIds} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-4 gap-4">
                    {galleryArray.map((img: any, index: number) => (
                      <SortableGalleryItem
                        key={img.id || img.thumbnail || img.url || img.original || index}
                        img={img}
                        index={index}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </Card>
      </div>

      {/* Видео (опционально) - ВРЕМЕННО ЗАКОММЕНТИРОВАНО до дальнейшей разработки */}
      {/* 
      <div className="flex flex-wrap">
        <Description
          title="Видео"
          details="Загрузите видео товара (опционально, до 40 Мб)"
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />
        <Card className="w-full sm:w-8/12 md:w-2/3">
          <FileInput
            name="videos"
            control={control}
            multiple={true}
            acceptVideo={true}
            maxSize={40 * 1024 * 1024}
          />
          {videosArray.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">
                Загруженные видео ({videosArray.length})
              </p>
              <div className="space-y-2">
                {videosArray.map((video: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 border rounded-lg"
                  >
                    <span className="text-sm text-gray-700">
                      {video.name || video.url || `Видео ${index + 1}`}
                    </span>
                    {video.size && (
                      <span className="text-xs text-gray-500">
                        ({(video.size / (1024 * 1024)).toFixed(2)} Мб)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
      */}
    </div>
  );
}
