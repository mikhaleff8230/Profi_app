import { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { Popover } from '@headlessui/react';
import { ProductStatus } from '@/types';
import { toast } from 'react-toastify';
import { useQueryClient } from 'react-query';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';
import { Product } from '@/types';
import { HttpClient } from '@/data/client/http-client';
import { ToggleIconVertical } from '@/components/icons/toggle-icon';
import {
  offset,
  flip,
  autoUpdate,
  useFloating,
  shift,
} from '@floating-ui/react-dom-interactions';

export type ProductStatusActionProps = {
  product: Product;
  className?: string;
};

const ProductStatusAction = ({
  product,
  className = '',
}: ProductStatusActionProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Определяем доступные статусы для выбора
  const availableStatuses = [
    { 
      value: ProductStatus.Publish, 
      label: t('form:input-label-published') || 'Опубликовано',
      translationKey: 'common:text-status-publish'
    },
    { 
      value: ProductStatus.Draft, 
      label: t('form:input-label-draft') || 'Черновик',
      translationKey: 'common:text-status-draft'
    },
    { 
      value: ProductStatus.UnPublish, 
      label: t('form:input-label-soft-disabled') || 'Архивировать',
      translationKey: 'common:text-status-unpublish'
    },
  ];

  const currentStatus = product?.status?.toLowerCase() || 'draft';

  const handleStatusChange = async (newStatus: ProductStatus, closeMenu: () => void) => {
    if (!product?.id) {
      toast.error('Ошибка: ID товара не найден');
      return;
    }

    // Если статус не изменился, ничего не делаем
    if (currentStatus === newStatus.toLowerCase()) {
      closeMenu();
      return;
    }

    try {
      // Используем прямой вызов API без редиректа
      await HttpClient.put<Product>(
        `${API_ENDPOINTS.PRODUCTS}/${product.id}`,
        { status: newStatus }
      );

      // Закрываем меню
      closeMenu();

      // Показываем уведомление
      toast.success('Статус изменен!');

      // Инвалидируем кеш для обновления списка товаров
      queryClient.invalidateQueries(API_ENDPOINTS.PRODUCTS);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Ошибка при обновлении статуса';
      toast.error(errorMessage);
    }
  };

  const { x, y, reference, floating, strategy, update, refs } = useFloating({
    strategy: 'fixed',
    placement: 'bottom-end',
    middleware: [offset(8), flip(), shift()],
  });

  // This one is for recalculating the position of the floating element if no space is left on the given placement
  useEffect(() => {
    if (!refs.reference.current || !refs.floating.current) {
      return;
    }
    return autoUpdate(refs.reference.current, refs.floating.current, update);
  }, [refs.reference, refs.floating, update]);

  return (
    <Popover className="relative inline-block">
      {({ close }: { close: () => void }) => (
        <>
          <Popover.Button
            className="p-2 text-base opacity-80 transition duration-200 hover:text-heading text-[#9CA3AF]"
            ref={reference}
          >
            <ToggleIconVertical height={18} width={6} />
          </Popover.Button>
          <div
            ref={floating}
            style={{
              position: strategy,
              top: y ?? '',
              left: x ?? '',
              zIndex: 9999,
            }}
          >
            <Popover.Panel className="w-[12rem] rounded bg-white py-2 px-1 text-left shadow-cardAction ring-1 ring-black ring-opacity-5">
              <div className="flex flex-col">
                {availableStatuses.map((status) => {
                  const isActive = currentStatus === status.value.toLowerCase();
                  
                  return (
                    <button
                      key={status.value}
                      onClick={() => handleStatusChange(status.value, close)}
                      className={`flex items-center px-4 py-2 text-sm transition-all hover:bg-gray-50 ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'text-gray-700'
                      }`}
                    >
                      <span className="flex-1 text-left">{status.label}</span>
                      {isActive && (
                        <span className="ml-2 text-blue-600">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Popover.Panel>
          </div>
        </>
      )}
    </Popover>
  );
};

export default ProductStatusAction;

