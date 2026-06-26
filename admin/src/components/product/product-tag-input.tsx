import Label from '@/components/ui/label';
import { Control, Controller } from 'react-hook-form';
import { useTagsQuery } from '@/data/tag';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import CreatableSelect from 'react-select/creatable';
import { useIsRTL } from '@/utils/locals';
import { selectStyles } from '@/components/ui/select/select.styles';
import { Tag } from '@/types';
import { useMemo } from 'react';

interface Props {
  control: Control<any>;
  setValue: any;
}

const ProductTagInput = ({ control, setValue }: Props) => {
  const { t } = useTranslation();
  const { locale } = useRouter();
  const { isRTL } = useIsRTL();

  const { tags, loading } = useTagsQuery({
    limit: 999,
    language: locale,
  });

  // Преобразуем теги в формат для react-select
  const tagOptions = useMemo(() => {
    return tags.map((tag: Tag) => ({
      value: tag.id,
      label: tag.name,
      name: tag.name,
      id: tag.id,
    }));
  }, [tags]);

  return (
    <div>
      <Label>{t('sidebar-nav-item-tags')}</Label>
      <Controller
        control={control}
        name="tags"
        render={({ field }) => {
          // Преобразуем значение формы в формат react-select
          const value = Array.isArray(field.value)
            ? field.value.map((tag: Tag | { name: string; id?: string }) => {
                if (typeof tag === 'object' && tag !== null) {
                  // Если тег уже существует (есть id)
                  if ('id' in tag && tag.id) {
                    return {
                      value: tag.id,
                      label: tag.name,
                      name: tag.name,
                      id: tag.id,
                    };
                  }
                  // Если тег новый (только name, без id)
                  return {
                    value: tag.name,
                    label: tag.name,
                    name: tag.name,
                    __isNew__: true,
                  };
                }
                return null;
              }).filter(Boolean)
            : [];

          return (
            <CreatableSelect
              {...field}
              value={value}
              onChange={(newValue) => {
                // Ограничиваем до 5 тегов
                const selectedTags = Array.isArray(newValue) ? newValue.slice(0, 5) : [];
                
                // Преобразуем обратно в формат формы
                const formattedTags = selectedTags.map((option: any) => {
                  // Проверяем, является ли это новым тегом (созданным через Creatable)
                  // В CreatableSelect новые опции создаются с inputValue или __isNew__: true
                  if (option.inputValue || option.__isNew__ || (!option.id && !option.value && option.label)) {
                    // Новый тег - только name
                    const tagName = option.inputValue || option.label || option.name;
                    return { name: tagName };
                  }
                  // Существующий тег - id и name
                  return { id: option.id || option.value, name: option.name || option.label };
                });

                field.onChange(formattedTags);
                setValue('tags', formattedTags);
              }}
              isValidNewOption={(inputValue) => {
                // Проверяем, что тег не пустой и не превышен лимит
                if (!inputValue || !inputValue.trim()) return false;
                const currentTags = Array.isArray(field.value) ? field.value : [];
                return currentTags.length < 5;
              }}
              formatCreateLabel={(inputValue) => `Создать "${inputValue}"`}
              createOptionPosition="first"
              options={tagOptions}
              isLoading={loading}
              isMulti
              isClearable
              isRtl={isRTL}
              styles={{
                ...selectStyles,
                multiValue: (base: any) => ({
                  ...base,
                  backgroundColor: 'rgb(var(--color-accent-300))',
                }),
                multiValueLabel: (base: any) => ({
                  ...base,
                  color: 'rgb(var(--color-dark))',
                  fontWeight: 'normal',
                }),
                multiValueRemove: (base: any) => ({
                  ...base,
                  color: 'rgb(var(--color-dark))',
                  ':hover': {
                    backgroundColor: 'rgb(var(--color-accent-600))',
                    color: 'rgb(var(--color-accent-text))',
                  },
                }),
                control: (base: any, state: any) => ({
                  ...selectStyles.control(base, state),
                }),
                input: (base: any) => ({
                  ...base,
                  color: 'rgb(var(--color-dark))',
                }),
                placeholder: (base: any) => ({
                  ...base,
                  color: 'rgb(var(--text-muted))',
                }),
                singleValue: (base: any) => ({
                  ...base,
                  color: 'rgb(var(--color-dark))',
                }),
                option: (base: any, state: any) => ({
                  ...selectStyles.option(base, state),
                  color: state.isSelected || state.isFocused
                    ? 'rgb(var(--color-accent-text))'
                    : 'rgb(var(--color-dark))',
                  backgroundColor: state.isSelected
                    ? 'rgb(var(--color-accent))'
                    : state.isFocused
                    ? 'rgb(var(--color-accent-300))'
                    : 'transparent',
                }),
              }}
              placeholder={t('form:input-placeholder-tags') || 'Введите теги...'}
              getOptionLabel={(option: any) => option.label || option.name}
              getOptionValue={(option: any) => option.value || option.name}
              maxMenuHeight={200}
              noOptionsMessage={() => t('form:no-options') || 'Нет вариантов'}
              loadingMessage={() => t('common:text-loading') || 'Загрузка...'}
            />
          );
        }}
      />
      <p className="mt-1 text-xs text-gray-500">
        {t('form:input-help-tags') || 'Максимум 5 тегов. Нажмите Enter для добавления нового тега.'}
      </p>
    </div>
  );
};

export default ProductTagInput;
