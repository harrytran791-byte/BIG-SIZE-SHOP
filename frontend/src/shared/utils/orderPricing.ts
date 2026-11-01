import type { Voucher } from '../types';

export function isVoucherAvailable(voucher: Voucher, now = Date.now()): boolean {
  return (!voucher.status || voucher.status === 'Đang hoạt động')
    && (!voucher.startsAt || Date.parse(voucher.startsAt) <= now)
    && (!voucher.expiresAt || Date.parse(voucher.expiresAt) >= now);
}

// One voucher per order. The server repeats these calculations while locking stock.
export function calculateOrderPricing(
  subtotal: number,
  voucher: Voucher | null,
  method: 'standard' | 'express' = 'standard',
  customShippingFee?: number | null
) {
  const isFreeShipThreshold = subtotal >= 500000;
  const standardFee = customShippingFee != null ? customShippingFee : 30000;
  const baseShippingFee = subtotal === 0 ? 0 : (isFreeShipThreshold ? 0 : standardFee);
  const deliveryFee = baseShippingFee;

  let discountAmount = 0;
  let shippingDiscountAmount = isFreeShipThreshold && subtotal > 0 ? standardFee : 0;

  if (voucher && isVoucherAvailable(voucher) && subtotal >= voucher.minOrderValue) {
    const basis = voucher.voucherType === 'shipping' ? (deliveryFee || standardFee) : subtotal;
    let reduction = voucher.discountType === 'percent'
      ? Math.round(basis * voucher.discountValue / 100) : voucher.discountValue;
    if (voucher.maxDiscount != null) reduction = Math.min(reduction, voucher.maxDiscount);
    reduction = Math.min(basis, Math.max(0, reduction));
    if (voucher.voucherType === 'shipping') {
      shippingDiscountAmount = Math.max(shippingDiscountAmount, reduction);
    } else {
      discountAmount = reduction;
    }
  }

  const shippingFee = Math.max(0, deliveryFee - (voucher?.voucherType === 'shipping' ? shippingDiscountAmount : 0));
  return {
    rawShippingFee: standardFee,
    baseShippingFee,
    discountAmount,
    shippingDiscountAmount,
    shippingFee,
    total: Math.max(0, subtotal - discountAmount + shippingFee)
  };
}
