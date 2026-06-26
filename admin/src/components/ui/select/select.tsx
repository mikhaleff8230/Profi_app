import { useIsRTL } from '@/utils/locals';
import React from 'react';
import ReactSelect, { Props } from 'react-select';
import { selectStyles } from './select.styles';
import { useTranslation } from 'next-i18next';

export type Ref = any;

export const Select = React.forwardRef<Ref, Props>((props, ref) => {
  const { isRTL } = useIsRTL();
  const { t } = useTranslation();
  // Используем переданный placeholder или дефолтный перевод
  const placeholder = props.placeholder !== undefined 
    ? props.placeholder 
    : (t('form:input-placeholder-select') || 'Выбрать');
  
  return (
    <ReactSelect
      ref={ref}
      styles={selectStyles}
      isRtl={isRTL}
      {...props}
      placeholder={placeholder}
    />
  );
});

Select.displayName = 'Select';

export default Select;
