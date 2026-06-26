import ConfirmationCard from '@/components/common/confirmation-card';
import {
  useModalAction,
  useModalState,
} from '@/components/ui/modal/modal.context';
import { useDeleteProductMutation } from '@/data/product';

const ProductDeleteView = () => {
  const { mutate: deleteProduct, isLoading: loading } =
    useDeleteProductMutation();
  const { data } = useModalState();
  const { closeModal } = useModalAction();

  async function handleDelete() {
    deleteProduct(data, {
      onSuccess: () => {
        closeModal();
      },
      onError: () => {
        // Ошибка уже обработана в мутации через toast
        // Модальное окно не закрываем при ошибке
      },
    });
  }

  return (
    <ConfirmationCard
      onCancel={closeModal}
      onDelete={handleDelete}
      deleteBtnLoading={loading}
    />
  );
};

export default ProductDeleteView;
