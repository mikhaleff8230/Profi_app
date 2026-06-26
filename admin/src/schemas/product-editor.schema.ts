import { z } from 'zod';

// Схема для изображения
export const ImageSchema = z.object({
  id: z.number().optional(),
  url: z.string(),
  thumbnail: z.string().optional(),
  original: z.string().optional(),
});

// Схема для значений атрибутов
export const AttributeValueSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string())])
);

// Схема для атрибута
export const AttributeSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
  values: z.array(z.string()).optional(),
});

// Схема для вариации
export const VariationSchema = z.object({
  id: z.number().optional(),
  sku: z.string(),
  price: z.number().min(0),
  sale_price: z.number().min(0).optional().nullable(),
  quantity: z.number().int().min(0),
  attributes: z.record(z.string()).optional(),
});

// Функция для нормализации массивов
const normalizeArray = <T,>(value: unknown, defaultValue: T[] = []): T[] => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return defaultValue;
  return defaultValue;
};

/** Пустые поля / NaN из number-input → undefined */
const optionalFiniteNumber = z.preprocess((val: unknown) => {
  if (val === '' || val === undefined || val === null) return undefined;
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : undefined;
}, z.number().optional());

// Основная схема товара
export const ProductEditorSchema = z.object({
  // Шаг 1: Основная информация
  name: z.string().min(1, 'Название обязательно'),
  slug: z.string().optional(),
  description: z.string().optional(),
  type_id: z.union([z.string(), z.number(), z.object({ id: z.union([z.string(), z.number()]), name: z.string() })]).optional(),
  category_ids: z.preprocess((val: unknown) => normalizeArray<number>(val, []), z.array(z.number())),
  brand: z.string().min(1, 'Бренд обязателен для заполнения'),
  tags: z.preprocess((val: unknown) => normalizeArray<string>(val, []), z.array(z.string())),
  // Групповой товар
  group_key: z.string().optional(),
  is_group_product: z.boolean().optional(),
  group_variants: z.preprocess((val: unknown) => normalizeArray(val, []), z.array(z.object({
    id: z.string().optional(),
    attributes: z.record(z.string()),
    price: z.number().min(0),
    sale_price: z.number().min(0).optional().nullable(),
    quantity: z.number().int().min(0),
    sku: z.string().optional(),
    slug: z.string().optional(),
  }))),

  // Шаг 2: Медиа
  image: ImageSchema.optional().nullable(),
  gallery: z.preprocess((val: unknown) => normalizeArray(val, []), z.array(ImageSchema)),
  videos: z.preprocess((val: unknown) => normalizeArray(val, []), z.array(z.any())),

  // Шаг 3: Характеристики
  attributes: z.preprocess((val: unknown) => normalizeArray(val, []), z.array(AttributeSchema)),
  attribute_values: AttributeValueSchema.optional(),
  grouping_attributes: z.preprocess((val: unknown) => normalizeArray<number>(val, []), z.array(z.number())).optional(),

  // Шаг 4: Цена и наличие
  price: z.number().min(0, 'Цена должна быть положительной').optional(),
  sale_price: z.number().min(0).optional().nullable(),
  quantity: z.number().int().min(0, 'Количество не может быть отрицательным').optional(),
  sku: z.string().regex(/^[a-zA-Z0-9]*$/, 'Артикул может содержать только латинские буквы и цифры').optional(),
  preview_url: z.string().optional(),
  is_external: z.boolean().optional(),
  external_product_url: z.string().optional(),
  digital_file_input: z.any().optional(),

  digital_product_type: z
    .enum(['file', 'prompt', 'link', 'account', 'key', 'subscription'])
    .optional()
    .default('file'),
  prompt_text: z.string().optional(),
  external_url: z.string().optional(),
  /** Многострочный список ключей (админка) */
  digital_license_keys: z.string().optional(),
  /** JSON с login/password для типа account */
  digital_account_json: z.string().optional(),
  subscription_days: optionalFiniteNumber,
  /** Биллинг доступа к курсу (товар digital_product_type = subscription) */
  billing_access_type: z.enum(['subscription', 'one_time', 'lifetime']).optional(),
  /** Период подписки в днях (приоритет над subscription_days в CourseSubscriptionService) */
  duration_days: optionalFiniteNumber,
  /** Контент курса: уроки привязаны к товару на бэкенде */
  course: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      lessons: z.preprocess(
        (val: unknown) => normalizeArray(val, []),
        z.array(
          z.object({
            id: z.union([z.number(), z.string()]).optional(),
            title: z.string().optional(),
            content_type: z.string().max(32).optional(),
            content_url: z.string().optional(),
            content_body: z.string().optional(),
            position: optionalFiniteNumber,
            drip_days: optionalFiniteNumber,
          })
        )
      ),
    })
    .optional(),

  // Шаг 5: Доставка
  weight: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  length: z.number().min(0).optional(),
  /** Адрес показа на карте (витрина) */
  address: z.string().optional(),
  region_id: optionalFiniteNumber,
  lat: optionalFiniteNumber,
  lng: optionalFiniteNumber,

  // Дополнительные поля
  status: z.enum(['draft', 'publish', 'under_review', 'approved', 'rejected', 'unpublish']).default('draft'),
  variations: z.preprocess((val: unknown) => normalizeArray(val, []), z.array(VariationSchema)),
});

