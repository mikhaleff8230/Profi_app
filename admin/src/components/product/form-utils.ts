import {
  ProductType,
  Product,
  CreateProduct,
  Type,
  Category,
  Tag,
  Attribute,
  AttachmentInput,
  VariationOption,
  Variation,
  ProductStatus,
} from '@/types';
import groupBy from 'lodash/groupBy';
import cloneDeep from 'lodash/cloneDeep';
import orderBy from 'lodash/orderBy';
import sum from 'lodash/sum';
import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { omitTypename } from '@/utils/omit-typename';
import { cartesian } from '@/utils/cartesian';

export type ProductFormValues = Omit<
  CreateProduct,
  | 'author_id'
  | 'type_id'
  | 'manufacturer_id'
  | 'shop_id'
  | 'categories'
  | 'tags'
  | 'digital_file'
> & {
  type: Pick<Type, 'id' | 'name'>;
  product_type: ProductTypeOption;
  category?: Pick<Category, 'id' | 'name'>; // теперь одна категория
  categories?: Pick<Category, 'id' | 'name'>[]; // для обратной совместимости
  attributes: Pick<Attribute, 'id' | 'name'>[];
  tags: Pick<Tag, 'id' | 'name'>[];
  digital_file_input: AttachmentInput;
  is_digital: boolean;
  slug: string;
  attribute_values?: Record<string, any>; // значения атрибутов
  video?: File | any; // видео файл для загрузки
  video_as_cover?: boolean; // флаг "Сделать обложкой"
  // image: AttachmentInput;
};

export type ProductTypeOption = {
  value: ProductType;
  name: string;
};
export const productTypeOptions: ProductTypeOption[] = Object.entries(
  ProductType
).map(([key, value]) => ({
  name: key,
  value,
}));

export function getFormattedVariations(variations: any) {
  const variationGroup = groupBy(variations, 'attribute.slug');
  return Object.values(variationGroup)?.map((vg: any) => {
    return {
      attribute: vg?.[0]?.attribute,
      value: vg?.map((v: any) => ({ id: v.id, value: v.value })),
    };
  });
}

export function processOptions(options: any) {
  // Если options уже массив, возвращаем как есть
  if (Array.isArray(options)) {
    return options;
  }
  
  // Если options - строка, пытаемся распарсить JSON
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      // Убеждаемся, что результат - массив
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      // Если не JSON, возвращаем как есть
      return options;
    }
  }
  
  // Если options - объект, оборачиваем в массив
  if (typeof options === 'object' && options !== null) {
    return [options];
  }
  
  // В остальных случаях возвращаем пустой массив
  return [];
}

export function calculateMinMaxPrice(variationOptions: any) {
  if (!variationOptions || !variationOptions.length) {
    return {
      min_price: null,
      max_price: null,
    };
  }
  const sortedVariationsByPrice = orderBy(variationOptions, ['price']);
  const sortedVariationsBySalePrice = orderBy(variationOptions, ['sale_price']);
  return {
    min_price:
      sortedVariationsBySalePrice?.[0].sale_price <
      sortedVariationsByPrice?.[0]?.price
        ? sortedVariationsBySalePrice?.[0].sale_price
        : sortedVariationsByPrice?.[0]?.price,
    max_price:
      sortedVariationsByPrice?.[sortedVariationsByPrice?.length - 1]?.price,
  };
}

export function calculateQuantity(variationOptions: any) {
  return sum(
    variationOptions?.map(({ quantity }: { quantity: number }) => quantity)
  );
}

