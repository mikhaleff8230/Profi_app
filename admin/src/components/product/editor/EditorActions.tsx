import Button from '@/components/ui/button';
import { useProductEditorStore } from '@/store/useProductEditorStore';
import { useFormContext } from 'react-hook-form';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { ProductStatus } from '@/types';
import { useSettings } from '@/contexts/settings.context';
import { getAuthCredentials } from '@/utils/auth-utils';
import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { useProductQuery } from '@/data/product';
import { useRouter } from 'next/router';
import { Config } from '@/config';

type EditorActionsProps = {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSave: (publish: boolean) => void;
  isLoading: boolean;
  productId?: string;
};

export default function EditorActions({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSave,
  isLoading,
  productId,
}: EditorActionsProps) {
  const { lastSaved, errors } = useProductEditorStore();
  const { t } = useTranslation();
  const router = useRouter();
  const { watch } = useFormContext<ProductEditorFormData>();
  const currentStatus = watch('status') || 'draft';
  
  // Получаем настройки и права доступа
  const settingsContext = useSettings();
  const { permissions } = getAuthCredentials();
  // useSettings возвращает объект, где настройки находятся в корне
  const isProductReview = Boolean(settingsContext?.isProductReview);
  const isAdmin = permissions?.includes('super_admin') || permissions?.includes('store_owner');

  // Получаем slug из роутера (для существующих товаров)
  const productSlug = router.query.productSlug as string;
  
  // Получаем информацию о текущем товаре (убираем связь с оплатой за публикацию)
  const { product } = useProductQuery(
    {
      slug: productSlug || productId || '',
      language: router.locale || Config.defaultLanguage,
    },
    {
      enabled: Boolean(productSlug || productId),
    }
  );

  // Убрана вся логика paymentPeriod, canPublish, isPaid и прочее

  // Определяем доступные статусы для отображения
  const availableStatuses = useMemo(() => {
    return [
      { value: ProductStatus.Publish, label: t('form:input-label-published') || 'Опубликовано' },
      { value: ProductStatus.Draft, label: t('form:input-label-draft') || 'Черновик' },
      { value: ProductStatus.UnPublish, label: t('form:input-label-soft-disabled') || 'Архивировать' },
    ];
  }, [t]);

  // Определяем информативные статусы (устанавливаются админом, только для отображения)
  const informationalStatuses = useMemo(() => {
    const infoStatuses = [
      { value: ProductStatus.UnderReview, label: t('form:input-label-under-review') || 'На модерации' },
      { value: ProductStatus.Approved, label: t('form:input-label-approved') || 'Принят' },
      { value: ProductStatus.Rejected, label: t('form:input-label-rejected') || 'Отклонен' },
    ];
    return infoStatuses;
  }, [t]);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // Получаем текущий статус для отображения
  const getStatusLabel = () => {
    const statusLower = currentStatus?.toLowerCase() || 'draft';
    
    // Проверяем информативные статусы
    const infoStatus = informationalStatuses.find(
      (status) => statusLower === status.value.toLowerCase()
    );
    if (infoStatus) {
      return infoStatus.label;
    }
    
    // Проверяем обычные статусы
    const normalStatus = availableStatuses.find(
      (status) => statusLower === status.value.toLowerCase()
    );
    if (normalStatus) {
      return normalStatus.label;
    }
    
    return 'Черновик';
  };

  // Получаем цвет для плашки статуса
  const getStatusColor = () => {
    const statusLower = currentStatus?.toLowerCase() || 'draft';
    
    if (statusLower === 'publish') {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (statusLower === 'draft') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else if (statusLower === 'unpublish') {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    } else if (statusLower === 'under_review' || statusLower === 'approved' || statusLower === 'rejected') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Проверяем, есть ли информативный статус (установленный админом)
  const hasInformationalStatus = informationalStatuses.some(
    (status) => currentStatus?.toLowerCase() === status.value.toLowerCase()
  );
  const currentInformationalStatus = informationalStatuses.find(
    (status) => currentStatus?.toLowerCase() === status.value.toLowerCase()
  );

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      {/* Информативная плашка с статусом модерации (если есть) */}
      {hasInformationalStatus && currentInformationalStatus && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-800">
              Статус модерации:
            </span>
            <span className="text-sm text-blue-700">
              {currentInformationalStatus.label}
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Этот статус установлен администратором при проверке товара
          </p>
        </div>
      )}

      {/* Секция с отображением текущего статуса */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Статус товара
        </label>
        <div className="flex flex-wrap gap-4 items-center">
          {/* Плашка с текущим статусом */}
          <div className={`px-3 py-1.5 rounded-full border ${getStatusColor()}`}>
            <span className="text-sm font-medium">
              {getStatusLabel()}
            </span>
          </div>
          
        </div>
        
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isFirstStep && (
            <Button
              variant="outline"
              onClick={onPrev}
              disabled={isLoading}
            >
              ← Назад
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-sm text-gray-500">
              Сохранено: {new Date(lastSaved).toLocaleTimeString()}
            </span>
          )}

          {!isLastStep ? (
            <>
              {/* Кнопка сохранения доступна на всех шагах (включая первый) */}
              <Button
                variant="outline"
                onClick={() => onSave(false)}
                loading={isLoading}
                size="small"
              >
                Сохранить
              </Button>
              <Button
                onClick={onNext}
                loading={isLoading}
              >
                Далее →
              </Button>
            </>
          ) : (
            <>
              {/* На последнем шаге: Сохранить (с выбранным статусом) и Опубликовать (всегда publish) */}
              <Button
                variant="outline"
                onClick={() => onSave(false)}
                loading={isLoading}
              >
                Сохранить
              </Button>
              <Button
                onClick={() => onSave(true)}
                loading={isLoading}
              >
                Опубликовать
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Вывод ошибок валидации */}
      {errors.validation && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800 mb-1">
            Для публикации необходимо заполнить обязательные поля:
          </p>
          <p className="text-sm text-red-700">
            {errors.validation}
          </p>
        </div>
      )}
    </div>
  );
}

