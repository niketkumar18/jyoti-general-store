export interface PricingResult {
  effectiveUnitPrice: number;
  isBulkApplied: boolean;
  discountPercentage: number;
  total: number;
  totalSavings: number;
  savingsPerUnit: number;
}

/**
 * Calculates item pricing based on base sale price, quantity, and bulk discount / rate rule.
 * Example 1 (Direct Bulk Rate): Base price = 5, Threshold = 30, Bulk Rate = 4.5
 * - Qty 10: 10 x ₹5 = ₹50
 * - Qty 30: 30 x ₹4.5 = ₹135 (Special bulk rate ₹4.5 applied, 10% savings)
 * 
 * Example 2 (Complementary / Free Item):
 * - Price = ₹0, Total = ₹0
 */
export function calculateItemPricing(
  baseSalePrice: number,
  quantity: number,
  bulkThreshold?: number,
  bulkPercentage?: number,
  bulkRate?: number,
  isComplementary?: boolean
): PricingResult {
  if (isComplementary) {
    return {
      effectiveUnitPrice: 0,
      isBulkApplied: false,
      discountPercentage: 100,
      total: 0,
      totalSavings: Number((quantity * baseSalePrice).toFixed(2)),
      savingsPerUnit: baseSalePrice
    };
  }

  const hasBulkRate = typeof bulkRate === 'number' && bulkRate > 0 && bulkRate < baseSalePrice;
  const hasBulkPercentage = typeof bulkPercentage === 'number' && bulkPercentage > 0 && bulkPercentage < 100;
  const hasBulkThreshold = typeof bulkThreshold === 'number' && bulkThreshold > 1;

  const hasBulkRule = hasBulkThreshold && (hasBulkRate || hasBulkPercentage);
  const isBulkApplied = Boolean(hasBulkRule && quantity >= bulkThreshold!);

  let effectiveUnitPrice = baseSalePrice;
  let discountPercentage = 0;
  let savingsPerUnit = 0;

  if (isBulkApplied) {
    if (hasBulkRate) {
      effectiveUnitPrice = Number(bulkRate!.toFixed(2));
      discountPercentage = Number((((baseSalePrice - effectiveUnitPrice) / baseSalePrice) * 100).toFixed(1));
      savingsPerUnit = Number((baseSalePrice - effectiveUnitPrice).toFixed(2));
    } else if (hasBulkPercentage) {
      discountPercentage = bulkPercentage!;
      const discounted = baseSalePrice * (1 - bulkPercentage! / 100);
      effectiveUnitPrice = Number(discounted.toFixed(2));
      savingsPerUnit = Number((baseSalePrice - effectiveUnitPrice).toFixed(2));
    }
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