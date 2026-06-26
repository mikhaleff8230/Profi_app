import { useTranslation } from 'next-i18next';
import Button from '@/components/ui/button';
import Card from '@/components/common/card';
import Input from '@/components/ui/input';
import Loader from '@/components/ui/loader/loader';
import { useCategoryAttributesQuery } from '@/data/category';
import {
  useUpdateCategoryAttributeMutation,
  useDetachAttributeFromCategoryMutation,
} from '@/data/category';
import { Attribute } from '@/types';
import { useState } from 'react';
import { CloseIcon } from '@/components/icons/close-icon';

interface CategoryAttributesListProps {
  categoryId: number;
  onAddAttribute?: () => void;
}

export default function CategoryAttributesList({
  categoryId,
  onAddAttribute,
}: CategoryAttributesListProps) {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useCategoryAttributesQuery(categoryId);
  const { mutate: updateAttribute, isLoading: updating } =
    useUpdateCategoryAttributeMutation();
  const { mutate: detachAttribute, isLoading: detaching } =
    useDetachAttributeFromCategoryMutation();

  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());

  const handleUpdate = (
    attributeId: number,
    field: 'is_required' | 'sort_order',
    value: boolean | number
  ) => {
    const attribute = data?.data?.find((attr: Attribute) => attr.id === attributeId);
    if (!attribute) return;

    setUpdatingIds((prev) => new Set(prev).add(attributeId));

    updateAttribute(
      {
        category_id: categoryId,
        attribute_id: attributeId,
        is_required:
          field === 'is_required'
            ? (value as boolean)
            : attribute.pivot?.is_required ?? false,
        sort_order:
          field === 'sort_order'
            ? (value as number)
            : attribute.pivot?.sort_order ?? 0,
      },
      {
        onSuccess: () => {
          refetch();
        },
        onSettled: () => {
          setUpdatingIds((prev) => {
            const next = new Set(prev);
            next.delete(attributeId);
            return next;
          });
        },
      }
    );
  };

  const handleDelete = (attributeId: number) => {
    if (
      window.confirm(
        t('common:text-confirm-delete') || 'Вы уверены, что хотите удалить?'
      )
    ) {
      detachAttribute(
        {
          category_id: categoryId,
          attribute_id: attributeId,
        },
        {
          onSuccess: () => {
            refetch();
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <Card className="mt-8">
        <Loader text={t('common:text-loading')} />
      </Card>
    );
  }

  const attributes: Attribute[] = data?.data || [];
  const requiredAttributes: Attribute[] = data?.required_attributes || [];
  const optionalAttributes: Attribute[] = data?.optional_attributes || [];

  return (
    <Card className="mt-8">
      <div className="mb-6 flex items-center justify-between border-b border-border-base pb-5">
        <h3 className="text-lg font-semibold">
          {t('form:category-attributes') || 'Атрибуты категории'}
        </h3>
        {onAddAttribute && (
          <Button size="small" onClick={onAddAttribute}>
            {t('form:button-add-attribute') || '+ Добавить атрибут'}
          </Button>
        )}
      </div>

      {attributes.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          <p>{t('form:no-attributes') || 'Нет привязанных атрибутов'}</p>
          {onAddAttribute && (
            <Button
              size="small"
              className="mt-4"
              onClick={onAddAttribute}
            >
              {t('form:button-add-attribute') || '+ Добавить атрибут'}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Обязательные атрибуты */}
          {requiredAttributes.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-heading">
                {t('form:required-attributes') || 'Обязательные атрибуты'}
              </h4>
              <div className="space-y-3">
                {requiredAttributes.map((attribute: Attribute) => {
                  const isUpdating = updatingIds.has(attribute.id);
                  return (
                    <div
                      key={attribute.id}
                      className="flex items-center gap-4 rounded-lg border border-border-base bg-gray-50 p-4"
                    >
                      <div className="flex-1">
                        <h5 className="font-semibold text-heading">
                          {attribute.name}
                        </h5>
                        {attribute.description && (
                          <p className="mt-1 text-sm text-gray-600">
                            {attribute.description}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          {t('form:input-type')}: {attribute.input_type || 'text'}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`required-optional-${attribute.id}`}
                            checked={!!(attribute.pivot?.is_required ?? false)}
                            onChange={(e) =>
                              handleUpdate(
                                attribute.id,
                                'is_required',
                                e.target.checked
                              )
                            }
                            disabled={isUpdating || updating || detaching}
                            className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                          />
                          <label 
                            htmlFor={`required-optional-${attribute.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {t('form:required') || 'Обязательный'}
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-sm">
                            {t('form:sort-order') || 'Порядок'}:
                          </label>
                          <Input
                            type="number"
                            value={attribute.pivot?.sort_order ?? 0}
                            onChange={(e) =>
                              handleUpdate(
                                attribute.id,
                                'sort_order',
                                parseInt(e.target.value) || 0
                              )
                            }
                            disabled={isUpdating || updating || detaching}
                            className="w-20"
                            min="0"
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => handleDelete(attribute.id)}
                          disabled={isUpdating || updating || detaching}
                          className="text-red-600 hover:text-red-700"
                        >
                          <CloseIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Необязательные атрибуты */}
          {optionalAttributes.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-heading">
                {t('form:optional-attributes') || 'Необязательные атрибуты'}
              </h4>
              <div className="space-y-3">
                {optionalAttributes.map((attribute: Attribute) => {
                  const isUpdating = updatingIds.has(attribute.id);
                  return (
                    <div
                      key={attribute.id}
                      className="flex items-center gap-4 rounded-lg border border-border-base bg-gray-50 p-4"
                    >
                      <div className="flex-1">
                        <h5 className="font-semibold text-heading">
                          {attribute.name}
                        </h5>
                        {attribute.description && (
                          <p className="mt-1 text-sm text-gray-600">
                            {attribute.description}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          {t('form:input-type')}: {attribute.input_type || 'text'}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`required-optional-${attribute.id}`}
                            checked={!!(attribute.pivot?.is_required ?? false)}
                            onChange={(e) =>
                              handleUpdate(
                                attribute.id,
                                'is_required',
                                e.target.checked
                              )
                            }
                            disabled={isUpdating || updating || detaching}
                            className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                          />
                          <label 
                            htmlFor={`required-optional-${attribute.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {t('form:required') || 'Обязательный'}
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-sm">
                            {t('form:sort-order') || 'Порядок'}:
                          </label>
                          <Input
                            type="number"
                            value={attribute.pivot?.sort_order ?? 0}
                            onChange={(e) =>
                              handleUpdate(
                                attribute.id,
                                'sort_order',
                                parseInt(e.target.value) || 0
                              )
                            }
                            disabled={isUpdating || updating || detaching}
                            className="w-20"
                            min="0"
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => handleDelete(attribute.id)}
                          disabled={isUpdating || updating || detaching}
                          className="text-red-600 hover:text-red-700"
                        >
                          <CloseIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Все атрибуты (если нет разделения) */}
          {requiredAttributes.length === 0 &&
            optionalAttributes.length === 0 &&
            attributes.map((attribute: Attribute) => {
              const isUpdating = updatingIds.has(attribute.id);
              return (
                <div
                  key={attribute.id}
                  className="flex items-center gap-4 rounded-lg border border-border-base bg-gray-50 p-4"
                >
                  <div className="flex-1">
                    <h5 className="font-semibold text-heading">
                      {attribute.name}
                    </h5>
                    {attribute.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {attribute.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`required-all-${attribute.id}`}
                        checked={!!(attribute.pivot?.is_required ?? false)}
                        onChange={(e) =>
                          handleUpdate(
                            attribute.id,
                            'is_required',
                            e.target.checked
                          )
                        }
                        disabled={isUpdating || updating || detaching}
                        className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                      />
                      <label 
                        htmlFor={`required-all-${attribute.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {t('form:required') || 'Обязательный'}
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm">
                        {t('form:sort-order') || 'Порядок'}:
                      </label>
                      <Input
                        type="number"
                        value={attribute.pivot?.sort_order ?? 0}
                        onChange={(e) =>
                          handleUpdate(
                            attribute.id,
                            'sort_order',
                            parseInt(e.target.value) || 0
                          )
                        }
                        disabled={isUpdating || updating || detaching}
                        className="w-20"
                        min="0"
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => handleDelete(attribute.id)}
                      disabled={isUpdating || updating || detaching}
                      className="text-red-600 hover:text-red-700"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </Card>
  );
}

