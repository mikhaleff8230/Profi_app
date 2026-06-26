import { useMemo } from 'react';
import { getVariations } from './get-variations';
import { isVariationSelected } from './is-variation-selected';
import VariationGroups from './variation-groups';
import VariationPrice from './variation-price';
import isEqual from 'lodash/isEqual';
import { AttributesProvider, useAttributes } from './attributes.context';
import { AddToCart } from '@/components/cart/add-to-cart/add-to-cart';
import { useProductQuery } from '@/data/product';
import { Config } from '@/config';
import { useRouter } from 'next/router';
import { ProductType } from '@/types';

interface Props {
  product: any;
}

const Variation = ({ product }: Props) => {
  const { attributes } = useAttributes();
  const variations = useMemo(
    () => getVariations(product?.variations),
    [product?.variations]
  );
  const isSelected = isVariationSelected(variations, attributes);
  let selectedVariation: any = {};
  if (isSelected && product?.variation_options && Array.isArray(product.variation_options)) {
    selectedVariation = product.variation_options.find((o: any) => {
      if (!o?.options || !Array.isArray(o.options)) return false;
      const optionValues = o.options.map((v: any) => v?.value).filter(Boolean).sort();
      const attributeValues = Object.values(attributes).filter(Boolean).sort();
      return isEqual(optionValues, attributeValues);
    }) || {};
  }
  return (
    <div className="w-[95vw] max-w-lg rounded-md bg-white p-8">
      <h3 className="mb-2 text-center text-2xl font-semibold text-heading">
        {product?.name}
      </h3>
      <div className="mb-8 flex items-center justify-center">
        <VariationPrice
          selectedVariation={selectedVariation}
          minPrice={product.min_price}
          maxPrice={product.max_price}
        />
      </div>
      <div className="mb-8">
        <VariationGroups variations={variations} />
      </div>
      <AddToCart
        data={product}
        variant="big"
        variation={selectedVariation}
        disabled={selectedVariation?.is_disable || !isSelected}
      />
    </div>
  );
};

const ProductVariation = ({ productSlug }: { productSlug: string }) => {
  const { locale } = useRouter();
  const { product, isLoading: loading, error } = useProductQuery({
    slug: productSlug,
    language: locale!,
  });

  if (loading) return <div className="p-8 text-center">Загрузка...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Ошибка загрузки товара</div>;
  if (!product) return <div className="p-8 text-center">Товар не найден</div>;
  
  // Проверяем, что товар является вариативным
  if (product.product_type !== ProductType.Variable || !product.variations || product.variations.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        Этот товар не является вариативным или не имеет вариаций
      </div>
    );
  }

  return (
    <AttributesProvider>
      <Variation product={product} />
    </AttributesProvider>
  );
};

export default ProductVariation;
