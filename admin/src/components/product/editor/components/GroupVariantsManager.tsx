
import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import Card from '@/components/common/card';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useQuery } from 'react-query';
import { HttpClient } from '@/data/client/http-client';
import { useProductsQuery, useUpdateProductMutation } from '@/data/product';
import { useShopQuery } from '@/data/shop';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { SearchIcon } from '@/components/icons/search-icon';

type GroupVariant = {
  id?: string;
  attributes: Record<string, string>;
  price: number;
  sale_price?: number | null;
  quantity: number;
  sku?: string;
  slug?: string;
};

type GroupVariantsManagerProps = {
  groupKey?: string;
  onGroupKeyChange?: (key: string) => void;
};

export default function GroupVariantsManager({
  groupKey,
  onGroupKeyChange,
}: GroupVariantsManagerProps) {
  const router = useRouter();
  const { watch, setValue, getValues } = useFormContext<ProductEditorFormData>();
  const [variants, setVariants] = useState<GroupVariant[]>([]);
  const [isGroupProduct, setIsGroupProduct] = useState(false);
  const [availableAttributes, setAvailableAttributes] = useState<Record<string, string[]>>({});
  const [mergeWithProducts, setMergeWithProducts] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);

  // Получаем shop_id из slug магазина
  const { data: shopData } = useShopQuery(
    { slug: router.query.shop as string },
    {
      enabled: !!router.query.shop,
    }
  );
  const shopId = shopData?.id;

  // Мутация для обновления товара
  const { mutateAsync: updateProduct } = useUpdateProductMutation();

  const name = watch('name');
  const categoryIds = watch('category_ids');
  const currentGroupKey = watch('group_key');
  
  // Убеждаемся, что categoryIds всегда массив
  const categoryIdsArray = Array.isArray(categoryIds) ? categoryIds : [];

  // Загрузка существующих вариантов группы
  const { data: groupProducts, isLoading } = useQuery(
    ['group-products', currentGroupKey],
    async () => {
      if (!currentGroupKey) return null;
      try {
        const response = await HttpClient.get('products', {
          group_key: currentGroupKey,
          with: 'type;shop;categories;tags;attributes',
          language: router.locale || 'ru',
        });
        return response?.data || [];
      } catch (error) {
        console.error('Error loading group products:', error);
        return [];
      }
    },
    {
      enabled: !!currentGroupKey,
    }
  );

  // Загрузка атрибутов категории для выбора вариативных полей
  useEffect(() => {
    if (categoryIdsArray.length > 0) {
      const categoryId = categoryIdsArray[0];
      HttpClient.get(`categories/${categoryId}/attributes`)
        .then((response: any) => {
          if (response?.data) {
            const attrs: Record<string, string[]> = {};
            const attrsList = Array.isArray(response.data) 
              ? response.data 
              : (response.data?.attributes || []);
            
            // Ограничиваем до 3 атрибутов максимум
            let attrCount = 0;
            attrsList.forEach((attr: any) => {
              if (attrCount >= 3) return; // Максимум 3 атрибута
              
              // Только атрибуты, которые можно использовать для вариаций
              if (['color', 'size', 'volume', 'packaging'].includes(attr.slug?.toLowerCase()) ||
                  ['Цвет', 'Размер', 'Объем', 'Фасовка'].includes(attr.name)) {
                attrs[attr.id] = attr.values?.map((v: any) => 
                  typeof v === 'string' ? v : v.value
                ) || [];
                attrCount++;
              }
            });
            setAvailableAttributes(attrs);
          }
        })
        .catch((error) => {
          console.error('Error loading attributes:', error);
        });
    }
  }, [categoryIdsArray]);

  // Генерация group_key из названия
  useEffect(() => {
    if (name && !currentGroupKey && isGroupProduct) {
      const generatedKey = formatSlug(name);
      setValue('group_key', generatedKey);
      onGroupKeyChange?.(generatedKey);
    }
  }, [name, currentGroupKey, isGroupProduct, setValue, onGroupKeyChange]);

  // Загрузка существующих вариантов
  useEffect(() => {
    if (groupProducts && Array.isArray(groupProducts)) {
      const loadedVariants = groupProducts.map((product: any) => {
        // Извлекаем атрибуты из разных возможных форматов
        let attributes: Record<string, string> = {};
        
        // Проверяем attribute_values (правильный формат)
        if (product.attribute_values && typeof product.attribute_values === 'object') {
          attributes = product.attribute_values;
        }
        // Проверяем attributes (старый формат)
        else if (product.attributes && typeof product.attributes === 'object') {
          attributes = product.attributes;
        }
        
        return {
          id: product.id,
          attributes: attributes,
          price: product.price || 0,
          sale_price: product.sale_price || null,
          quantity: product.quantity || 0,
          sku: product.sku || '',
          slug: product.slug || '',
        };
      });
      setVariants(loadedVariants);
      setValue('group_variants', loadedVariants);
    }
  }, [groupProducts, setValue]);

  const handleToggleGroup = (checked: boolean) => {
    setIsGroupProduct(checked);
    setValue('is_group_product', checked);
    if (checked) {
      // Генерируем числовой group_key
      // Формат: timestamp + случайное число (например: 1735312345678)
      const generatedKey = String(Date.now() + Math.floor(Math.random() * 1000));
      setValue('group_key', generatedKey);
      onGroupKeyChange?.(generatedKey);
      // При включении группового товара создаем первый вариант сразу
      if (variants.length === 0) {
        handleAddVariant();
      }
    } else {
      setValue('group_key', undefined);
      setVariants([]);
      setValue('group_variants', []);
      setMergeWithProducts(false);
      setSelectedProductIds([]);
      setShowProductSearch(false);
    }
  };

  const handleAddVariant = () => {
    const newVariant: GroupVariant = {
      attributes: {},
      price: getValues('price') || 0,
      sale_price: getValues('sale_price') || null,
      quantity: getValues('quantity') || 0,
      sku: '',
      slug: '',
    };
    const updated = [...variants, newVariant];
    setVariants(updated);
    setValue('group_variants', updated);
  };

  // Поиск товаров для объединения (только товары текущего магазина)
  const { products, loading: productsLoading, error: productsError } = useProductsQuery(
    {
      name: productSearchQuery.trim(),
      limit: 20,
      shop_id: shopId ? String(shopId) : undefined,
      language: router.locale || 'ru',
    },
    {
      enabled: showProductSearch && productSearchQuery.trim().length > 2 && !!shopId,
    }
  );

  const availableProducts = products || [];

  // Логирование для отладки
  useEffect(() => {
    if (showProductSearch && productSearchQuery.trim().length > 2) {
      console.log('🔍 Поиск товаров для объединения:', {
        query: productSearchQuery.trim(),
        shopId: shopId ? String(shopId) : 'не загружен',
        shopSlug: router.query.shop,
        shopData: shopData ? { id: shopData.id, name: shopData.name } : 'не загружен',
        enabled: showProductSearch && productSearchQuery.trim().length > 2 && !!shopId,
        productsCount: availableProducts.length,
        loading: productsLoading,
        error: productsError?.message,
        products: availableProducts.slice(0, 3).map((p: any) => ({ id: p.id, name: p.name })),
      });
    }
  }, [productSearchQuery, shopId, shopData, showProductSearch, availableProducts.length, productsLoading, productsError]);

  // Объединение товаров в группу
  const handleMergeProducts = async () => {
    if (selectedProductIds.length === 0) {
      toast.error('Выберите товары для объединения');
      return;
    }

    if (!currentGroupKey) {
      toast.error('Сначала создайте групповой товар');
      return;
    }

    try {
      // Используем данные из уже загруженного списка товаров
      const productsToMerge = availableProducts.filter((p: any) => 
        selectedProductIds.includes(Number(p.id))
      );

      if (productsToMerge.length === 0) {
        toast.error('Выбранные товары не найдены в списке');
        return;
      }

      // Логируем структуру товаров для отладки
      console.log('Товары для объединения:', productsToMerge.map((p: any) => ({
        id: p.id,
        name: p.name,
        hasCategories: !!p.categories,
        categoriesType: Array.isArray(p.categories) ? 'array' : typeof p.categories,
        categoriesLength: Array.isArray(p.categories) ? p.categories.length : 0,
        categoryId: p.category_id,
        category: p.category,
        categories: p.categories,
      })));

      // Обновляем каждый товар с group_key
      const updatePromises = productsToMerge.map(async (product: any) => {
        try {
          const productId = Number(product.id);
          
          // Если категории не загружены, пробуем загрузить товар отдельно
          let productData = product;
          const hasCategories = Array.isArray(product.categories) && product.categories.length > 0;
          
          if (!hasCategories) {
            try {
              console.log(`Загрузка товара ${productId} отдельно для получения категорий...`, {
                productId,
                productSlug: product.slug,
                productName: product.name,
              });
              
              // Пробуем загрузить по slug, если есть, иначе по ID
              const productSlug = product.slug || productId;
              const productResponse = await HttpClient.get(`products/${productSlug}`, {
                language: router.locale || 'ru',
                with: 'type;shop;categories;tags',
              });
              
              if (productResponse?.data) {
                productData = productResponse.data;
                console.log(`Товар ${productId} загружен отдельно:`, {
                  hasCategories: Array.isArray(productData.categories) && productData.categories.length > 0,
                  categoriesCount: Array.isArray(productData.categories) ? productData.categories.length : 0,
                  categories: productData.categories,
                });
              } else {
                console.warn(`Товар ${productId} загружен, но данные пустые`);
              }
            } catch (loadError: any) {
              console.warn(`Не удалось загрузить товар ${productId} отдельно:`, {
                error: loadError?.message,
                response: loadError?.response?.data,
                status: loadError?.response?.status,
              });
              // Продолжаем с исходными данными
            }
          } else {
            console.log(`Товар ${productId} уже имеет категории в списке:`, product.categories);
          }

          // Получаем категории из основного товара (из формы)
          const mainProductCategories = watch('category_ids') || [];
          const mainCategoriesArray = Array.isArray(mainProductCategories) ? mainProductCategories : [];
          
          // Формируем данные для обновления с сохранением всех обязательных полей
          const updateData: any = {
            id: String(productId),
            name: productData.name || product.name || '',
            type_id: productData.type?.id || productData.type_id || product.type?.id || product.type_id,
            shop_id: productData.shop?.id || productData.shop_id || product.shop?.id || product.shop_id || shopId,
            product_type: productData.product_type || product.product_type || 'simple',
            unit: productData.unit || product.unit || 'шт.',
            language: router.locale || 'ru',
            group_key: currentGroupKey, // Добавляем group_key
            // Сохраняем остальные поля
            price: productData.price ?? product.price ?? 0,
            sale_price: productData.sale_price ?? product.sale_price ?? null,
            quantity: productData.quantity ?? product.quantity ?? 0,
            sku: productData.sku || product.sku || '',
            description: productData.description || product.description || '',
            status: productData.status || product.status || 'draft',
            // Категории - используем категории из основного товара (из формы)
            // Если их нет, пробуем извлечь из данных товара
            categories: (() => {
              try {
                // Приоритет: категории из основного товара (формы)
                if (mainCategoriesArray.length > 0) {
                  return mainCategoriesArray.map((id: any) => String(id)).filter(Boolean);
                }
                
                // Если нет в форме, используем категории из данных товара
                const dataSource = productData || product;
                
                // Проверяем разные форматы категорий
                if (Array.isArray(dataSource.categories) && dataSource.categories.length > 0) {
                  // Формат: [{id: 1, name: '...'}, ...]
                  const categoryIds = dataSource.categories.map((c: any) => {
                    if (typeof c === 'object' && c !== null) {
                      return String(c.id || c);
                    }
                    return String(c);
                  }).filter(Boolean);
                  
                  if (categoryIds.length > 0) {
                    return categoryIds;
                  }
                }
                
                // Проверяем category_id
                if (dataSource.category_id) {
                  return [String(dataSource.category_id)];
                }
                
                // Проверяем category (единственная категория)
                if (dataSource.category) {
                  const catId = typeof dataSource.category === 'object' 
                    ? dataSource.category.id 
                    : dataSource.category;
                  if (catId) {
                    return [String(catId)];
                  }
                }
                
                // Если категорий нет, возвращаем пустой массив
                return [];
              } catch (error) {
                console.error('Ошибка при извлечении категорий:', error);
                return [];
              }
            })(),
            // Теги
            tags: Array.isArray(product.tags) 
              ? product.tags.map((t: any) => (typeof t === 'object' ? t.id : t)).filter(Boolean)
              : [],
            // Изображения
            image: product.image || null,
            gallery: Array.isArray(product.gallery) ? product.gallery : [],
            // Габариты
            weight: product.weight || null,
            width: product.width || null,
            height: product.height || null,
            length: product.length || null,
          };

          // Проверяем обязательные поля
          if (!updateData.name) {
            throw new Error(`Товар ${product.name || productId}: отсутствует название`);
          }
          if (!updateData.type_id) {
            throw new Error(`Товар ${product.name || productId}: отсутствует type_id`);
          }
          if (!updateData.shop_id) {
            throw new Error(`Товар ${product.name || productId}: отсутствует shop_id`);
          }
          if (!updateData.categories || updateData.categories.length === 0) {
            // Логируем структуру товара для отладки
            console.error('Товар без категорий:', {
              productId,
              productName: product.name,
              productCategories: product.categories,
              productCategoryId: product.category_id,
              productCategory: product.category,
              productKeys: Object.keys(product),
            });
            throw new Error(`Товар "${product.name || productId}": отсутствуют категории`);
          }

          console.log(`Обновление товара ${productId} с group_key:`, {
            productId,
            productName: updateData.name,
            groupKey: currentGroupKey,
            updateDataKeys: Object.keys(updateData),
            hasRequiredFields: !!(updateData.name && updateData.type_id && updateData.shop_id && updateData.categories?.length > 0),
          });

          // Обновляем товар с полными данными через мутацию
          await updateProduct(updateData);
        } catch (err: any) {
          console.error(`Ошибка при обновлении товара ${product.id}:`, err);
          const errorMessage = err?.response?.data?.message || err?.message || 'Неизвестная ошибка';
          const errorDetails = err?.response?.data?.errors;
          if (errorDetails && typeof errorDetails === 'object') {
            const firstError = Object.values(errorDetails).flat()[0];
            throw new Error(`Товар ${product.name || product.id}: ${firstError || errorMessage}`);
          }
          throw new Error(`Товар ${product.name || product.id}: ${errorMessage}`);
        }
      });

      await Promise.all(updatePromises);

      toast.success(`Товары успешно объединены в группу (${selectedProductIds.length})`);
      setSelectedProductIds([]);
      setProductSearchQuery('');
      setShowProductSearch(false);
      
      // Перезагружаем варианты группы через запрос
      const response = await HttpClient.get('products', {
        group_key: currentGroupKey,
        with: 'attributes',
        language: router.locale || 'ru',
      });
      
      if (response?.data && Array.isArray(response.data)) {
        const loadedVariants = response.data.map((product: any) => {
          // Извлекаем атрибуты из разных возможных форматов
          let attributes: Record<string, string> = {};
          
          // Проверяем attribute_values (правильный формат)
          if (product.attribute_values && typeof product.attribute_values === 'object') {
            attributes = product.attribute_values;
          }
          // Проверяем attributes (старый формат)
          else if (product.attributes && typeof product.attributes === 'object') {
            attributes = product.attributes;
          }
          
          return {
            id: product.id,
            attributes: attributes,
            price: product.price || 0,
            sale_price: product.sale_price || null,
            quantity: product.quantity || 0,
            sku: product.sku || '',
            slug: product.slug || '',
          };
        });
        setVariants(loadedVariants);
        setValue('group_variants', loadedVariants);
      }
    } catch (error: any) {
      console.error('Ошибка при объединении товаров:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Неизвестная ошибка';
      toast.error(`Ошибка при объединении товаров: ${errorMessage}`);
    }
  };

  const handleVariantChange = (index: number, field: keyof GroupVariant, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
    setValue('group_variants', updated);
  };

  const handleRemoveVariant = (index: number) => {
    const updated = variants.filter((_: GroupVariant, i: number) => i !== index);
    setVariants(updated);
    setValue('group_variants', updated);
  };

  // Генерация slug для варианта
  const generateVariantSlug = (variant: GroupVariant) => {
    if (!currentGroupKey) return '';
    const attrValues = Object.values(variant.attributes).join('-');
    return `${currentGroupKey}-${formatSlug(attrValues)}-${Date.now()}`;
  };

  if (!isGroupProduct && !currentGroupKey) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">Групповой товар (Вариативный)</Label>
            <p className="text-sm text-gray-600 mt-1">
              Создайте группу товаров с разными вариантами (цвет, размер и т.д.)
            </p>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isGroupProduct}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleToggleGroup(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium">Включить</span>
          </label>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Label className="text-lg font-semibold">Варианты группы</Label>
          <p className="text-sm text-gray-600 mt-1">
            Group Key: <code className="bg-gray-100 px-2 py-1 rounded">{currentGroupKey}</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isGroupProduct}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleToggleGroup(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Групповой товар</span>
          </label>
          <Button
            type="button"
            size="small"
            onClick={handleAddVariant}
            // Кнопка активна всегда при включенном групповом товаре
          >
            ➕ Добавить вариант
          </Button>
        </div>
      </div>

      {/* Чекбокс объединения с другими товарами */}
      <div className="mb-4 p-4 border border-gray-200 rounded-lg">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={mergeWithProducts}
            onChange={(e) => {
              setMergeWithProducts(e.target.checked);
              setShowProductSearch(e.target.checked);
              if (!e.target.checked) {
                setSelectedProductIds([]);
                setProductSearchQuery('');
              }
            }}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm font-medium">Объединить с другими товарами</span>
        </label>

        {mergeWithProducts && (
          <div className="mt-4 space-y-3">
            {/* Поиск товаров */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder="Поиск товаров по названию..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Список товаров */}
            {productSearchQuery.length > 2 && (
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                {productsLoading ? (
                  <div className="p-4 text-center text-gray-500">Загрузка...</div>
                ) : productsError ? (
                  <div className="p-4 text-center text-red-500">
                    Ошибка загрузки: {productsError.message || 'Неизвестная ошибка'}
                  </div>
                ) : !shopId ? (
                  <div className="p-4 text-center text-yellow-600">
                    Загрузка данных магазина...
                  </div>
                ) : availableProducts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Товары не найдены по запросу &quot;{productSearchQuery}&quot;
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {availableProducts.map((product: any) => {
                      const isSelected = selectedProductIds.includes(Number(product.id));
                      return (
                        <label
                          key={product.id}
                          className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIds([...selectedProductIds, Number(product.id)]);
                              } else {
                                setSelectedProductIds(selectedProductIds.filter(id => id !== Number(product.id)));
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-3 text-sm flex-1">{product.name}</span>
                          {product.price && (
                            <span className="text-sm text-gray-500">{product.price} ₽</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Кнопка объединения */}
            {selectedProductIds.length > 0 && (
              <Button
                type="button"
                onClick={handleMergeProducts}
                className="w-full"
              >
                Объединить выбранные товары ({selectedProductIds.length})
              </Button>
            )}
          </div>
        )}
      </div>

      {Object.keys(availableAttributes).length === 0 && !mergeWithProducts && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">
            Для создания вариантов необходимо выбрать категорию с атрибутами (цвет, размер, объем, фасовка) или объединить с существующими товарами
          </p>
        </div>
      )}

      {variants.length > 0 && (
        <div className="space-y-4">
          {variants.map((variant: GroupVariant, index: number) => (
            <Card key={index} className="p-4 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <h4 className="font-semibold">Вариант {index + 1}</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => handleRemoveVariant(index)}
                >
                  Удалить
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Атрибуты варианта */}
                {Object.entries(availableAttributes).map(([attrId, values]) => (
                  <div key={attrId}>
                    <Label>Атрибут {attrId}</Label>
                    <select
                      value={variant.attributes[attrId] || ''}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const updated = { ...variant.attributes, [attrId]: e.target.value };
                        handleVariantChange(index, 'attributes', updated);
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                    >
                      <option value="">Выберите значение</option>
                      {(values as string[]).map((value: string) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {/* Цена */}
                <div>
                  <Input
                    label="Цена"
                    type="number"
                    step="0.01"
                    value={variant.price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariantChange(index, 'price', parseFloat(e.target.value) || 0)}
                    variant="outline"
                  />
                </div>

                {/* Цена со скидкой */}
                <div>
                  <Input
                    label="Цена со скидкой"
                    type="number"
                    step="0.01"
                    value={variant.sale_price || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariantChange(index, 'sale_price', e.target.value ? parseFloat(e.target.value) : null)}
                    variant="outline"
                  />
                </div>

                {/* Количество */}
                <div>
                  <Input
                    label="Количество"
                    type="number"
                    value={variant.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariantChange(index, 'quantity', parseInt(e.target.value) || 0)}
                    variant="outline"
                  />
                </div>

                {/* SKU */}
                <div>
                  <Input
                    label="SKU"
                    value={variant.sku || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariantChange(index, 'sku', e.target.value)}
                    variant="outline"
                    placeholder="SKU-001"
                  />
                </div>
              </div>

              {/* Автогенерация slug */}
              {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                <div className="mt-4">
                  <Label>URL варианта</Label>
                  <Input
                    value={variant.slug || generateVariantSlug(variant)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariantChange(index, 'slug', e.target.value)}
                    variant="outline"
                    placeholder="Автоматически генерируется"
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {variants.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Нет вариантов. Нажмите "Добавить вариант" для создания первого варианта.</p>
        </div>
      )}
    </Card>
  );
}

