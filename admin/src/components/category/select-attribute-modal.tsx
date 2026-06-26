import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Modal from '@/components/ui/modal/modal';
import Loader from '@/components/ui/loader/loader';
import { useAttributesQuery } from '@/data/attributes';
import { useAttachAttributeToCategoryMutation } from '@/data/category';
import { Attribute } from '@/types';
import { useRouter } from 'next/router';

interface SelectAttributeModalProps {
  categoryId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SelectAttributeModal({
  categoryId,
  onClose,
  onSuccess,
}: SelectAttributeModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttribute, setSelectedAttribute] = useState<number | null>(null);
  const [isRequired, setIsRequired] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  const { attributes, loading } = useAttributesQuery({
    name: searchTerm,
    language: router.locale,
    limit: 100,
  });

  const { mutate: attachAttribute, isLoading: attaching } =
    useAttachAttributeToCategoryMutation();

  // Фильтруем атрибуты, исключая уже привязанные
  // Для этого нужно получить текущие атрибуты категории
  // Пока просто показываем все атрибуты
  const availableAttributes = attributes || [];

  const handleAttach = () => {
    if (!selectedAttribute) {
      return;
    }

    attachAttribute(
      {
        category_id: categoryId,
        attribute_id: selectedAttribute,
        is_required: isRequired,
        sort_order: sortOrder,
      },
      {
        onSuccess: () => {
          onSuccess?.();
          setSelectedAttribute(null);
          setIsRequired(false);
          setSortOrder(0);
          onClose();
        },
      }
    );
  };

  return (
    <Modal open={true} onClose={onClose}>
      <div className="rounded-lg bg-white p-8 shadow-xl">
        <h2 className="mb-6 text-xl font-semibold">
          {t('form:select-attribute') || 'Выбрать атрибут'}
        </h2>
        <div className="space-y-5">
        {/* Поиск */}
        <Input
          placeholder={t('form:search-attribute') || 'Поиск атрибута...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Список атрибутов */}
        {loading ? (
          <Loader text={t('common:text-loading')} />
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {availableAttributes.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                {t('form:no-attributes-found') || 'Атрибуты не найдены'}
              </p>
            ) : (
              availableAttributes.map((attribute: Attribute) => (
                <div
                  key={attribute.id}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    selectedAttribute === attribute.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border-base hover:border-accent'
                  }`}
                  onClick={() => setSelectedAttribute(attribute.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-heading">
                        {attribute.name}
                      </h4>
                      {attribute.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {attribute.description}
                        </p>
                      )}
                      <div className="mt-2 flex gap-2 text-xs text-gray-500">
                        <span>
                          {t('form:input-type')}: {attribute.input_type || 'text'}
                        </span>
                        {attribute.unit && (
                          <span>• {t('form:unit')}: {attribute.unit}</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <input
                        type="radio"
                        checked={selectedAttribute === attribute.id}
                        onChange={() => setSelectedAttribute(attribute.id)}
                        className="h-5 w-5"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Настройки атрибута */}
        {selectedAttribute && (
          <div className="space-y-4 border-t border-border-base pt-4">
            <h4 className="font-semibold text-heading">
              {t('form:attribute-settings') || 'Настройки атрибута'}
            </h4>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="attribute-required"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
              />
              <label 
                htmlFor="attribute-required"
                className="text-sm cursor-pointer"
              >
                {t('form:required-attribute') || 'Обязательный атрибут'}
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                {t('form:sort-order') || 'Порядок сортировки'}
              </label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                min="0"
                className="w-32"
              />
            </div>
          </div>
        )}

        {/* Кнопки */}
        <div className="flex justify-end gap-3 border-t border-border-base pt-4">
          <Button variant="outline" onClick={onClose}>
            {t('form:button-label-cancel') || 'Отмена'}
          </Button>
          <Button
            onClick={handleAttach}
            disabled={!selectedAttribute || attaching}
            loading={attaching}
          >
            {t('form:button-label-add') || 'Добавить'}
          </Button>
        </div>
        </div>
      </div>
    </Modal>
  );
}

