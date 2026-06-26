import ConfirmationCard from '@/components/common/confirmation-card';
import {
  useModalAction,
  useModalState,
} from '@/components/ui/modal/modal.context';
import { useDeleteProductGroupMutation } from '@/data/product-group';

const ProductGroupDeleteView = () => {
  const { mutate: deleteProductGroup, isLoading: loading } =
    useDeleteProductGroupMutation();

  const { data } = useModalState();
  const { closeModal } = useModalAction();

  async function handleDelete() {
    deleteProductGroup(
      data, // crudFactory.delete принимает id: string, а не { id: string }
      {
        onSuccess: () => {
          closeModal();
        },
        onError: () => {
          // Ошибка уже обработана в мутации через toast
          // Модальное окно не закрываем при ошибке
        },
      }
    );
  }

  return (
    <ConfirmationCard
      onCancel={closeModal}
      onDelete={handleDelete}
      deleteBtnLoading={loading}
    />
  );
};

export default ProductGroupDeleteView;



