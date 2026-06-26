import * as yup from 'yup';

export const attributeValidationSchema = yup.object().shape({
    name: yup.string().required('form:error-name-required'),
    type: yup.mixed().required('form:error-attribute-type-required'),
    display_type: yup.mixed().required('form:error-display-type-required'),
    values: yup.array().of(
        yup.object().shape({
            value: yup.string().required('value is required'),
            meta: yup.string().nullable(),
        })
    ),
});