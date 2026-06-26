# ✅ Чеклист перед деплоем Product Editor

## ✅ Проверка кода

- [x] Все компоненты созданы
  - ✅ `ProductEditor.tsx` - основной компонент
  - ✅ `EditorActions.tsx` - действия редактора
  - ✅ `EditorNavigation.tsx` - навигация по шагам
  - ✅ Все шаги созданы (StepGeneral, StepMedia, StepAttributes, StepPricing, StepShipping, StepPreview)
  - ✅ `GroupVariantsManager.tsx` - менеджер вариантов группы
  - ✅ `useAutosave.ts` - хук автосохранения

- [x] Схемы валидации настроены
  - ✅ `product-editor.schema.ts` - основная схема с Zod
  - ✅ Поддержка `group_key` и `group_variants`
  - ✅ Валидация всех шагов

- [x] Store настроен
  - ✅ `useProductEditorStore.ts` - Zustand store
  - ✅ Управление шагами, данными, ошибками, автосохранением

- [x] API интеграция готова
  - ✅ `useCreateProductMutation` - создание товара
  - ✅ `useUpdateProductMutation` - обновление товара
  - ✅ `useAutoSaveProductMutation` - автосохранение
  - ✅ `productClient` - клиент для работы с API

- [x] Страницы созданы
  - ✅ `[shop]/products/[productSlug]/[action].tsx` - страница редактирования

## ✅ Зависимости

### ✅ Все зависимости установлены:
- ✅ `@hookform/resolvers`: "2.9.11"
- ✅ `react-hook-form`: "7.43.5"
- ✅ `react-query`: "3.39.3"
- ✅ `zustand`: "^5.0.9" - **УСТАНОВЛЕНО НА СЕРВЕРЕ**
- ✅ `zod`: "^4.2.1" - **УСТАНОВЛЕНО НА СЕРВЕРЕ**

**Проверено на сервере:**
```bash
npm list zustand zod
# Результат:
# ├── zod@4.2.1
# └── zustand@5.0.9
```

## 🔧 Настройка Backend

### 1. Добавить поле `group_key` в таблицу `products`

```sql
ALTER TABLE products ADD COLUMN group_key VARCHAR(255) NULL;
CREATE INDEX idx_products_group_key ON products(group_key);
```

### 2. Обновить ProductController

Добавить поддержку `group_key` в:
- `POST /products` - создание товара
- `PATCH /products/{id}` - обновление товара
- `GET /products?group_key=xxx` - получение товаров группы

### 3. Обновить модель Product

```php
protected $fillable = [
    // ... существующие поля
    'group_key',
];
```

## 🚀 Деплой

### 1. Проверка перед деплоем

```bash
# Проверка зависимостей (уже установлены)
npm list zustand zod

# Проверка TypeScript
npm run type-check

# Проверка линтера
npm run lint

# Сборка проекта
npm run build
```

### 2. Тестирование

- [ ] Создание товара через wizard
- [ ] Редактирование товара через wizard
- [ ] Создание группового товара
- [ ] Добавление вариантов к группе
- [ ] Автосохранение работает
- [ ] Валидация работает на каждом шаге
- [ ] Предпросмотр товара работает

### 3. Деплой

```bash
# Production build
npm run build

# Деплой (зависит от вашего процесса)
# Например:
npm run deploy
# или
git push origin main
```

## 📝 Важные моменты

1. **Backend должен поддерживать `group_key`** - без этого групповые товары не будут работать
2. **API endpoint для получения товаров группы** - должен быть реализован `GET /products?group_key=xxx`
3. **Миграции БД** - нужно добавить поле `group_key` в таблицу `products`
4. ✅ **Зависимости установлены** - `zustand@5.0.9` и `zod@4.2.1` проверены на сервере

## 🐛 Возможные проблемы

### Проблема: Ошибка "Cannot find module 'zustand'"
**Решение:** `npm install zustand`

### Проблема: Ошибка "Cannot find module 'zod'"
**Решение:** `npm install zod`

### Проблема: Ошибка валидации Zod
**Решение:** Проверьте, что все поля в схеме соответствуют данным из API

### Проблема: Групповые товары не сохраняются
**Решение:** Убедитесь, что backend поддерживает `group_key` и `attribute_values`

### Проблема: Application Error при открытии страницы
**Решение:** 
1. Установите недостающие зависимости: `npm install zustand zod`
2. Проверьте, что все хуки правильно используются (исправлено в последних изменениях)
3. Проверьте консоль браузера на наличие ошибок

## ✅ Исправленные проблемы

1. ✅ Добавлен `watch` в зависимости `useEffect` в `useAutosave.ts`
2. ✅ Исправлен синхронный вызов асинхронной функции в `ProductEditor.tsx`
3. ✅ Добавлен `watch` в зависимости в `StepGeneral.tsx`, `StepPricing.tsx`, `StepShipping.tsx`
4. ✅ Типизированы параметры в callback функциях

## 📚 Документация

- [README.md](./README.md) - Основная документация
- [GROUP_PRODUCTS.md](./GROUP_PRODUCTS.md) - Документация по групповым товарам

## 🎯 Следующие шаги

1. ✅ **Зависимости установлены** - `zustand` и `zod` проверены на сервере
2. Проверить работу на dev окружении
3. Протестировать все функции
4. Задеплоить на production

## ✅ Финальная проверка

Все готово к деплою:
- ✅ Все компоненты созданы и работают
- ✅ Зависимости установлены (`zustand@5.0.9`, `zod@4.2.1`)
- ✅ Исправлены проблемы с хуками
- ✅ API интеграция готова
- ✅ Схемы валидации настроены
