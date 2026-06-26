import usePrice from '@/utils/use-price';
import isEmpty from 'lodash/isEmpty';

export default function VariationPrice({
  selectedVariation,
  minPrice,
  maxPrice,
}: any) {
  const { price, basePrice } = usePrice(
    selectedVariation && selectedVariation.price !== undefined
      ? {
          amount: selectedVariation.sale_price
            ? selectedVariation.sale_price
            : selectedVariation.price,
          baseAmount: selectedVariation.price,
        }
      : { amount: 0 }
  );
  const { price: min_price } = usePrice({
    amount: minPrice || 0,
  });
  const { price: max_price } = usePrice({
    amount: maxPrice || 0,
  });
  return (
    <span className="flex items-center">
      <ins className="text-2xl font-semibold text-accent no-underline">
        {!isEmpty(selectedVariation)
          ? `${price}`
          : `${min_price} - ${max_price}`}
      </ins>
      {basePrice && (
        <del className="ms-2 text-sm font-normal text-muted md:text-base">
          {basePrice}
        </del>
      )}
    </span>
  );
}
