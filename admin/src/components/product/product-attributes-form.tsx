import { Control, useWatch } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import Card from '@/components/common/card';
import Description from '@/components/ui/description';
import Label from '@/components/ui/label';
import Input from '@/components/ui/input';
import SelectInput from '@/components/ui/select-input';
import TextArea from '@/components/ui/text-area';
import { useAttributesQuery } from '@/data/attributes';
import { useCategoryAttributesQuery } from '@/data/category';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { Attribute } from '@/types';
import { useFormContext } from 'react-hook-form';

interface ProductAttributesFormProps {
  control: Control<any>;
  initialValues?: any;
}

export default function ProductAttributesForm({
  control,
  initialValues,
}: ProductAttributesFormProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // Отслеживаем выбранную категорию из формы
  const category = useWatch({
    control,
    name: 'category',
  });

  // Определяем ID категории: из формы или из initialValues
  const categoryId = useMemo(() => {
    if (category) {
      const catId = typeof category === 'object' ? category.id : category;
      if (catId) {
        return catId;
      }
    }
    // Если категория не выбрана в форме, берем из initialValues
    if (initialValues?.categories && initialValues.categories.length > 0) {
      return initialValues.categories[0].id;
    }
    // Также проверяем category из initialValues
    if (initialValues?.category) {
      return typeof initialValues.category === 'object' 
        ? initialValues.category.id 
        : initialValues.category;
    }
    return undefined;
  }, [category, initialValues]);

  // Загружаем общие атрибуты (is_common = true)
  const { attributes: commonAttributes, loading: commonLoading } = useAttributesQuery(
    {
      is_common: true,
      limit: 999,
      language: router.locale,
    }
  );

  // Загружаем атрибуты категории, если категория выбрана
  const {
    data: categoryAttributesData,
    isLoading: categoryAttributesLoading,
  } = useCategoryAttributesQuery(categoryId);

  const categoryAttributes = categoryAttributesData?.data || [];

  // Объединяем все атрибуты
  const allAttributes = useMemo(() => {
    const combined: Attribute[] = [];
    
    // Добавляем общие атрибуты
    if (commonAttributes) {
      combined.push(...commonAttributes);
    }
    
    // Добавляем атрибуты категории (исключаем дубликаты)
    if (categoryAttributes) {
      categoryAttributes.forEach((attr: Attribute) => {
        if (!combined.find((a) => a.id === attr.id)) {
          combined.push(attr);
        }
      });
    }
    
    return combined;
  }, [commonAttributes, categoryAttributes]);

  // Загружаем сохраненные значения атрибутов товара
  const productAttributeValues = initialValues?.attribute_values || [];

  // Создаем мапу сохраненных значений для быстрого доступа
  const savedValuesMap = useMemo(() => {
    const map: Record<number, string> = {};
    productAttributeValues.forEach((pav: any) => {
      if (pav.attribute_id) {
        map[pav.attribute_id] = pav.value;
      }
    });
    return map;
  }, [productAttributeValues]);

  if (allAttributes.length === 0 && !commonLoading && !categoryAttributesLoading) {
    return null;
  }

  return (
    <div className="my-5 flex flex-wrap sm:my-8">
      <Description
        title={t('form:input-label-product-attributes')}
        details={t('form:product-attributes-help-text')}
        className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
      />

      <Card className="w-full sm:w-8/12 md:w-2/3">
        {(commonLoading || categoryAttributesLoading) && (
          <p className="text-sm text-gray-500">{t('common:text-loading')}</p>
        )}

        {allAttributes.length > 0 && (
          <div className="space-y-5">
            {/* Общие атрибуты */}
            {commonAttributes && commonAttributes.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-4 text-sm font-semibold text-heading">
                  {t('form:common-attributes')}
                </h3>
                <div className="space-y-4">
                  {commonAttributes.map((attribute: Attribute) => (
                    <AttributeInput
                      key={attribute.id}
                      attribute={attribute}
                      control={control}
                      defaultValue={savedValuesMap[attribute.id]}
                      isRequired={attribute.is_required}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Атрибуты категории */}
            {categoryAttributes && categoryAttributes.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-4 text-sm font-semibold text-heading">
                  {t('form:category-attributes')}
                </h3>
                <div className="space-y-4">
                  {categoryAttributes.map((attribute: Attribute) => {
                    const categoryAttr = attribute.pivot;
                    const isRequired = categoryAttr?.is_required || attribute.is_required;
                    
                    return (
                      <AttributeInput
                        key={attribute.id}
                        attribute={attribute}
                        control={control}
                        defaultValue={savedValuesMap[attribute.id]}
                        isRequired={isRequired}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {allAttributes.length === 0 && !commonLoading && !categoryAttributesLoading && (
          <p className="text-sm text-gray-500">
            {t('form:no-attributes-available')}
          </p>
        )}
      </Card>
    </div>
  );
}

// Компонент для ввода значения одного атрибута
function AttributeInput({
  attribute,
  control,
  defaultValue,
  isRequired,
}: {
  attribute: Attribute;
  control: Control<any>;
  defaultValue?: string;
  isRequired?: boolean;
}) {
  const { t } = useTranslation();
  const { register } = useFormContext();
  
  // Удаляем неиспользуемый импорт router

  // Загружаем значения атрибута, если они есть
  const attributeValues = attribute.values || [];

  const fieldName = `attribute_values.${attribute.id}`;

  const renderInput = () => {
    // ВАЖНО: Типы атрибутов и их поведение:
    // - 'select' и 'multiselect' - ТОЛЬКО из предустановленных значений (обязательно наличие values)
    // - 'text', 'number', 'textarea', 'boolean' - МОГУТ быть любыми значениями (если нет values) 
    //   ИЛИ только из предустановленных (если есть values)
    
    // Если у атрибута есть предустановленные значения - показываем select
    // Для типов select/multiselect наличие values обязательно
    const hasPredefinedValues = attributeValues.length > 0;
    const isSelectType = attribute.type === 'select' || attribute.type === 'multiselect';
    
    if (hasPredefinedValues || isSelectType) {
      // Если это select/multiselect но нет values - создаем пустой список опций
      const options = attributeValues.length > 0 
        ? attributeValues.map((av: any) => ({ 
            value: av.value, 
            id: av.id,
            label: av.value,
          }))
        : [];
      
      // Для multiselect - обрабатываем сохраненное значение (строка через запятую)
      const isMulti = attribute.type === 'multiselect';
      let selectedValue: any = undefined;
      
      if (defaultValue) {
        if (isMulti) {
          // Для multiselect разбиваем строку по запятой
          const valuesArray = defaultValue.split(',').map((v: string) => v.trim()).filter(Boolean);
          selectedValue = valuesArray.map((val: string) => {
            const found = options.find((opt: any) => opt.value === val);
            return found || { value: val, label: val };
          });
        } else {
          // Для обычного select ищем точное совпадение
          const found = options.find((opt: any) => opt.value === defaultValue || String(opt.value) === String(defaultValue));
          selectedValue = found || (defaultValue ? { value: defaultValue, label: defaultValue } : undefined);
        }
      }

      return (
        <SelectInput
          name={fieldName}
          control={control}
          getOptionLabel={(option: any) => option?.label || option?.value || option}
          getOptionValue={(option: any) => option?.value || option?.id || option}
          options={options}
          isMulti={isMulti}
          defaultValue={selectedValue}
        />
      );
    }

    // Для textarea типа (без предустановленных значений)
    if (attribute.input_type === 'textarea' || attribute.type === 'textarea') {
      return (
        <TextArea
          {...register(fieldName)}
          defaultValue={defaultValue || ''}
          variant="outline"
          rows={4}
        />
      );
    }

    // Для числовых атрибутов (без предустановленных значений)
    if (attribute.type === 'number') {
      return (
        <Input
          {...register(fieldName, {
            valueAsNumber: true,
          })}
          type="number"
          defaultValue={defaultValue || ''}
          variant="outline"
        />
      );
    }

    // Для boolean атрибутов - всегда select с Да/Нет
    if (attribute.type === 'boolean') {
      const boolOptions = [
        { value: 'true', label: t('common:yes') || 'Да' },
        { value: 'false', label: t('common:no') || 'Нет' },
      ];
      
      const boolDefaultValue = defaultValue 
        ? boolOptions.find((opt) => String(opt.value) === String(defaultValue)) || { value: defaultValue, label: defaultValue }
        : undefined;

      return (
        <SelectInput
          name={fieldName}
          control={control}
          getOptionLabel={(option: any) => option?.label || option?.value || option}
          getOptionValue={(option: any) => option?.value || option}
          options={boolOptions}
          defaultValue={boolDefaultValue}
        />
      );
    }

    // Для обычных текстовых атрибутов (без предустановленных значений)
    return (
      <Input
        {...register(fieldName)}
        type="text"
        defaultValue={defaultValue || ''}
        variant="outline"
      />
    );
  };

  // Преобразуем isRequired в boolean, чтобы избежать вывода "0"
  const required = Boolean(isRequired);

  return (
    <div className="space-y-2 mb-4">
      <Label>
        {attribute.name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {attribute.description && (
        <p className="text-xs text-gray-500 mb-2">{attribute.description}</p>
      )}
      {renderInput()}
    </div>
  );
}

