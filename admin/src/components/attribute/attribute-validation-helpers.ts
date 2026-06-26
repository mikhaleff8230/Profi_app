// Валидационные функции для разных типов атрибутов

export const validateAttributeValue = (type: string, value: string, meta?: string) => {
  const errors: string[] = [];

  switch (type) {
    case 'number':
      if (value && isNaN(Number(value))) {
        errors.push('form:error-value-must-be-number');
      }
      break;

    case 'color':
      if (meta && !/^#[0-9A-F]{6}$/i.test(meta)) {
        errors.push('form:error-invalid-hex-color');
      }
      break;

    case 'image':
      if (meta && !isValidUrl(meta)) {
        errors.push('form:error-invalid-image-url');
      }
      break;

    case 'boolean':
      if (value && !['Да', 'Нет', 'Yes', 'No', 'True', 'False'].includes(value)) {
        errors.push('form:error-invalid-boolean-value');
      }
      break;
  }

  return errors;
};

export const validateAttributeValues = (type: string, values: any[]) => {
  const errors: string[] = [];

  switch (type) {
    case 'boolean':
      if (values.length !== 2) {
        errors.push('form:error-boolean-must-have-two-values');
      }
      break;

    case 'multiselect':
      if (values.length < 2) {
        errors.push('form:error-multiselect-minimum-two-values');
      }
      break;

    case 'select':
    case 'color':
    case 'image':
      if (values.length < 1) {
        errors.push('form:error-minimum-one-value');
      }
      break;
  }

  return errors;
};

export const getDefaultValuesForType = (type: string) => {
  switch (type) {
    case 'boolean':
      return [
        { value: 'Да', meta: 'true' },
        { value: 'Нет', meta: 'false' }
      ];
    
    case 'color':
      return [
        { value: 'Красный', meta: '#FF0000' },
        { value: 'Синий', meta: '#0000FF' },
        { value: 'Зеленый', meta: '#00FF00' }
      ];

    default:
      return [{ value: '', meta: '' }];
  }
};

export const getRecommendedDisplayType = (type: string) => {
  const recommendations: Record<string, string> = {
    'text': 'input',
    'number': 'input',
    'select': 'dropdown',
    'multiselect': 'checkbox',
    'color': 'color_swatch',
    'image': 'image_swatch',
    'boolean': 'toggle'
  };

  return recommendations[type] || 'input';
};

const isValidUrl = (string: string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export const getValidationRulesForType = (type: string) => {
  switch (type) {
    case 'number':
      return {
        valuePattern: /^\d+(\.\d+)?$/,
        valueMessage: 'form:error-value-must-be-number',
        metaRequired: false
      };

    case 'color':
      return {
        valueRequired: true,
        metaPattern: /^#[0-9A-F]{6}$/i,
        metaMessage: 'form:error-invalid-hex-color',
        metaRequired: true
      };

    case 'image':
      return {
        valueRequired: true,
        metaValidation: (url: string) => isValidUrl(url),
        metaMessage: 'form:error-invalid-image-url',
        metaRequired: true
      };

    case 'boolean':
      return {
        fixedValues: ['Да', 'Нет'],
        valueCount: 2,
        metaValues: ['true', 'false']
      };

    default:
      return {
        valueRequired: true,
        metaRequired: false
      };
  }
};

















































