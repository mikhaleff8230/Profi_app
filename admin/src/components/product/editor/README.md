# Product Editor (Wizard)

Редактор товара с пошаговой формой в стиле Ozon.

## Структура

```
editor/
├── ProductEditor.tsx          # Главный компонент редактора
├── EditorNavigation.tsx        # Навигация по шагам
├── EditorActions.tsx          # Кнопки действий
├── steps/
│   ├── StepGeneral.tsx        # Шаг 1: Основная информация
│   ├── StepMedia.tsx          # Шаг 2: Фото и видео
│   ├── StepAttributes.tsx     # Шаг 3: Характеристики
│   ├── StepPricing.tsx        # Шаг 4: Цена и наличие
│   ├── StepShipping.tsx       # Шаг 5: Доставка
│   └── StepPreview.tsx        # Шаг 6: Предпросмотр
└── hooks/
    └── useAutosave.ts         # Хук для автосохранения
```

## Использование

### Создание товара

```tsx
import ProductEditor from '@/components/product/editor/ProductEditor';

<ProductEditor />
```

### Редактирование товара

```tsx
import ProductEditor from '@/components/product/editor/ProductEditor';

<ProductEditor 
  initialProduct={product} 
  productId={product.id} 
/>
```

## Страницы

- `/dashboard/products/create` - Создание товара
- `/dashboard/products/[slug]/edit-wizard` - Редактирование товара (wizard)

## Особенности

1. **Автосохранение** - Автоматически сохраняет изменения каждые 2 секунды (только для существующих товаров)
2. **Валидация** - Использует Zod схемы для валидации каждого шага
3. **Динамические атрибуты** - Загружает атрибуты категории автоматически
4. **Предпросмотр** - Показывает, как товар будет выглядеть на витрине
5. **Прогресс** - Визуальный индикатор прогресса заполнения формы

## Store

Использует Zustand store (`useProductEditorStore`) для управления состоянием:
- Текущий шаг
- Данные товара
- Ошибки валидации
- Состояние загрузки
- Время последнего сохранения

## API

Редактор использует существующие API эндпоинты:
- `POST /products` - Создание товара
- `PATCH /products/{id}` - Обновление товара
- `GET /products/{slug}` - Получение товара для предпросмотра
- `GET /categories/{id}/attributes` - Получение атрибутов категории




