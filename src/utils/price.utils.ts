import type { Product } from '../types/product';
import type { ActiveClientDiscount } from '../types/clientPriceDocument';

export interface EffectivePriceResult {
  price: number;
  basePrice: number;
  discountPercent: number;
  isPriceMissing: boolean;
}

export const getEffectiveProductPrice = (
  product: Product,
  priceSlug: string,
  discountsMap: Record<string, ActiveClientDiscount | number> = {}
): EffectivePriceResult => {
  let basePrice = 0;
  let isPriceMissing = false;

  if (product.prices && product.prices[priceSlug] !== undefined) {
    basePrice = Number(product.prices[priceSlug]) || 0;
  } else {
    isPriceMissing = true;
    basePrice = 0;
  }

  const pIdStr = String(product.id || '');
  const discountEntry =
    discountsMap[product.id] ||
    (pIdStr ? discountsMap[pIdStr] : undefined) ||
    (pIdStr ? discountsMap[pIdStr.toLowerCase()] : undefined);

  let discountPercent = 0;
  let roundingMethod: 'UP' | 'DOWN' = 'UP';
  let roundingValue: number | undefined = undefined;

  if (typeof discountEntry === 'number') {
    discountPercent = discountEntry;
  } else if (discountEntry && typeof discountEntry === 'object') {
    discountPercent = Number(discountEntry.discountPercent) || 0;
    roundingMethod = discountEntry.roundingMethod || 'UP';
    roundingValue =
      discountEntry.roundingValue !== undefined && discountEntry.roundingValue !== null
        ? Number(discountEntry.roundingValue)
        : undefined;
  }

  let price = basePrice;

  if (!isPriceMissing && discountPercent !== 0) {
    const discountFactor = (100 - discountPercent) / 100;
    const raw = basePrice * discountFactor;
    const step = Number(roundingValue || 0);

    let calculatedPrice = raw;
    if (step > 0) {
      if (roundingMethod === 'DOWN') {
        calculatedPrice = Math.floor(raw / step) * step;
      } else {
        calculatedPrice = Math.ceil(raw / step) * step;
      }
    } else {
      if (roundingMethod === 'DOWN') {
        calculatedPrice = Math.floor(raw * 100) / 100;
      } else {
        calculatedPrice = Math.ceil(raw * 100) / 100;
      }
    }
    price = Math.round(calculatedPrice * 100) / 100;
  }

  return {
    price,
    basePrice,
    discountPercent,
    isPriceMissing,
  };
};
