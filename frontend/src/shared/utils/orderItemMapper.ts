import type { CartItem } from '@/shared/types';

/** Identity comes only from the joined variant/product, never from a title or template. */
export function mapOrderItem(ct: any): CartItem {
  const variant = ct.chitietsanpham;
  const product = variant?.sanpham;
  const productId = Number.isSafeInteger(variant?.ma_sp) && variant.ma_sp > 0
    ? `prod-0${variant.ma_sp}` : `unresolved-variant-${ct.ma_ctsp ?? ct.ma_cthd}`;
  const size = ct.kich_co_mua || '';
  const color = ct.mau_sac_mua || '';
  const price = Number(ct.don_gia ?? 0);
  return {
    id: `ct_${ct.ma_cthd}`, orderItemId: ct.ma_cthd, sku: ct.sku_mua || variant?.sku || '', productId,
    product: {
      id: productId, name: ct.ten_sp_mua || product?.ten_sp || 'Chưa định danh sản phẩm',
      slug: product ? `sp-${variant.ma_sp}` : '', category: product?.danhmuc?.code?.toLowerCase() || '',
      categoryId: product?.ma_danh_muc, categoryName: product?.danhmuc?.ten_danh_muc || '',
      gender: 'unisex', price, rating: 0, ratingCount: 0, shortDesc: product?.mo_ta || '',
      description: product?.mo_ta || '', material: '', careInstructions: [], features: [],
      images: product?.hinh_anh ? [product.hinh_anh] : [], colors: color ? [{ name: color, hex: '#333333' }] : [],
      sizes: size ? [size] : [], variants: [], sizeChart: [], tags: [],
    },
    size, colorName: color, colorHex: '#333333', quantity: Number(ct.so_luong), price,
  };
}
