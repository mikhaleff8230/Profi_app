# Групповые товары (Вариативные через group_key)

## Концепция

Товары связываются через `group_key`, каждый товар остается самостоятельным с уникальным `slug`.

## Структура данных

```typescript
{
  id: 101,
  name: "Футболка",
  slug: "tshirt-black-m-3433344343",
  group_key: "tshirt-basic",
  attribute_values: {
    "color": "black",
    "size": "M"
  },
  price: 1999,
  quantity: 10
}
```

## Использование в редакторе

### 1. Создание первого товара группы

1. Заполните основную информацию (название, категория)
2. Включите переключатель "Групповой товар"
3. Система автоматически сгенерирует `group_key` из названия
4. Добавьте варианты через кнопку "➕ Добавить вариант"
5. Заполните атрибуты каждого варианта (цвет, размер и т.д.)
6. Укажите цену, количество, SKU для каждого варианта

### 2. Добавление варианта к существующей группе

1. Откройте любой товар группы
2. В разделе "Групповой товар" нажмите "➕ Добавить вариант"
3. Заполните данные нового варианта
4. Сохраните

### 3. Атрибуты для вариаций

Система автоматически определяет атрибуты, которые можно использовать для вариаций:
- `color` / `Цвет`
- `size` / `Размер`
- `volume` / `Объем`
- `packaging` / `Фасовка`

## Логика работы

### Генерация group_key

```typescript
group_key = formatSlug(name) // "Футболка" → "futbolka"
```

### Генерация slug для варианта

```typescript
slug = `${group_key}-${formatSlug(attrValues)}-${timestamp}`
// "futbolka-black-m-3433344343"
```

### Сохранение вариантов

При сохранении основного товара:
1. Сохраняется основной товар с `group_key`
2. Для каждого варианта создается отдельный товар:
   - С тем же `group_key`
   - С уникальным `slug`
   - С атрибутами варианта в `attribute_values`

## API

### Получение товаров группы

```typescript
GET /products?group_key=tshirt-basic
```

### Создание варианта

```typescript
POST /products
{
  name: "Футболка",
  slug: "tshirt-white-m-3433344344",
  group_key: "tshirt-basic",
  category_ids: [1],
  price: 1999,
  attribute_values: {
    "color": "white",
    "size": "M"
  }
}
```

## Frontend: Отображение в карточке товара

```typescript
// Загрузка товаров группы
const productsInGroup = await api.get(`/products?group_key=${groupKey}`);

// Группировка по атрибутам
const variations = groupByAttributes(productsInGroup);

// Переключение варианта
function onVariantClick(attrs) {
  const matched = productsInGroup.find(p =>
    Object.entries(attrs).every(
      ([key, val]) => p.attribute_values[key] === val
    )
  );
  router.push(`/product/${matched.slug}`);
}
```

## Важные моменты

1. ✅ Каждый вариант - отдельный товар с уникальным URL
2. ✅ Все варианты связаны через `group_key`
3. ✅ Переключение между вариантами без перезагрузки страницы
4. ✅ Недоступные варианты показываются как disabled
5. ✅ Автоматическая генерация slug для каждого варианта




