import SelectInput from '@/components/ui/select-input';
import Label from '@/components/ui/label';
import { Control } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import { useCategoriesQuery } from '@/data/category';
import { useRouter } from 'next/router';

interface Props {
  control: Control<any>;
}

const ProductCategoryInput = ({ control }: Props) => {
  const { locale } = useRouter();
  const { t } = useTranslation('common');

  const { categories, loading } = useCategoriesQuery({
    limit: 999,
    language: locale,
  });

  return (
    <div className="mb-5">
      <Label>{t('form:input-label-category')}</Label>
      <SelectInput
        name="category"
        control={control}
        getOptionLabel={(option: any) => option.name}
        getOptionValue={(option: any) => option.id}
        // @ts-ignore
        options={categories}
        isLoading={loading}
      />
    </div>
  );
};

export default ProductCategoryInput;