export type ProductEditorFormData = z.infer<typeof ProductEditorSchema>;

// Схемы для отдельных шагов
export const GeneralStepSchema = z.object({
  name: z.string().min(3, 'Название должно содержать минимум 3 символа'),
  slug: z.string().optional(),
  description: z.string().optional(),
  category_ids: z.array(z.number()).min(1, 'Выберите хотя бы одну категорию'),
  brand: z.string().min(1, 'Бренд обязателен для заполнения'),
  tags: z.array(z.string()).optional(),
  group_key: z.string().optional(),
  is_group_product: z.boolean().optional(),
});

export const MediaStepSchema = z.object({
  image: ImageSchema.optional().nullable(),
  gallery: z.union([z.array(ImageSchema), z.undefined(), z.null()]).default([]),
  videos: z.union([z.array(z.any()), z.undefined(), z.null()]).default([]),
});

export const AttributesStepSchema = z.object({
  attribute_values: AttributeValueSchema.optional(),
});

export const PricingStepSchema = z.object({
  price: z.number().min(0, 'Цена должна быть положительной'),
  sale_price: z.number().min(0).optional().nullable(),
  quantity: z.number().int().min(0, 'Количество не может быть отрицательным'),
  sku: z.string().regex(/^[a-zA-Z0-9]*$/, 'Артикул может содержать только латинские буквы и цифры').optional(),
  preview_url: z.string().optional(),
  is_external: z.boolean().optional(),
  external_product_url: z.string().optional(),
  digital_file_input: z.any().optional(),
  digital_product_type: z.enum(['file', 'prompt', 'link', 'account', 'key', 'subscription']).optional(),
  prompt_text: z.string().optional(),
  external_url: z.string().optional(),
  digital_license_keys: z.string().optional(),
  digital_account_json: z.string().optional(),
  subscription_days: optionalFiniteNumber,
});

export const CourseStepSchema = z.object({
  billing_access_type: z.enum(['subscription', 'one_time', 'lifetime']).optional(),
  duration_days: optionalFiniteNumber,
  course: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      lessons: z.preprocess(
        (val: unknown) => normalizeArray(val, []),
        z.array(
          z.object({
            id: z.union([z.number(), z.string()]).optional(),
            title: z.string().optional(),
            content_type: z.string().max(32).optional(),
            content_url: z.string().optional(),
            content_body: z.string().optional(),
            position: optionalFiniteNumber,
            drip_days: optionalFiniteNumber,
          })
        )
      ),
    })
    .optional(),
});

export const ShippingStepSchema = z.object({
  weight: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  length: z.number().min(0).optional(),
  address: z.string().optional(),
  region_id: optionalFiniteNumber,
  lat: optionalFiniteNumber,
  lng: optionalFiniteNumber,
});

