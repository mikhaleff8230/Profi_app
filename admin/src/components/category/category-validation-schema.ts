import * as yup from 'yup';

export const categoryValidationSchema = yup.object().shape({
  name: yup.string().required('form:error-name-required'),
  // type: yup.object().nullable().required('form:error-type-required'),
  status: yup.string().oneOf(['publish','draft']).nullable(),
  sort_order: yup
    .number()
    .typeError('form:error-must-be-number')
    .min(0, 'form:error-number-min')
    .nullable(),
});