export function getProductDefaultValues(
  product: Product,
  isNewTranslation: boolean = false
) {
  if (!product) {
    return {
      product_type: productTypeOptions[0],
      min_price: 0.0,
      max_price: 0.0,
      category: undefined,
      categories: [],
      attributes: [],
      tags: [],
      attribute_values: {},
      in_stock: true,
      is_taxable: false,
      image: [],
      gallery: [],
      video: undefined, // Для видео файла
      video_as_cover: false, // Флаг "Сделать обложкой"
      unit: 'шт.', // Автозаполнение единицы измерения
      // isVariation: false,
      variations: [],
      variation_options: [],
      status: ProductStatus.Draft,
    };
  }
  const {
    variations,
    variation_options,
    product_type,
    is_digital,
    digital_file,
  } = product;
  // Отладочная информация для изображений
  console.log('getProductDefaultValues - Product image data:', product.image);
  console.log('getProductDefaultValues - Product gallery data:', product.gallery);
  console.log('getProductDefaultValues - Product image type:', typeof product.image);
  console.log('getProductDefaultValues - Product image isArray:', Array.isArray(product.image));
  
  // Правильная обработка изображений
  let processedImage: any = null;
  if (product.image) {
    if (Array.isArray(product.image)) {
      processedImage = product.image[0] || null;
    } else {
      processedImage = product.image;
    }
  }
  
  let processedGallery: any[] = [];
  if (product.gallery && Array.isArray(product.gallery)) {
    processedGallery = product.gallery;
  }
  
  console.log('getProductDefaultValues - processed image:', processedImage);
  console.log('getProductDefaultValues - processed gallery:', processedGallery);
  
  // Определяем категорию: берем первую категорию, если есть
  const productCategory = product.categories && product.categories.length > 0 
    ? product.categories[0] 
    : undefined;
  
  // Форматируем сохраненные значения атрибутов
  const savedAttributeValues: Record<string, any> = {};
  if (product.attributes && Array.isArray(product.attributes)) {
    product.attributes.forEach((attr: any) => {
      if (attr.pivot && attr.pivot.value) {
        savedAttributeValues[attr.id] = attr.pivot.value;
      }
    });
  }
  
  // Получаем video_as_cover из API ответа
  // API возвращает has_video_as_cover как атрибут продукта
  let videoAsCover = false;
  try {
    // Используем has_video_as_cover из API ответа
    if (product && 'has_video_as_cover' in product) {
      videoAsCover = Boolean(product.has_video_as_cover);
    }
    // Также проверяем, есть ли videos, чтобы установить флаг правильно
    if (videoAsCover && product.videos && Array.isArray(product.videos) && product.videos.length === 0) {
      // Если флаг установлен, но видео нет, сбрасываем флаг
      videoAsCover = false;
    }
  } catch (e) {
    // Игнорируем ошибки
    console.error('Error getting video_as_cover:', e);
  }

  return cloneDeep({
    ...product,
    product_type: productTypeOptions.find(
      (option) => product_type === option.value
    ),
    // Категория: теперь одна категория вместо массива
    category: productCategory,
    // Сохраняем для обратной совместимости
    categories: product.categories || [],
    // Значения атрибутов
    attribute_values: savedAttributeValues,
    // Правильно обрабатываем изображения
    image: processedImage,
    gallery: processedGallery,
    // ВАЖНО: video должен быть undefined, а не объект videos
    // videos - это данные из БД, а video - это File для загрузки
    // При копировании товара не передаем videos как video, иначе валидация упадет
    video: undefined,
    // Видео и флаг обложки
    video_as_cover: videoAsCover,
    // Убеждаемся, что статус передается правильно
    status: product.status || 'draft',
    ...(product_type === ProductType.Simple && {
      ...(is_digital && {
        digital_file_input: {
          id: digital_file?.attachment_id,
          thumbnail: digital_file?.url,
          original: digital_file?.url,
          // file_name: digital_file?.file_name,
        },
      }),
    }),

    ...(product_type === ProductType.Variable && {
      variations: getFormattedVariations(variations),
      variation_options: variation_options?.filter((opt: any) => opt != null).map(({ image, options: optionOptions, ...option }: any) => {
        // Обрабатываем options - они могут быть в разных форматах
        const processedOptions = processOptions(optionOptions);
        
        return {
          ...option,
          // Сохраняем options в правильном формате
          options: processedOptions,
          ...(image && image !== null && image !== undefined && !isEmpty(image) && typeof image === 'object' && !Array.isArray(image) && { image: omitTypename(image) }),
          ...(option?.digital_file && {
            digital_file_input: {
              id: option?.digital_file?.attachment_id,
              thumbnail: option?.digital_file?.url,
              original: option?.digital_file?.url,
            },
          }),
        };
      }),
    }),
    // isVariation: variations?.length && variation_options?.length ? true : false,

    // Remove initial dependent value for new translation
    ...(isNewTranslation && {
      type: null,
      category: null,
      categories: [],
      attributes: [],
      author_id: null,
      manufacturer_id: null,
      tags: [],
      author: [],
      manufacturer: [],
      variations: [],
      variation_options: [],
      digital_file: '',
      digital_file_input: {},
      ...(product_type === ProductType.Variable && {
        quantity: null,
      }),
    }),
  });
}

