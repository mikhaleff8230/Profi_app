import SelectInput from '@/components/ui/select-input';
import Label from '@/components/ui/label';
import { Control } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import { useAttributesQuery } from '@/data/attributes';
import { useRouter } from 'next/router';

interface Props {
  control: Control<any>;
}

const ProductAttributeInput = ({ control }: Props) => {
  const { locale } = useRouter();
  const { t } = useTranslation('common');

  const { attributes, loading } = useAttributesQuery({
    limit: 999,
    language: locale,
  });

  return (
    <div className="mb-5">
      <Label>{t('form:input-label-attributes')}</Label>
      <SelectInput
        name="attributes"
        isMulti
        control={control}
        getOptionLabel={(option: any) => option.name}
        getOptionValue={(option: any) => option.id}
        options={attributes}
        isLoading={loading}
        placeholder={t('form:input-placeholder-select-attributes')}
      />
    </div>
  );
};

export default ProductAttributeInput;
