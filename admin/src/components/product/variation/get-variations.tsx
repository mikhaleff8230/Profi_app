import groupBy from 'lodash/groupBy';

export function getVariations(variations: any[] | undefined) {
  if (!variations || !Array.isArray(variations) || variations.length === 0) {
    return {};
  }
  
  // Фильтруем вариации, у которых есть attribute и attribute.slug
  const validVariations = variations.filter(
    (v) => v?.attribute && v?.attribute?.slug
  );
  
  if (validVariations.length === 0) {
    return {};
  }
  
  return groupBy(validVariations, 'attribute.slug');
}
