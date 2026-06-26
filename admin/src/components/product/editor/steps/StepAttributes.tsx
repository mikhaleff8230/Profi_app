
import { useFormContext, Controller } from 'react-hook-form';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import Label from '@/components/ui/label';
import Input from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { useCategoryAttributesQuery } from '@/data/category';
import { useProductEditorStore } from '@/store/useProductEditorStore';

type Attribute = {
  id: number;
  name: string;
  type: 'select' | 'multiselect' | 'text' | 'number';
  required: boolean;
  values: string[];
};

export default function StepAttributes() {
  const { control, watch, setValue, formState: { errors } } = useFormContext<ProductEditorFormData>();
  const { product, updateProduct } = useProductEditorStore();
  const categoryIds = watch('category_ids');
  const attributeValues = watch('attribute_values') || {};
  const groupingAttributes = watch('grouping_attributes') || [];

  const [attributes, setAttributes] = useState<Attribute[]>([]);

  // Убеждаемся, что categoryIds всегда массив
  const categoryIdsArray = Array.isArray(categoryIds) ? categoryIds : [];
  const categoryId = categoryIdsArray.length > 0 ? categoryIdsArray[0] : undefined;
  const { data: attributesData, isLoading: attributesLoading } = useCategoryAttributesQuery(categoryId);

  // Преобразование данных атрибутов
  useEffect(() => {
    if (attributesData?.data) {
      const attrs = Array.isArray(attributesData.data) 
        ? attributesData.data 
        : (attributesData.data?.attributes || []);
      setAttributes(attrs.map((attr: any) => ({
        id: attr.id,
        name: attr.name,
        type: attr.type || 'select',
        required: attr.required || false,
        values: attr.values?.map((v: any) => typeof v === 'string' ? v : v.value) || [],
      })));
    } else {
      setAttributes([]);
    }
  }, [attributesData]);

  const handleAttributeChange = (attributeId: number, value: any) => {
    const newValues = {
      ...attributeValues,
      [attributeId]: value,
    };
    setValue('attribute_values', newValues);
    updateProduct({ attribute_values: newValues } as any);
    
    console.log('StepAttributes - Attribute changed:', {
      attributeId,
      value,
      newValues,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-heading mb-4">
          Характеристики
        </h2>
        <p className="text-sm text-body mb-6">
          {categoryIdsArray.length > 0
            ? 'Заполните характеристики товара согласно выбранной категории.'
            : 'Выберите категорию, чтобы загрузить доступные характеристики.'}
        </p>
      </div>

      {categoryIdsArray.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Сначала выберите категорию товара на шаге "Основная информация"
          </p>
        </div>
      ) : attributes.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Для выбранной категории нет доступных характеристик
          </p>
          <p className="text-xs text-gray-500 mt-2">
            При создании группового товара будет использоваться только SKU для группировки
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {attributes.map((attribute) => {
            const currentValue = attributeValues[attribute.id] || '';

            const isGrouping = groupingAttributes.includes(attribute.id);

            return (
              <div key={attribute.id} className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>
                    {attribute.name}
                    {attribute.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGrouping}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setValue('grouping_attributes', [...groupingAttributes, attribute.id]);
                        } else {
                          setValue('grouping_attributes', groupingAttributes.filter((id: number) => id !== attribute.id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-600">Группировать по этому атрибуту</span>
                  </label>
                </div>

                {attribute.type === 'select' && (
                  <div className="w-1/3">
                    <select
                      value={Array.isArray(currentValue) ? currentValue[0] : currentValue}
                      onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Выберите значение</option>
                      {attribute.values?.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {attribute.type === 'multiselect' && (
                  <div className="w-1/3 mt-2 space-y-2">
                    {attribute.values?.map((value) => (
                      <label key={value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={Array.isArray(currentValue) && currentValue.includes(value)}
                          onChange={(e) => {
                            const current = Array.isArray(currentValue) ? currentValue : [];
                            const newValue = e.target.checked
                              ? [...current, value]
                              : current.filter((v) => v !== value);
                            handleAttributeChange(attribute.id, newValue);
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{value}</span>
                      </label>
                    ))}
                  </div>
                )}

                {attribute.type === 'text' && (
                  <div className="w-1/3">
                    <Input
                      value={typeof currentValue === 'string' ? currentValue : ''}
                      onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
                      variant="outline"
                      className="mt-2"
                      placeholder="Введите значение"
                    />
                  </div>
                )}

                {attribute.type === 'number' && (
                  <div className="w-1/3">
                    <Input
                      type="number"
                      value={typeof currentValue === 'string' ? currentValue : ''}
                      onChange={(e) => handleAttributeChange(attribute.id, parseFloat(e.target.value) || 0)}
                      variant="outline"
                      className="mt-2"
                      placeholder="Введите число"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

