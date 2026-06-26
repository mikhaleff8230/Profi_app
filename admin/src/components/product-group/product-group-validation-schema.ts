import * as yup from 'yup';

export const productGroupValidationSchema = yup.object().shape({
  // Обязательные поля
  title: yup.string().required('form:error-title-required'),
  
  type_id: yup.object().required('form:error-type-required').shape({
    id: yup.string().required(),
    name: yup.string().required(),
  }),
  
  category: yup.object().required('form:error-category-required').shape({
    id: yup.string().required(),
    name: yup.string().required(),
  }),
  
  status: yup.string().required('form:error-status-required'),
  
  // Габариты - ОБЯЗАТЕЛЬНЫ!
  weight: yup
    .number()
    .typeError('form:error-weight-must-number')
    .min(1, 'form:error-weight-min')
    .required('form:error-weight-required'),
    
  length: yup
    .number()
    .typeError('form:error-length-must-number')
    .min(1, 'form:error-length-min')
    .required('form:error-length-required'),
    
  width: yup
    .number()
    .typeError('form:error-width-must-number')
    .min(1, 'form:error-width-min')
    .required('form:error-width-required'),
    
  height: yup
    .number()
    .typeError('form:error-height-must-number')
    .min(1, 'form:error-height-min')
    .required('form:error-height-required'),
    
  // Необязательные поля
  slug: yup.string().nullable(),
  description: yup.string().nullable(),
  short_description: yup.string().nullable(),
  main_image: yup.mixed().nullable(),
  gallery: yup.array().nullable(),
  tags: yup.array().nullable(),
});


