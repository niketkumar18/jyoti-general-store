export interface PricingResult {
  effectiveUnitPrice: number;
  isBulkApplied: boolean;
  discountPercentage: number;
  total: number;
  totalSavings: number;
  savingsPerUnit: number;
}

/**
 * Calculates item pricing based on base sale price, quantity, and bulk discount rule.
 * Example: Base price = 20, Threshold = 5, Discount = 20%
 * - Qty 1: 1 x ₹20 = ₹20
 * - Qty 5: 5 x ₹16 = ₹80 (20% discount applied)
 */
export function calculateItemPricing(
  baseSalePrice: number,
  quantity: number,
  bulkThreshold?: number,
  bulkPercentage?: number
): PricingResult {
  const hasBulkRule =
    typeof bulkThreshold === 'number' &&
    bulkThreshold > 1 &&
    typeof bulkPercentage === 'number' &&
    bulkPercentage > 0 &&
    bulkPercentage < 100;

  const isBulkApplied = hasBulkRule && quantity >= bulkThreshold;

  let effectiveUnitPrice = baseSalePrice;
  let discountPercentage = 0;
  let savingsPerUnit = 0;

  if (isBulkApplied) {
    discountPercentage = bulkPercentage;
    const discounted = baseSalePrice * (1 - bulkPercentage / 100);
    effectiveUnitPrice = Number(discounted.toFixed(2));
    savingsPerUnit = Number((baseSalePrice - effectiveUnitPrice).toFixed(2));
  }

  const total = Number((quantity * effectiveUnitPrice).toFixed(2));
  const baseTotal = Number((quantity * baseSalePrice).toFixed(2));
  const totalSavings = Number(Math.max(0, baseTotal - total).toFixed(2));

  return {
    effectiveUnitPrice,
    isBulkApplied,
    discountPercentage,
    total,
    totalSavings,
    savingsPerUnit
  };
}