export function filterAttributes(attributes: any, variations: any) {
  let res = [];
  res = attributes?.filter((el: any) => {
    return !variations?.find((element: any) => {
      return element?.attribute?.slug === el?.slug;
    });
  });
  return res;
}

export function getCartesianProduct(values: any) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return [];
  }
  
  // Фильтруем только вариации с выбранными атрибутами и значениями
  const validVariations = values.filter((v: any) => 
    v?.attribute && 
    v?.value && 
    Array.isArray(v.value) && 
    v.value.length > 0
  );
  
  if (validVariations.length === 0) {
    return [];
  }
  
  // Форматируем значения для cartesian
  const formattedValues = validVariations.map((v: any) =>
    v.value.map((a: any) => ({ 
      id: a?.id,
      name: v?.attribute?.name || '', 
      value: a?.value || '',
      attribute: v?.attribute
    }))
  );
  
  if (isEmpty(formattedValues)) return [];
  
  try {
    return cartesian(...formattedValues);
  } catch (error) {
    console.error('Error generating cartesian product:', error);
    return [];
  }
}

export function getProductInputValues(
  values: ProductFormValues,
  initialValues: any,
  isNewTranslation: boolean = false,
  initialProductType?: ProductType // Добавляем параметр для начального типа товара
) {
  const {
    product_type,
    type,
    quantity,
    image,
    is_digital,
    category,
    categories,
    tags,
    digital_file_input,
    variation_options,
    variations,
    attribute_values,
    video, // Исключаем video из simpleValues, так как оно обрабатывается отдельно
    video_as_cover, // Исключаем video_as_cover из simpleValues
    ...simpleValues
  } = values;
  // const { locale } = useRouter();
  // const router = useRouter();

  // Отладочная информация для изображений
  console.log('getProductInputValues - image data:', image);
  console.log('getProductInputValues - gallery data:', values.gallery);
  console.log('getProductInputValues - initialValues image:', initialValues?.image);
  console.log('getProductInputValues - initialValues gallery:', initialValues?.gallery);
  
  // Правильная обработка изображений - не передаем undefined, сохраняем существующие
  // ВАЖНО: image может быть массивом [], поэтому проверяем тип
  const processedImage = (image && image !== null && image !== undefined && !Array.isArray(image) && typeof image === 'object') 
    ? omitTypename<any>(image) 
    : (initialValues?.image && initialValues.image !== null && initialValues.image !== undefined && !Array.isArray(initialValues.image) && typeof initialValues.image === 'object' 
      ? omitTypename<any>(initialValues.image) 
      : undefined);
  // ВАЖНО: Проверяем, что gallery - массив перед обработкой
  const galleryArray = Array.isArray(values.gallery) ? values.gallery : [];
  const initialGalleryArray = Array.isArray(initialValues?.gallery) ? initialValues.gallery : [];
  
  const processedGallery = galleryArray.length > 0
    ? galleryArray.filter((gi: any) => gi != null).map((gi: any) => omitTypename(gi))
    : (initialGalleryArray.length > 0
      ? initialGalleryArray.filter((gi: any) => gi != null).map((gi: any) => omitTypename(gi))
      : undefined);
  
  console.log('getProductInputValues - processed image will be sent:', processedImage);
  console.log('getProductInputValues - processed gallery will be sent:', processedGallery);
  
  // Определяем category_id: сначала из category, потом из categories[0]
  const categoryId = category?.id || (categories && categories.length > 0 ? categories[0].id : null);
  
  // Форматируем attribute_values для отправки
  const formattedAttributeValues: Record<number, any> = {};
  if (attribute_values && typeof attribute_values === 'object') {
    Object.keys(attribute_values).forEach((key) => {
      const attrId = parseInt(key);
      if (!isNaN(attrId) && attribute_values[key] !== null && attribute_values[key] !== undefined && attribute_values[key] !== '') {
        const value = attribute_values[key];
        
        // Обрабатываем разные форматы значений из формы
        let finalValue: string = '';
        
        if (Array.isArray(value)) {
          // Для multiselect - массив объектов или значений
          const values = value.map((v: any) => {
            if (typeof v === 'object' && v !== null && 'value' in v) {
              return String(v.value);
            }
            return String(v);
          });
          finalValue = values.join(',');
        } else if (typeof value === 'object' && value !== null) {
          // Для select - объект с value
          if ('value' in value) {
            finalValue = Array.isArray(value.value) 
              ? value.value.map((v: any) => String(v)).join(',')
              : String(value.value);
          } else {
            // Если объект без value, пробуем извлечь значение
            finalValue = String(value);
          }
        } else {
          // Простое значение (строка, число)
          finalValue = String(value);
        }
        
        // Сохраняем только непустые значения
        if (finalValue.trim() !== '') {
          formattedAttributeValues[attrId] = finalValue;
        }
      }
    });
  }
  
  // Обрабатываем product_type - извлекаем value если это объект
  let processedProductType = 'simple';
  if (product_type) {
    if (typeof product_type === 'object' && 'value' in product_type) {
      processedProductType = product_type.value;
    } else if (typeof product_type === 'string') {
      processedProductType = product_type;
    }
  }
  
  // ВАЖНО: При создании нового товара используем initialProductType из props
  if (!processedProductType || processedProductType === 'simple') {
    if (initialProductType) {
      processedProductType = initialProductType;
    } else if (initialValues && !isNewTranslation) {
      // При обновлении, если товар был вариативным, сохраняем его тип
      // ВАЖНО: initialValues.product_type может быть объектом {value, name} или строкой
      const initialProductTypeFromValues = initialValues.product_type;
      let initialProductTypeValue: string | undefined;
      
      if (typeof initialProductTypeFromValues === 'object' && initialProductTypeFromValues !== null && 'value' in initialProductTypeFromValues) {
        initialProductTypeValue = initialProductTypeFromValues.value;
      } else if (typeof initialProductTypeFromValues === 'string') {
        initialProductTypeValue = initialProductTypeFromValues;
      }
      
      if (initialProductTypeValue === ProductType?.Variable) {
        processedProductType = ProductType.Variable;
      }
    }
  }
  
  // Логирование для отладки вариативных товаров
  console.log('getProductInputValues - product_type processing:', {
    product_type,
    processedProductType,
    isVariable: processedProductType === ProductType?.Variable,
    initialProductType: initialValues?.product_type,
    variations: variations,
    variation_options: variation_options,
    variation_options_length: variation_options?.length || 0,
    isNewTranslation,
    hasInitialValues: !!initialValues,
    initialVariationsCount: initialValues?.variations?.length || 0,
    initialVariationOptionsCount: initialValues?.variation_options?.length || 0,
    // Добавляем проверку type
    type: type,
    type_id: type?.id,
    hasType: !!type,
    hasTypeId: !!type?.id,
    initialTypeId: initialValues?.type?.id,
  });
  
  // ВАЖНО: Удаляем только video из simpleValues (но не video_as_cover!)
  // video должно передаваться только как File через FormData, а не через JSON
  // video_as_cover нужно передавать в JSON запросе, если нет нового видео файла
  // Также извлекаем height, length, width для преобразования в строки
  const { 
    video: _, 
    height, 
    length, 
    width, 
    ...cleanSimpleValues 
  } = simpleValues;
  
  // Преобразуем числовые значения габаритов в строки для GraphQL (требуется String)
  const processedDimensions = {
    ...(height !== undefined && height !== null 
      ? { height: String(height) } 
      : {}),
    ...(length !== undefined && length !== null 
      ? { length: String(length) } 
      : {}),
    ...(width !== undefined && width !== null 
      ? { width: String(width) } 
      : {}),
  };

    // ВАЖНО: Проверка, что type выбран
    if (!type || !type.id) {
      console.error('getProductInputValues - type is missing!', {
        type,
        hasType: !!type,
        hasTypeId: !!type?.id,
        initialType: initialValues?.type,
        initialTypeId: initialValues?.type?.id,
      });
    }
    
    // ВАЖНО: Убеждаемся, что product_type правильно установлен для вариативных товаров
    // Если товар был вариативным в initialValues, но processedProductType стал 'simple', исправляем это
    let finalProductType = processedProductType;
    if (initialValues && !isNewTranslation) {
      const initialProductTypeFromValues = initialValues.product_type;
      let initialProductTypeValue: string | undefined;
      
      if (typeof initialProductTypeFromValues === 'object' && initialProductTypeFromValues !== null && 'value' in initialProductTypeFromValues) {
        initialProductTypeValue = initialProductTypeFromValues.value;
      } else if (typeof initialProductTypeFromValues === 'string') {
        initialProductTypeValue = initialProductTypeFromValues;
      }
      
      // Если товар был вариативным, но processedProductType стал 'simple', исправляем
      if (initialProductTypeValue === ProductType?.Variable && processedProductType === 'simple') {
        console.warn('getProductInputValues - WARNING: product_type was "simple" but should be "variable", fixing...');
        finalProductType = ProductType.Variable;
      }
    }
    
    console.log('getProductInputValues - final product_type:', {
      processedProductType,
      finalProductType,
      isVariable: finalProductType === ProductType?.Variable,
    });
    
    // Для вариативных товаров обрабатываем variations и variation_options
    // ВАЖНО: Используем finalProductType вместо processedProductType для проверки
    const isVariableProduct = finalProductType === ProductType?.Variable;
    
    console.log('getProductInputValues - isVariableProduct check:', {
      processedProductType,
      finalProductType,
      isVariableProduct,
      hasVariations: !!variations && Array.isArray(variations) && variations.length > 0,
      hasVariationOptions: !!variation_options && Array.isArray(variation_options) && variation_options.length > 0,
      hasInitialVariations: !!initialValues?.variations && Array.isArray(initialValues.variations) && initialValues.variations.length > 0,
      hasInitialVariationOptions: !!initialValues?.variation_options && Array.isArray(initialValues.variation_options) && initialValues.variation_options.length > 0,
    });
    
    return {
    ...cleanSimpleValues,
    ...processedDimensions,
    // ВАЖНО: Возвращаем video_as_cover, если оно было установлено
    // Это нужно для изменения флага для существующего видео без загрузки нового файла
    ...(video_as_cover !== undefined ? { video_as_cover: video_as_cover } : {}),
    is_digital: true,
    type_id: type?.id || initialValues?.type?.id || initialValues?.type_id,
    product_type: finalProductType,
    ...(categoryId ? { category_id: categoryId } : {}),
    ...(categories && categories.length > 0 && !categoryId ? { categories: categories.map((cat) => cat?.id) } : {}),
    // Обрабатываем теги: для существующих тегов передаем id, для новых - объект с name
    tags: tags && Array.isArray(tags) ? tags.map((tag: any) => {
      // Если у тега есть id - это существующий тег, передаем только id
      if (tag?.id) {
        return tag.id;
      }
      // Если у тега нет id, но есть name - это новый тег, передаем объект с name
      if (tag?.name) {
        return { name: tag.name };
      }
      // Если это уже строка или число - передаем как есть (для обратной совместимости)
      return tag;
    }).filter((tag: any) => tag !== null && tag !== undefined) : [],
    ...(Object.keys(formattedAttributeValues).length > 0 ? { attribute_values: formattedAttributeValues } : {}),
    image: processedImage,
    gallery: processedGallery,
    quantity,
    digital_file: {
      attachment_id: digital_file_input?.id,
      url: digital_file_input?.original,
      // TODO: optimize it
      ...(!isNewTranslation && { id: initialValues?.digital_file?.id }),
    },
    // Для вариативных товаров обрабатываем variations и variation_options
    ...(isVariableProduct ? {
      quantity: calculateQuantity(variation_options),
      // Преобразуем вариации в массив ID attribute_value для sync()
      // Если variations не переданы, но товар был вариативным, берем из initialValues
      variations: (() => {
        // Сначала пытаемся извлечь из текущих values
        const fromValues = variations?.flatMap(({ value }: any) =>
          value?.map(({ id }: any) => id)
        ) || [];
        
        console.log('getProductInputValues - extracting variations:', {
          fromValues,
          fromValuesLength: fromValues.length,
          hasInitialValues: !!initialValues,
          initialVariations: initialValues?.variations,
        });
        
        // Если нет в values, но есть в initialValues (отформатированные через getFormattedVariations)
        if (fromValues.length === 0 && initialValues?.variations && Array.isArray(initialValues.variations)) {
          // initialValues.variations имеет структуру [{ attribute, value: [{ id, value }] }]
          const fromInitial = initialValues.variations.flatMap((v: any) =>
            (v.value || []).map((val: any) => val.id)
          ).filter((id: any) => id !== undefined && id !== null);
          
          console.log('getProductInputValues - extracted variations from initialValues:', {
            fromInitial,
            fromInitialLength: fromInitial.length,
          });
          
          return fromInitial;
        }
        
        console.log('getProductInputValues - using variations from values:', {
          fromValues,
          fromValuesLength: fromValues.length,
        });
        
        return fromValues;
      })(),
      variation_options: {
        // @ts-ignore
        upsert: (() => {
          // Если есть variation_options в values - используем их
          if (variation_options && Array.isArray(variation_options) && variation_options.length > 0) {
            return variation_options
              .filter((vo: any) => vo != null) // Фильтруем null/undefined
              .map(
              ({
                options,
                id,
                digital_file,
                image: variationImage,
                digital_file_input: digital_file_input_,
                ...rest
              }: any) => {
                const processedOptions = processOptions(options);
                console.log('Processing variation option:', {
                  id,
                  options: processedOptions,
                  price: rest?.price,
                  quantity: rest?.quantity,
                  sku: rest?.sku,
                });
                
                // Формируем title из options, если не указан
                let variationTitle = rest?.title || '';
                if (!variationTitle && Array.isArray(processedOptions) && processedOptions.length > 0) {
                  variationTitle = processedOptions.map((opt: any) => opt?.value || '').filter(Boolean).join('/');
                }
                if (!variationTitle) {
                  variationTitle = 'Variant';
                }
                
                return {
                  ...(id && id !== '' && id !== undefined ? { id: String(id) } : {}),
                  ...omit(rest, ['__typename', 'title', 'price', 'sale_price', 'quantity', 'sku', 'options', 'is_disable', 'is_digital']),
                  title: variationTitle,
                  price: rest?.price !== undefined && rest?.price !== null ? String(rest.price) : '0',
                  sale_price: rest?.sale_price !== undefined && rest?.sale_price !== null && rest?.sale_price !== '' ? String(rest.sale_price) : null,
                  quantity: rest?.quantity !== undefined && rest?.quantity !== null ? parseInt(String(rest.quantity), 10) : 0,
                  sku: rest?.sku || '',
                  is_disable: rest?.is_disable || false,
                  is_digital: rest?.is_digital || false,
                  ...(variationImage && variationImage !== null && variationImage !== undefined && !isEmpty(variationImage) && typeof variationImage === 'object' && !Array.isArray(variationImage) && {
                    image: omitTypename(variationImage),
                  }),
                  ...(rest?.is_digital && digital_file_input_ && {
                    digital_file: {
                      id: digital_file?.id,
                      attachment_id: digital_file_input_?.id,
                      url: digital_file_input_?.original,
                    },
                  }),
                  options: Array.isArray(processedOptions) && processedOptions.length > 0
                    ? processedOptions.map(
                        ({ name, value }: VariationOption) => ({
                          name: name || '',
                          value: value || '',
                        })
                      )
                    : [],
                };
              }
            );
          }
          
          // Если variation_options пустой в values, но товар был вариативным и есть в initialValues - используем их
          if (initialValues?.variation_options && Array.isArray(initialValues.variation_options) && initialValues.variation_options.length > 0) {
            console.log('getProductInputValues - using variation_options from initialValues:', {
              count: initialValues.variation_options.length,
            });
            
            return initialValues.variation_options
              .filter((vo: any) => vo != null) // Фильтруем null/undefined
              .map((vo: any) => {
                const processedOptions = processOptions(vo.options);
                
                return {
                  ...(vo?.id ? { id: String(vo.id) } : {}),
                  ...omit(vo, ['__typename', 'title', 'price', 'sale_price', 'quantity', 'sku', 'options', 'is_disable', 'is_digital', 'image', 'digital_file', 'digital_file_input']),
                  title: vo?.title || 'Variant',
                  price: vo?.price !== undefined && vo?.price !== null ? String(vo.price) : '0',
                  sale_price: vo?.sale_price !== undefined && vo?.sale_price !== null && vo?.sale_price !== '' ? String(vo.sale_price) : null,
                  quantity: vo?.quantity !== undefined && vo?.quantity !== null ? parseInt(String(vo.quantity), 10) : 0,
                  sku: vo?.sku || '',
                  is_disable: vo?.is_disable || false,
                  is_digital: vo?.is_digital || false,
                  ...(vo?.image && vo.image !== null && vo.image !== undefined && !isEmpty(vo.image) && typeof vo.image === 'object' && !Array.isArray(vo.image) && {
                    image: omitTypename(vo.image),
                  }),
                ...(vo?.is_digital && vo?.digital_file_input && {
                  digital_file: {
                    id: vo?.digital_file?.id,
                    attachment_id: vo?.digital_file_input?.id,
                    url: vo?.digital_file_input?.original,
                  },
                }),
                options: Array.isArray(processedOptions) && processedOptions.length > 0
                  ? processedOptions.map(
                      ({ name, value }: VariationOption) => ({
                        name: name || '',
                        value: value || '',
                      })
                    )
                  : [],
              };
            });
          }
          
          // Если ничего нет - возвращаем пустой массив
          return [];
        })(),
        delete: (() => {
          // Определяем, какие варианты нужно удалить
          // Удаляем те, которые были в initialValues, но отсутствуют в текущих variation_options
          if (!initialValues?.variation_options || !Array.isArray(initialValues.variation_options)) {
            return [];
          }
          
          const currentIds = (variation_options || [])
            .map((vo: any) => vo?.id)
            .filter((id: any) => id !== undefined && id !== null && id !== '');
          
          const toDelete = initialValues.variation_options
            .map((initialVO: Variation) => {
              // Если у варианта есть id и его нет в текущих вариантах - удаляем
              if (initialVO?.id && !currentIds.includes(String(initialVO.id))) {
                return initialVO.id;
              }
              return null;
            })
            .filter((id: any) => id !== null && id !== undefined);
          
          console.log('getProductInputValues - variation_options delete:', {
            initial_count: initialValues.variation_options.length,
            current_count: variation_options?.length || 0,
            current_ids: currentIds,
            to_delete: toDelete,
          });
          
          return toDelete;
        })(),
      },
    } : {
      variations: [],
      variation_options: {
        upsert: [],
        delete: initialValues?.variation_options?.map(
          (variation: Variation) => variation?.id
        ) || [],
      },
    }),
    ...(isVariableProduct ? calculateMinMaxPrice(variation_options) : { min_price: null, max_price: null }),
  };
}