import ConfirmationCard from '@/components/common/confirmation-card';
import {
  useModalAction,
  useModalState,
} from '@/components/ui/modal/modal.context';
import { useDeleteCategoryMutation } from '@/data/category';

const CategoryDeleteView = () => {
  const { mutate: deleteCategory, isLoading: loading } =
    useDeleteCategoryMutation();

  const { data } = useModalState();
  const { closeModal } = useModalAction();

  function handleDelete() {
    deleteCategory(data, {
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

export default CategoryDeleteView;
