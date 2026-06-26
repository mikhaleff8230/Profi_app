import ConfirmationCard from '@/components/common/confirmation-card';
import {
  useModalAction,
  useModalState,
} from '@/components/ui/modal/modal.context';
import { useArchiveProductMutation } from '@/data/product';
import { getAuthCredentials } from '@/utils/auth-utils';
import { SUPER_ADMIN } from '@/utils/constants';

const ProductArchiveView = () => {
  const { mutate: archiveProduct, isLoading: loading } =
    useArchiveProductMutation();
  const { data } = useModalState();
  const { closeModal } = useModalAction();
  
  // Безопасное получение прав доступа
  const getIsSuperAdmin = () => {
    try {
      const { permissions } = getAuthCredentials();
      return Array.isArray(permissions) && permissions.includes(SUPER_ADMIN);
    } catch (error) {
      console.error('Error getting auth credentials:', error);
      return false;
    }
  };
  
  const isSuperAdmin = getIsSuperAdmin();

  async function handleArchive() {
    // Если суперадмин попал в модалку архивирования (не должно быть, но на всякий случай)
    if (isSuperAdmin) {
      closeModal();
      return;
    }
    
    // Архивируем товар
    archiveProduct(data, {
      onSuccess: () => {
        closeModal();
      },
      onError: () => {
        // Ошибка уже обработана в мутации через toast
      },
    });
  }

  return (
    <ConfirmationCard
      onCancel={closeModal}
      onDelete={handleArchive}
      deleteBtnLoading={loading}
      deleteBtnText={isSuperAdmin ? 'button-delete' : 'Архивировать'}
      title="Архивирование товара"
      description="Вы уверены, что хотите архивировать этот товар? Товар будет переведен в статус 'Архивирован'."
    />
  );
};

export default ProductArchiveView;

