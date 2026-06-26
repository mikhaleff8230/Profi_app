import { useMemo } from 'react';
import { siteSettings } from '@/settings/site.settings';
import { useSettings } from '@/contexts/settings.context';
export function formatPrice({
  amount,
  currencyCode,
  locale,
  fractions = 0,
}: {
  amount: number;
  currencyCode: string;
  locale: string;
  fractions: number;
}) {
  const formatCurrency = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits:
      fractions > 20 || fractions < 0 ? 2 : fractions,
    minimumFractionDigits: fractions === 0 ? 0 : undefined,
  });

  return formatCurrency.format(amount);
}

export function formatVariantPrice({
  amount,
  baseAmount,
  currencyCode,
  locale,
  fractions = 0,
}: {
  baseAmount: number;
  amount: number;
  currencyCode: string;
  locale: string;
  fractions: number;
}) {
  const hasDiscount = baseAmount < amount;
  const formatDiscount = new Intl.NumberFormat(locale, { style: 'percent' });
  const discount = hasDiscount
    ? formatDiscount.format((amount - baseAmount) / amount)
    : null;

  const price = formatPrice({ amount, currencyCode, locale, fractions });
  const basePrice = hasDiscount
    ? formatPrice({ amount: baseAmount, currencyCode, locale, fractions })
    : null;

  return { price, basePrice, discount };
}
type PriceProps = {
  amount: number;
  baseAmount?: number;
  currencyCode?: string;
};
export default function usePrice(data?: PriceProps | null) {
  const { currency, currencyOptions } = useSettings();
  const { formation, fractions = 0 } = currencyOptions;
  const { amount, baseAmount, currencyCode = currency } = data ?? {};
  const locale = formation ?? siteSettings.defaultLanguage;
  const value = useMemo(() => {
    if (typeof amount !== 'number' || !currencyCode) return '';

    return baseAmount
      ? formatVariantPrice({
          amount,
          baseAmount,
          currencyCode,
          locale,
          fractions,
        })
      : formatPrice({ amount, currencyCode, locale, fractions });
  }, [amount, baseAmount, currencyCode, fractions]);

  return typeof value === 'string'
    ? { price: value, basePrice: null, discount: null }
    : value;
}
