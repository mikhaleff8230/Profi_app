import omit from 'lodash/omit';

interface Typename {
  __typename?: string;
}

export function omitTypename<T extends Typename>(data: T | undefined | null | any) {
  // ВАЖНО: Проверяем, что data не undefined/null
  if (!data || data === null || data === undefined) {
    return data;
  }
  
  // ВАЖНО: Не обрабатываем массивы и примитивы
  if (Array.isArray(data) || typeof data !== 'object') {
    return data;
  }
  
  // Если есть __typename, удаляем его
  if (data.__typename) {
    try {
      // Используем lodash omit
      return omit(data, '__typename');
    } catch (error) {
      console.error('Error in omitTypename with lodash:', error, data);
      // Fallback: удаляем __typename вручную через деструктуризацию
      try {
        const { __typename, ...rest } = data;
        return rest;
      } catch (fallbackError) {
        console.error('Error in omitTypename fallback:', fallbackError);
        return data;
      }
    }
  }
  
  return data;
}
