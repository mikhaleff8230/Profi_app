import { useFormContext, Controller } from 'react-hook-form';
import Input from '@/components/ui/input';
import TextArea from '@/components/ui/text-area';
import RichTextEditor from '@/components/ui/rich-text-editor';
import Label from '@/components/ui/label';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useCategoriesQuery } from '@/data/category';
import { useTypesQuery } from '@/data/type';
import { useProductQuery } from '@/data/product';
import { useEffect, useState } from 'react';
import { formatSlug } from '@/utils/use-slug';
import { useProductEditorStore } from '@/store/useProductEditorStore';
import TagAutocomplete from '../components/TagAutocomplete';
import ProductTypeSelect from '@/components/product-group/product-type-select';
import CategorySelectModal from '../components/CategorySelectModal';
import BrandAutocomplete from '../components/BrandAutocomplete';
import Button from '@/components/ui/button';
import { EditIcon } from '@/components/icons/edit';
import { useRouter } from 'next/router';
import { Config } from '@/config';
import { useTranslation } from 'next-i18next';
import { getAuthCredentials, hasAccess, adminOnly } from '@/utils/auth-utils';

export default function StepGeneral() {
  const { t } = useTranslation('common');
  const { register, control, watch, setValue, formState: { errors }, getValues } = useFormContext<ProductEditorFormData>();
  const { product } = useProductEditorStore();
  const router = useRouter();
  const name = watch('name');
  const slug = watch('slug');
  const categoryIds = watch('category_ids');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSlugDisable, setIsSlugDisable] = useState<boolean>(true);
  
  // Проверяем права доступа - только супер-админ может редактировать slug
  const { permissions } = getAuthCredentials();
  const isSuperAdmin = hasAccess(adminOnly, permissions);
  
  // Определяем, редактируем ли мы существующий товар
  const isEditMode = !!product?.id;
  const isSlugEditable = router?.query?.action === 'edit' || isEditMode;
  const isDefaultLanguage = router?.locale === Config.defaultLanguage;

  // Загрузка категорий
  const { categories, loading: categoriesLoading } = useCategoriesQuery({
    limit: 1000,
  });

  // Загрузка товара для получения категории (для быстрого отображения)
  const productSlug = router.query.productSlug as string;
  const { product: loadedProduct } = useProductQuery(
    {
      slug: productSlug || '',
      language: router.locale || Config.defaultLanguage,
    },
    {
      enabled: Boolean(productSlug),
    }
  );

  // Получение названия выбранной категории
  // Сначала пытаемся использовать категорию из загруженного товара (быстрое отображение)
  const initialCategory = loadedProduct?.categories?.[0] || product?.categories?.[0] || (product as any)?.category;
  const initialCategoryName = initialCategory?.name || (typeof initialCategory === 'object' ? initialCategory?.name : undefined);
  
  // Затем ищем в загруженных категориях
  const selectedCategoryFromList = Array.isArray(categories) 
    ? categories.find(
        (cat: any) => Number(cat.id) === (Array.isArray(categoryIds) ? categoryIds[0] : categoryIds)
      )
    : undefined;
  
  // Используем категорию из списка, если она загружена, иначе из загруженного товара
  const selectedCategory = selectedCategoryFromList || (initialCategory && categoryIds?.length > 0 ? {
    id: Array.isArray(categoryIds) ? categoryIds[0] : categoryIds,
    name: initialCategoryName || 'Загрузка...'
  } : undefined);

  // Загрузка типов товаров
  const { types, loading: typesLoading } = useTypesQuery({
    limit: 1000,
  });

  // НЕ генерируем slug автоматически при создании - он будет сгенерирован после сохранения

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-heading mb-4">
          Основная информация
        </h2>
        <p className="text-sm text-body mb-6">
          Заполните основную информацию о товаре. Поля, отмеченные *, обязательны для заполнения.
        </p>
      </div>

      {/* Название товара - полная ширина */}
      <div className="max-w-2xl">
        <Input
          label="Название товара"
          {...register('name')}
          error={errors.name?.message}
          variant="outline"
          floatingLabel
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Название должно быть понятным покупателю
        </p>
      </div>

      {/* Категория - отдельная строка сразу после названия, широкая как Бренд */}
      <div className="max-w-md">
        <Label>Категория *</Label>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsCategoryModalOpen(true)}
          className="w-full justify-start text-left pl-4"
        >
          <span className="text-left w-full">{selectedCategory ? selectedCategory.name : 'Выберите категорию'}</span>
        </Button>
        {selectedCategory && (
          <p className="text-xs text-gray-500 mt-1">
            Выбрано: {selectedCategory.name}
          </p>
        )}
        {errors.category_ids && (
          <p className="text-xs text-red-500 mt-1">{errors.category_ids.message}</p>
        )}
        <CategorySelectModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSelect={(categoryId) => {
            setValue('category_ids', [categoryId], { shouldValidate: true });
          }}
          selectedCategoryId={Array.isArray(categoryIds) ? categoryIds[0] : categoryIds}
        />
      </div>

      {/* URL адрес (slug) - полная ширина - только для супер-админа */}
      {isSuperAdmin && (
        <div className="max-w-2xl">
          {isEditMode && isSlugEditable && isDefaultLanguage ? (
            <div className="relative">
              <Input
                label="URL адрес"
                {...register('slug', {
                  onChange: (e) => {
                    // При изменении slug автоматически убираем 12-значный код, если он был введен
                    const value = e.target.value;
                    if (value) {
                      // Проверяем, есть ли в конце 12-значный код
                      const match = value.match(/^(.+)-(\d{12})$/);
                      if (match) {
                        // Убираем код, оставляем только базовую часть
                        const baseSlug = match[1];
                        setValue('slug', baseSlug, { shouldValidate: false });
                      }
                    }
                  },
                })}
                value={slug || ''}
                error={errors.slug?.message}
                variant="outline"
                disabled={isSlugDisable}
              />
              <button
                className="absolute top-[27px] right-px z-10 flex h-[46px] w-11 items-center justify-center rounded-tr rounded-br border-l border-solid border-border-base bg-white px-2 text-body transition duration-200 hover:text-heading focus:outline-none"
                type="button"
                title="Редактировать"
                onClick={() => setIsSlugDisable(!isSlugDisable)}
              >
                <EditIcon width={14} />
              </button>
            </div>
          ) : (
            <Input
              label="URL адрес"
              {...register('slug')}
              value={slug || ''}
              error={errors.slug?.message}
              variant="outline"
              disabled
            />
          )}
          <p className="text-xs text-gray-500 mt-1">
            {isEditMode 
              ? 'URL адрес товара. Нажмите на иконку редактирования, чтобы изменить.'
              : 'Автоматически генерируется из названия после сохранения товара'}
          </p>
        </div>
      )}

      {/* Тип товара - отдельная строка */}
      <div className="max-w-md">
        <ProductTypeSelect control={control} error={errors.type_id?.message} />
      </div>

      {/* Артикул продавца - перед Брендом */}
      <div className="max-w-[224px]">
        <Input
          label="Артикул продавца *"
          {...register('sku', {
            pattern: {
              value: /^[a-zA-Z0-9]+$/,
              message: 'Артикул может содержать только латинские буквы и цифры'
            },
            onChange: (e) => {
              // Фильтруем ввод - оставляем только латинские буквы и цифры
              const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
              e.target.value = value;
            }
          })}
          error={errors.sku?.message}
          variant="outline"
          floatingLabel
        />
      </div>

      {/* Бренд - короткое поле с автодополнением */}
      <div className="max-w-md">
        <Label>Бренд *</Label>
        <BrandAutocomplete
          value={watch('brand') || ''}
          onChange={(value) => {
            setValue('brand', value, { shouldValidate: true });
          }}
          error={errors.brand?.message}
          required
        />
      </div>

      {/* Теги - полная ширина */}
      <div className="max-w-2xl">
        <Label>Теги</Label>
        <TagAutocomplete
          value={watch('tags') || []}
          onChange={(value) => {
            setValue('tags', value, { shouldValidate: true });
          }}
          error={errors.tags?.message}
          maxTags={5}
        />
      </div>

      {/* Описание - полная ширина */}
      <div className="max-w-2xl">
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <RichTextEditor
              label="Описание товара"
              name="description"
              value={value || ''}
              onChange={onChange}
              error={errors.description?.message}
              variant="outline"
            />
          )}
        />
      </div>

    </div>
  );
}

