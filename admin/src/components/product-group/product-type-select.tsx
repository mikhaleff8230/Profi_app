import SelectInput from '@/components/ui/select-input';
import Label from '@/components/ui/label';
import ValidationError from '@/components/ui/form-validation-error';
import { Control } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import { useTypesQuery } from '@/data/type';
import { useRouter } from 'next/router';

interface Props {
  control: Control<any>;
  error?: string;
}

/**
 * Компонент для выбора ТИПА товара (Одежда, Электроника и т.д.) из базы
 * Используется в форме ProductGroup
 * 
 * НЕ путать с ProductTypeInput (Simple/Variable)!
 */
const ProductTypeSelect = ({ control, error }: Props) => {
  const { t } = useTranslation();
  const { locale } = useRouter();
  const { types, loading } = useTypesQuery({
    limit: 999,
    language: locale,
  });

  return (
    <div className="mb-5">
      <Label>{t('form:input-label-type')}*</Label>
      <SelectInput
        name="type_id"
        control={control}
        getOptionLabel={(option: any) => option.name}
        getOptionValue={(option: any) => option.id}
        options={types!}
        isLoading={loading}
        isClearable={false}
        placeholder={t('form:input-placeholder-select')}
      />
      {error && <ValidationError message={t(error)} />}
    </div>
  );
};

export default ProductTypeSelect;


