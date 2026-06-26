import * as yup from 'yup';
import { ProductType } from '@/types';

export const productValidationSchema = yup.object().shape({
  name: yup.string().required('form:error-name-required'),
  sku: yup.string().nullable().when('product_type', {
    is: (product_type: any) => {
      const value = product_type?.value || product_type;
      return value !== ProductType.Variable;
    },
    then: yup.string().nullable().required('form:error-sku-required'),
    otherwise: yup.string().nullable(),
  }),
  price: yup
    .number()
    .typeError('form:error-price-must-number')
    .min(0)
    .when('product_type', {
      is: (product_type: any) => {
        const value = product_type?.value || product_type;
        return value !== ProductType.Variable;
      },
      then: yup.number().required('form:error-price-required'),
      otherwise: yup.number().nullable(),
    }),
  quantity: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .typeError('form:error-quantity-must-number')
    .positive('form:error-quantity-must-positive')
    .integer('form:error-quantity-must-integer')
    .when('is_external', {
      is: true,
      then: yup.number().notRequired(),
      otherwise: yup.number().when('product_type', {
        is: (product_type: any) => {
          const value = product_type?.value || product_type;
          return value !== ProductType.Variable;
        },
        then: yup.number().required('form:error-quantity-required'),
        otherwise: yup.number().nullable(),
      }),
    }),
  unit: yup.string().nullable(),
  type: yup.object().required('form:error-type-required').shape({
    id: yup.string().required(),
    name: yup.string().required(),
  }),
  attributes: yup.array().nullable(),
  // Валидация для вариативных товаров
  variations: yup.array().when('product_type', {
    is: (product_type: any) => {
      const value = product_type?.value || product_type;
      return value === ProductType.Variable;
    },
    then: yup.array()
      .min(1, 'Необходимо выбрать хотя бы один атрибут для вариаций')
      .test('variations-has-values', 'Каждый атрибут должен иметь выбранные значения', function(variations) {
        if (!variations || !Array.isArray(variations)) return false;
        return variations.every((variation: any) => {
          return variation?.attribute && variation?.value && Array.isArray(variation.value) && variation.value.length > 0;
        });
      }),
    otherwise: yup.array().nullable(),
  }),
  variation_options: yup.array().when('product_type', {
    is: (product_type: any) => {
      const value = product_type?.value || product_type;
      return value === ProductType.Variable;
    },
    then: yup.array()
      .min(1, 'Необходимо создать хотя бы один вариант товара')
      .test('variation-options-valid', 'Все варианты должны иметь цену, количество и SKU', function(variation_options) {
        if (!variation_options || !Array.isArray(variation_options)) return false;
        return variation_options.every((option: any) => {
          return option?.price !== undefined && 
                 option?.price !== null && 
                 option?.quantity !== undefined && 
                 option?.quantity !== null &&
                 option?.sku && 
                 option?.sku.trim() !== '';
        });
      }),
    otherwise: yup.array().nullable(),
  }),
  // digital_file_input: yup.mixed().when('is_external', (isExternal) => {
  //   if (!isExternal) {
  //     return yup
  //       .object()
  //       .test(
  //         'check-digital-file',
  //         'form:error-digital-file-input-required',
  //         (file) => file && file?.original
  //       );
  //   }
  //   return yup.string().nullable();
  // }),
  status: yup.string().required('form:error-status-required'),
  external_product_button_text: yup.string().when('is_external', {
    is: (isExternal: boolean) => isExternal,
    then: yup.string().max(20, "External text must be at most 20 characters").required('form:error-external-product-button-text'),
  }),
  weight: yup
    .number()
    .typeError('Вес должен быть числом')
    .min(1, 'Вес должен быть больше 0')
    .required('Вес обязателен для заполнения'),
  length: yup
    .number()
    .typeError('Длина должна быть числом')
    .min(1, 'Длина должна быть больше 0')
    .required('Длина обязательна для заполнения'),
  width: yup
    .number()
    .typeError('Ширина должна быть числом')
    .min(1, 'Ширина должна быть больше 0')
    .required('Ширина обязательна для заполнения'),
  height: yup
    .number()
    .typeError('Высота должна быть числом')
    .min(1, 'Высота должна быть больше 0')
    .required('Высота обязательна для заполнения'),
});