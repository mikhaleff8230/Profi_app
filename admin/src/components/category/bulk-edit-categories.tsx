import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Button from '@/components/ui/button';
import SelectInput from '@/components/ui/select-input';
import { useForm, Control } from 'react-hook-form';
import { useCategoriesQuery, useBulkUpdateCategoryParentMutation, useBulkUpdateCategoryStatusMutation } from '@/data/category';
import { Category } from '@/types';

interface BulkEditFormData {
  parent: any;
}

interface BulkEditCategoriesProps {
  selectedCategories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

function SelectParentCategory({
  control,
}: {
  control: Control<BulkEditFormData>;
}) {
  const { locale } = useRouter();
  const { t } = useTranslation();
  const { categories, loading } = useCategoriesQuery({
    limit: 999,
    language: locale,
  });

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {t('form:input-label-parent-category')}
      </label>
      <SelectInput
        name="parent"
        control={control}
        getOptionLabel={(option: any) => option.name}
        getOptionValue={(option: any) => option.id}
        options={categories}
        isClearable={true}
        isLoading={loading}
        placeholder={t('form:input-placeholder-select-parent')}
      />
    </div>
  );
}

export default function BulkEditCategories({
  selectedCategories,
  onClose,
  onSuccess,
}: BulkEditCategoriesProps) {
  const { t } = useTranslation();
  
  const { control, handleSubmit, watch } = useForm<BulkEditFormData>({
    defaultValues: {
      parent: null,
    },
  });

  const selectedParent = watch('parent');
  const { mutate: bulkUpdateParent, isLoading } = useBulkUpdateCategoryParentMutation();
  const { mutate: bulkUpdateStatus, isLoading: isUpdatingStatus } = useBulkUpdateCategoryStatusMutation();
  const [statusAction, setStatusAction] = useState<'none' | 'publish' | 'draft'>('none');

  const onSubmit = (data: BulkEditFormData) => {
    const categoryIds = selectedCategories.map(cat => cat.id);
    const parentId = data.parent?.id || null;

    const tasks: Promise<void>[] = [];

    if (statusAction !== 'none') {
      tasks.push(
        new Promise<void>((resolve, reject) => {
          bulkUpdateStatus(
            { category_ids: categoryIds, status: statusAction },
            {
              onSuccess: () => resolve(),
              onError: () => reject(),
            }
          );
        })
      );
    }

    tasks.push(
      new Promise<void>((resolve, reject) => {
        bulkUpdateParent(
          { category_ids: categoryIds, parent_id: parentId },
          {
            onSuccess: () => resolve(),
            onError: () => reject(),
          }
        );
      })
    );

    Promise.all(tasks)
      .then(() => {
        onSuccess();
        onClose();
      })
      .catch(() => {
        // errors handled in hooks
      });
  };

  const handleActivate = () => {
    const categoryIds = selectedCategories.map(cat => cat.id);
    bulkUpdateStatus(
      { category_ids: categoryIds, status: 'publish' },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
      }
    );
  };

  const handleDeactivate = () => {
    const categoryIds = selectedCategories.map(cat => cat.id);
    bulkUpdateStatus(
      { category_ids: categoryIds, status: 'draft' },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold mb-4">
          {t('form:bulk-edit-categories')}
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('form:bulk-edit-status')}
          </label>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={statusAction === 'publish'}
                onChange={(e) => {
                  setStatusAction(e.target.checked ? 'publish' : (statusAction === 'publish' ? 'none' : statusAction));
                }}
              />
              {t('form:button-label-activate')}
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={statusAction === 'draft'}
                onChange={(e) => {
                  setStatusAction(e.target.checked ? 'draft' : (statusAction === 'draft' ? 'none' : statusAction));
                }}
              />
              {t('form:button-label-deactivate')}
            </label>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            {t('form:selected-categories-count', { count: selectedCategories.length })}
          </p>
          <div className="max-h-32 overflow-y-auto border rounded p-2">
            {selectedCategories.map((category) => (
              <div key={category.id} className="text-sm py-1">
                {category.name}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-6">
            <SelectParentCategory control={control} />
            {selectedParent && (
              <p className="text-sm text-gray-500 mt-2">
                {t('form:will-set-parent-to', { name: selectedParent.name })}
              </p>
            )}
          </div>

          <div className="flex justify-end items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading || isUpdatingStatus}
            >
              {t('common:text-cancel')}
            </Button>
            <Button
              type="submit"
              loading={isLoading || isUpdatingStatus}
              disabled={isLoading || isUpdatingStatus}
            >
              {t('form:button-label-update-categories')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
