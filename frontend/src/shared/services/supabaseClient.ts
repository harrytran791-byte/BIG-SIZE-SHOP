import { mapOrderItem } from '@/shared/utils/orderItemMapper';
import { parseShippingAddress } from '@/shared/utils/shippingAddress';
import { placeOrder } from './transactionService';
import { createClient } from '@supabase/supabase-js';
import { UserAccount, StockItem, Order, OrderStatus, PaymentStatus, CartItem, Product, ReturnRequest, ReturnItemInfo, StockAdjustmentLog, CancellationRequest, Size, SupabaseCategory, BodyProfile } from '@/types';
import { normalizeRole } from '../utils/roleUtils';
import { mockProducts } from '@/modules/product/data/products';

/**
 * Fetch all categories directly from Supabase Cloud `danhmuc` table
 */
export const fetchCategoriesFromSupabase = async (options: { strict?: boolean } = {}): Promise<SupabaseCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('danhmuc')
      .select('*')
      .order('ma_danh_muc', { ascending: true });

    if (error) {
      console.warn('⚠️ Lỗi truy vấn Supabase danhmuc:', error.message);
      if (options.strict) throw error;
      return [];
    }

    return (data || []) as SupabaseCategory[];
  } catch (err: any) {
    console.warn('⚠️ Lỗi kết nối Supabase Categories:', err?.message);
    if (options.strict) throw err;
    return [];
  }
};

// Project configuration from Supabase Cloud
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://vucrgwryaerhphparchc.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Y3Jnd3J5YWVyaHBocGFyY2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjQ5MTYsImV4cCI6MjEwNzMwMDkxNn0.cbnMNX8_i_ZY5kbOpNEUFNiKQivParO0qKg4RV1Tg4c';

const globalForSupabase = globalThis as unknown as {
  __curveSupabaseClient?: ReturnType<typeof createClient<any>>;
  __curveProductImageCache?: Map<number, string>;
};

export const supabase =
  globalForSupabase.__curveSupabaseClient ||
  (globalForSupabase.__curveSupabaseClient = createClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY));

const productImageCache: Map<number, string> =
  globalForSupabase.__curveProductImageCache ||
  (globalForSupabase.__curveProductImageCache = new Map<number, string>());

let pendingImageFetch: Promise<Map<number, string>> | null = null;

async function ensureProductImageCache(): Promise<Map<number, string>> {
  if (productImageCache.size > 0) return productImageCache;
  if (pendingImageFetch) return pendingImageFetch;
  pendingImageFetch = (async () => {
    try {
      const { data } = await supabase.from('sanpham').select('ma_sp, hinh_anh');
      if (Array.isArray(data)) {
        for (const row of data as any[]) {
          if (row?.ma_sp && typeof row.hinh_anh === 'string') {
            productImageCache.set(Number(row.ma_sp), row.hinh_anh);
          }
        }
      }
    } catch {}
    pendingImageFetch = null;
    return productImageCache;
  })();
  return pendingImageFetch;
}

export interface TaiKhoanRecord {
  account_enabled?: boolean;
  ma_tk: number;
  ho_ten: string;
  email: string;
  so_dien_thoai?: string | null;
  password?: string | null;
  role: string;
  ngay_tao?: string | null;
}

export const mapTaiKhoanToUserAccount = (tk: TaiKhoanRecord): UserAccount => {
  const isGoogle = Boolean(tk.password?.includes('_GOOGLE') || tk.email?.toLowerCase().endsWith('@gmail.com'));
  const hasCustom = Boolean(tk.password && !tk.password.includes('_GOOGLE'));
  return {
    id: `usr_${tk.ma_tk}`,
    name: tk.ho_ten,
    email: tk.email,
    phone: tk.so_dien_thoai || '',
    role: normalizeRole(tk.role, tk.email, tk.ho_ten),
    status: tk.account_enabled === false ? 'locked' : 'active',
    avatar: '',
    createdAt: tk.ngay_tao || '',
    addresses: [],
    authProvider: isGoogle ? 'google' : 'local',
    hasCustomPassword: hasCustom
  };
};

/**
 * Live fetch all users directly from Supabase Cloud `taikhoan` table
 */
export const fetchUsersFromSupabase = async (options: { strict?: boolean } = {}): Promise<UserAccount[]> => {
  try {
    const { data, error } = await supabase
      .from('taikhoan')
      .select('ma_tk, ho_ten, email, so_dien_thoai, role, ngay_tao, account_enabled')
      .order('ma_tk', { ascending: true });

    if (error) {
      console.warn('⚠️ Error fetching from Supabase taikhoan:', error.message);
      if (options.strict) throw error;
      return [];
    }

    if (data && data.length > 0) {
      return (data as TaiKhoanRecord[]).map(mapTaiKhoanToUserAccount);
    }
    return [];
  } catch (err: any) {
    console.warn('⚠️ Supabase connection error:', err?.message);
    if (options.strict) throw err;
    return [];
  }
};

const COLOR_HEX_MAP: Record<string, string> = {
  'Đen Huyền Bí': '#18181B',
  'Đen Tuyển': '#18181B',
  'Đen Tuyển Quý Phái': '#1C1917',
  'Đen Mờ Tối Giản': '#262626',
  'Đen Classic': '#18181B',
  'Đen Quyền Lực': '#18181B',
  'Đen Than Chì': '#262626',
  'Xanh Navy': '#1B2A4A',
  'Xanh Navy Đậm': '#1B2A4A',
  'Trắng Sữa Tinh Khôi': '#F8FAFC',
  'Trắng Sữa Sand': '#EBE5D8',
  'Xanh Lam Pastel': '#BFDBFE',
  'Xanh Indigo Cổ Điển': '#243B55',
  'Đỏ Burgundy': '#6B1D2F',
  'Đỏ Rượu Vang Burgundy': '#6B1D2F',
  'Xanh Rêu Emerald': '#1E3A2F',
  'Nâu Cà Phê Latte': '#8B5A2B',
  'Xanh Lá Xô Thơm Sage': '#627B66',
  'Xám Ghi Tro': '#4B5563',
  'Xám Khói Titan': '#6B7280',
  'Tím Khói Lavender': '#967BB6',
  'Xanh Cổ Vịt Teal': '#005F73',
  'Kem Vani Nude': '#E7DEC8'
};

const CATEGORY_MAP: Record<number, any> = {
  1: 'ao',
  2: 'quan-jeans',
  3: 'dam-vay',
  4: 'do-bo',
  // Backward compatibility fallbacks
  5: 'ao',
  6: 'do-bo'
};

/**
 * Intelligent product resolver: matches database items by name, SKU, or ID
 * to retrieve real Big Size catalog photos and metadata.
 */
export const resolveProductRealDetails = (productName?: string, maCtsp?: number, sku?: string) => {
  const cleanName = (productName || '').trim().toLowerCase();
  const cleanSku = (sku || '').trim().toUpperCase();

  // 1. Try exact or partial name match in mockProducts
  let matched = mockProducts.find(
    (m) =>
      m.name.trim().toLowerCase() === cleanName ||
      (cleanName.length > 5 && (cleanName.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(cleanName)))
  );

  // 2. Keyword fallback for accurate categorization & correct images
  if (!matched) {
    if (
      cleanName.includes('đầm') ||
      cleanName.includes('dam') ||
      cleanName.includes('váy') ||
      cleanName.includes('vay') ||
      cleanSku.includes('DRS')
    ) {
      matched = mockProducts.find((m) => m.id === 'prod-04') || mockProducts.find((m) => m.category === 'dam-vay');
    } else if (
      cleanName.includes('oxford') ||
      cleanName.includes('sơ mi') ||
      cleanName.includes('so mi') ||
      cleanSku.includes('OXF') ||
      cleanSku.includes('SMI')
    ) {
      matched = mockProducts.find((m) => m.id === 'prod-02') || mockProducts.find((m) => m.category === 'so-mi');
    } else if (cleanName.includes('polo') || cleanSku.includes('POLO')) {
      matched = mockProducts.find((m) => m.id === 'prod-01');
    } else if (cleanName.includes('jean') || cleanSku.includes('JNS')) {
      matched = mockProducts.find((m) => m.id === 'prod-03') || mockProducts.find((m) => m.category === 'quan-jeans');
    } else if (
      cleanName.includes('kaki') ||
      cleanName.includes('tây') ||
      cleanName.includes('âu') ||
      cleanSku.includes('TRU')
    ) {
      matched = mockProducts.find((m) => m.id === 'prod-06');
    } else if (cleanName.includes('thun') || cleanSku.includes('TSH')) {
      matched = mockProducts.find((m) => m.id === 'prod-01');
    } else if (maCtsp) {
      matched = mockProducts.find((m) => m.id === `prod-0${maCtsp}`);
    }
  }

  const base = matched || mockProducts[0];

  // 3. Check custom image overrides in localStorage
  let finalImages = base.images;
  try {
    const savedImages = localStorage.getItem('curve_product_images_overrides');
    if (savedImages) {
      const imgMap = JSON.parse(savedImages);
      if (Array.isArray(imgMap[base.id]) && imgMap[base.id].length > 0) {
        finalImages = imgMap[base.id];
      }
    }
  } catch {}

  return {
    ...base,
    name: productName || base.name,
    images: finalImages
  };
};

/**
 * Live fetch all products with full categories, size charts, and SKU variants directly from Supabase Cloud
 */
export const fetchProductsFromSupabase = async (options: { strict?: boolean } = {}): Promise<Product[]> => {
  try {
    const { data: rows, error } = await supabase
      .from('sanpham')
      .select('*, danhmuc(*), bangsize(*), chitietsanpham(*)')
      .eq('trang_thai', 'dang_kinh_doanh')
      .order('ma_sp', { ascending: true });

    if (error) {
      console.warn('⚠️ Lỗi truy vấn Supabase SanPham:', error.message);
      if (options.strict) throw error;
      return [];
    }

    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((r: any): Product => {
      if (r?.ma_sp && typeof r.hinh_anh === 'string') {
        productImageCache.set(Number(r.ma_sp), r.hinh_anh);
      }
      const bsMap = new Map<number, string>();
      (r.bangsize || []).forEach((b: any) => bsMap.set(b.ma_bang_size, b.kich_co));

      const colorNames = Array.from(new Set<string>((r.chitietsanpham || []).map((c: any) => c.mau_sac)));
      const colors = colorNames.map((cName) => ({
        name: cName,
        hex: COLOR_HEX_MAP[cName] || '#333333'
      }));

      const variants = (r.chitietsanpham || []).map((c: any) => ({
        id: `v${c.ma_ctsp}`,
        size: (bsMap.get(c.ma_bang_size) as any) || 'XL',
        colorName: c.mau_sac,
        colorHex: COLOR_HEX_MAP[c.mau_sac] || '#333333',
        stock: Math.max(0, (c.so_luong_ton || 0) - (c.so_luong_giu || 0)),
        sku: c.sku
      }));

      const sizeChart = (r.bangsize || []).map((b: any) => ({
        size: b.kich_co,
        heightRange: `${b.min_chieu_cao} - ${b.max_chieu_cao} cm`,
        weightRange: `${b.min_can_nang} - ${b.max_can_nang} kg`,
        chest: `${b.min_vong_nguc} - ${b.max_vong_nguc}`,
        waist: `${b.min_vong_eo} - ${b.max_vong_eo}`,
        hips: `${b.min_vong_hong} - ${b.max_vong_hong}`
      }));

      const minPrice =
        (r.chitietsanpham || []).length > 0
          ? Math.min(...r.chitietsanpham.map((c: any) => Number(c.don_gia)))
          : 0;

      const pId = `prod-0${r.ma_sp}`;
      const mockMatch = mockProducts.find((m) => m.id === pId || m.slug === `sp-${r.ma_sp}`);

      // Saved browser overrides are retained on disk but are no longer catalog authority.
      const customPricing: any = null;
      const customImages: any = null;

      const finalImages: string[] = r.hinh_anh ? [r.hinh_anh] : [];

      const finalPrice = customPricing?.price ?? minPrice;
      const baseOriginalPrice = customPricing?.originalPrice ??
        minPrice;
      const finalOriginalPrice = baseOriginalPrice >= finalPrice ? baseOriginalPrice : finalPrice;
      const finalDiscountPercent = customPricing?.discountPercent !== undefined
        ? customPricing.discountPercent
        : (finalOriginalPrice > finalPrice ? Math.round(((finalOriginalPrice - finalPrice) / finalOriginalPrice) * 100) : 0);

      const parentCatSlug = r.danhmuc?.ma_danh_muc_cha ? (CATEGORY_MAP[r.danhmuc.ma_danh_muc_cha] || '') : '';
      const rawCatCode = r.danhmuc?.code ? r.danhmuc.code.toLowerCase().replace(/_/g, '-') : (CATEGORY_MAP[r.ma_danh_muc] || 'ao-thun');
      const resolvedProductCategory = parentCatSlug && !rawCatCode.includes(parentCatSlug)
        ? `${parentCatSlug}-${rawCatCode}`
        : rawCatCode;

      return {
        id: pId,
        name: r.ten_sp,
        slug: `sp-${r.ma_sp}`,
        category: resolvedProductCategory,
        categoryId: r.ma_danh_muc,
        parentCategoryId: r.danhmuc?.ma_danh_muc_cha ?? null,
        categoryName: r.danhmuc?.ten_danh_muc || '',
        parentCategoryName: undefined,
        gender: [1, 2, 3, 7].includes(r.ma_sp) ? 'nam' : r.ma_sp === 6 ? 'unisex' : 'nu',
        price: finalPrice,
        originalPrice: finalOriginalPrice,
        discountPercent: finalDiscountPercent,
        rating: 4.9,
        ratingCount: 120 + r.ma_sp * 14,
        shortDesc: r.mo_ta || mockMatch?.shortDesc || 'Thiết kế phom chuẩn BigSize giấu bụng tôn dáng.',
        description: mockMatch?.description || r.mo_ta || 'Sản phẩm thời trang BigSize cao cấp, tối ưu hóa sự thoải mái cho người đậm người.',
        material: mockMatch?.material || 'Vải dệt công nghệ cao co giãn chuẩn form dáng BigSize, thoáng khí vượt trội.',
        careInstructions: mockMatch?.careInstructions || [
          'Giặt máy ở nhiệt độ thường với sản phẩm cùng màu',
          'Không dùng chất tẩy mạnh',
          'Ủi ở nhiệt độ trung bình'
        ],
        features: mockMatch?.features || [
          'Thiết kế công thái học giấu bụng và bắp tay hiệu quả',
          'Chất vải thoáng mát, thấm hút mồ hôi tối ưu',
          'Dải size từ XL đến 5XL chuẩn phom người đậm'
        ],
        images: finalImages,
        colors,
        sizes: Array.from(new Set((r.bangsize || []).map((b: any) => b.kich_co))) as Size[],
        variants,
        sizeChart,
        isNew: r.ma_sp > 4,
        isBestSeller: r.ma_sp <= 4,
        tags: mockMatch?.tags || ['Big Size', CATEGORY_MAP[r.ma_danh_muc]]
      };
    });
  } catch (err: any) {
    console.warn('⚠️ Supabase product fetch error:', err?.message);
    if (options.strict) throw err;
    return [];
  }
};

/**
 * Live fetch all SKU variants (inventory) directly from Supabase Cloud `chitietsanpham` table
 */
export const fetchInventoryFromSupabase = async (options: { strict?: boolean } = {}): Promise<StockItem[]> => {
  try {
    const [{ data, error }, imgMap] = await Promise.all([
      supabase
        .from('chitietsanpham')
        .select('*, sanpham(ma_sp, ten_sp, ma_danh_muc, trang_thai, danhmuc(*)), bangsize(*)')
        .order('ma_ctsp', { ascending: true }),
      ensureProductImageCache()
    ]);

    if (error) {
      if (options.strict) throw error;
      console.warn('⚠️ Lỗi truy vấn Supabase chitietsanpham:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data
      .filter((r: any) => r?.trang_thai !== 'ngung_kinh_doanh' && r?.sanpham?.trang_thai !== 'ngung_kinh_doanh')
      .map((r: any) => {
        const sp = r.sanpham || {};
        const bs = r.bangsize || {};
        const qty = r.so_luong_ton || 0;
        const unitCost = 0; // Procurement cost is unavailable; do not estimate it from retail price.
        const sellingPrice = Number(r.don_gia ?? 0);
        const size = (bs.kich_co || 'XL') as any;

        const parentSlug = sp.danhmuc?.ma_danh_muc_cha ? (CATEGORY_MAP[sp.danhmuc.ma_danh_muc_cha] || '') : '';
        const selfSlug = sp.danhmuc?.code
          ? sp.danhmuc.code.toLowerCase().replace(/_/g, '-')
          : (CATEGORY_MAP[sp.ma_danh_muc] || '');
        const resolvedCategory = parentSlug && !selfSlug.includes(parentSlug)
          ? `${parentSlug}-${selfSlug}`
          : selfSlug;
        const productImage = sp.hinh_anh || imgMap.get(Number(r.ma_sp || sp.ma_sp)) || '';

        return {
          id: `stock_${r.ma_ctsp}`,
          productId: Number.isSafeInteger(r.ma_sp) ? `prod-0${r.ma_sp}` : `unresolved-variant-${r.ma_ctsp}`,
          productName: sp.ten_sp || 'Chưa định danh sản phẩm',
          productImage,
          category: resolvedCategory,
          size,
          color: r.mau_sac || 'Tiêu chuẩn',
          sku: r.sku,
          quantity: qty,
          heldQuantity: r.so_luong_giu || 0,
          lowStockThreshold: 5,
          unitCost,
          sellingPrice,
          status: qty <= 0 ? 'out_of_stock' : qty <= 5 ? 'low_stock' : 'in_stock',
          updatedAt: r.ngay_kiem_ke ? new Date(r.ngay_kiem_ke).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : ''
        };
      });
  } catch (err: any) {
    if (options.strict) throw err;
    console.warn('⚠️ Lỗi kết nối Supabase Inventory:', err?.message);
    return [];
  }
};

export interface SupabaseVoucher {
  id: number;
  code: string;
  name: string;
  voucherType?: 'discount' | 'shipping';
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxDiscount: number;
  minOrderValue: number;
  startDate?: string;
  endDate?: string;
  startsAt?: string;
  expiresAt?: string;
  status: string;
}

/**
 * Live fetch all vouchers directly from Supabase Cloud `voucher` table
 */
export const fetchVouchersFromSupabase = async (): Promise<SupabaseVoucher[]> => {
  try {
    const { data, error } = await supabase
      .from('voucher')
      .select('*')
      .order('ma_voucher', { ascending: true });

    if (error) {
      console.warn('⚠️ Lỗi truy vấn Supabase voucher:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((v: any) => {
      const startStr = v.ngay_bat_dau ? v.ngay_bat_dau.split('T')[0] : undefined;
      const endStr = v.ngay_ket_thuc ? v.ngay_ket_thuc.split('T')[0] : undefined;

      let status = 'Đang hoạt động';
      if (v.trang_thai !== 'dang_hoat_dong') {
        status = v.trang_thai === 'tam_dung' ? 'Tạm ngưng' : 'Đã vô hiệu hóa';
      } else if (v.ngay_bat_dau && Date.now() < Date.parse(v.ngay_bat_dau)) {
        status = 'Chưa bắt đầu';
      } else if (v.ngay_ket_thuc && Date.now() > Date.parse(v.ngay_ket_thuc)) {
        status = 'Đã hết hạn';
      }

      const voucherType: 'shipping' | 'discount' = (v.loai_voucher === 'van_chuyen' || (!v.loai_voucher && (v.code?.toUpperCase().includes('FREESHIP') || v.ten_voucher?.toLowerCase().includes('vận chuyển') || v.ten_voucher?.toLowerCase().includes('freeship')))) ? 'shipping' : 'discount';
      // Both the column and the matching RPC are deployed in one SQL transaction.
      if (voucherType === 'shipping' && v.loai_voucher === undefined) status = 'Chờ cấu hình';
      return {
        id: v.ma_voucher,
        code: v.code,
        name: v.ten_voucher,
        voucherType,
        discountType: v.loai_giam === 'phan_tram' ? 'percent' : 'fixed',
        discountValue: v.gia_tri_giam,
        maxDiscount: v.giam_toi_da,
        minOrderValue: v.don_toi_thieu,
        startsAt: v.ngay_bat_dau || undefined,
        expiresAt: v.ngay_ket_thuc || undefined,
        startDate: startStr,
        endDate: endStr,
        status
      };
    });
  } catch (err: any) {
    console.warn('⚠️ Lỗi kết nối Supabase Voucher:', err?.message);
    return [];
  }
};

/**
 * Live fetch all orders directly from Supabase Cloud `hoadon` table
 */
export const fetchOrdersFromSupabase = async (): Promise<Order[]> => {
  try {
    const [{ data, error }, imgMap] = await Promise.all([
      supabase
        .from('hoadon')
        .select('*, chitiethoadon(*, chitietsanpham(ma_sp, sku, sanpham(ma_sp, ten_sp, ma_danh_muc, mo_ta, danhmuc(code, ten_danh_muc)))), vandon(*), voucher(code, ten_voucher), khachhang(ma_tk, taikhoan(email, ho_ten, so_dien_thoai))')
        .order('ma_hd', { ascending: false }),
      ensureProductImageCache()
    ]);

    if (error) {
      console.warn('⚠️ Lỗi truy vấn Supabase hoadon:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((h: any) => {
      const statusMap: Record<string, OrderStatus> = {
        'Cho_xac_nhan': 'placed',
        'Pending': 'placed',
        'Da_xac_nhan': 'confirmed',
        'Confirmed': 'confirmed',
        'Dang_dong_goi': 'preparing',
        'Da_lay_hang': 'preparing',
        'Dang_giao': 'shipping',
        'Giao_thanh_cong': 'delivered',
        'Da_huy': 'cancelled',
        'Cancelled': 'cancelled'
      };

      const status: OrderStatus = statusMap[h.trang_thai_don] || 'placed';
      const orderId = `BS-HD0${h.ma_hd}`;
      const vd = Array.isArray(h.vandon) ? h.vandon[0] : h.vandon;
      const carrier = (vd?.don_vi_van_chuyen as any) || undefined;
      const trackingCode = vd?.ma_tracking || undefined;
      const deliveredAt = vd?.ngay_giao_thanh_cong || undefined;

      const items: CartItem[] = (h.chitiethoadon || []).map((ct: any) => {
        const maSp = ct?.chitietsanpham?.ma_sp ?? ct?.chitietsanpham?.sanpham?.ma_sp;
        const cachedImg = maSp ? imgMap.get(Number(maSp)) : undefined;
        if (cachedImg && ct?.chitietsanpham?.sanpham && !ct.chitietsanpham.sanpham.hinh_anh) {
          ct = {
            ...ct,
            chitietsanpham: {
              ...ct.chitietsanpham,
              sanpham: {
                ...ct.chitietsanpham.sanpham,
                hinh_anh: cachedImg
              }
            }
          };
        }
        return mapOrderItem(ct);
      });

      const createdAt = h.ngay_dat ? new Date(h.ngay_dat).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
      const customerEmail = h.khachhang?.taikhoan?.email || '';
      const customerPhone = h.sdt_nguoi_nhan || h.khachhang?.taikhoan?.so_dien_thoai || '';
      const paymentMethod: 'cod' | 'vnpay' = h.phuong_thuc_tt === 'COD' ? 'cod' : 'vnpay';
      const rawTt = String(h.trang_thai_tt || '').trim();
      const vnpMetaStatus = String(h.yeu_cau_dia_chi?.vnpay_status || '').trim();

      let paymentStatus: PaymentStatus = 'pending';
      if (rawTt === 'da_thanh_toan') {
        paymentStatus = 'paid';
      } else if (rawTt === 'da_hoan_tien' || vnpMetaStatus === 'da_hoan_tien') {
        paymentStatus = 'refunded';
      } else if (rawTt === 'thanh_toan_that_bai' || vnpMetaStatus === 'thanh_toan_that_bai') {
        paymentStatus = 'failed';
      } else if (rawTt === 'da_huy_thanh_toan' || vnpMetaStatus === 'da_huy_thanh_toan') {
        paymentStatus = 'cancelled';
      } else if (paymentMethod !== 'cod' && status === 'cancelled') {
        paymentStatus = 'cancelled';
      } else {
        paymentStatus = 'pending';
      }

      const isVnpay = paymentMethod !== 'cod';
      const isVnpayPaid = !isVnpay || paymentStatus === 'paid';

      const timeline = status === 'cancelled'
        ? (
            isVnpay && paymentStatus === 'failed'
              ? [
                  { status: 'placed' as OrderStatus, label: 'Thanh toán VNPay thất bại', description: 'Giao dịch VNPay không thành công, đơn hàng không được xử lý', completed: false, current: false },
                  { status: 'cancelled' as OrderStatus, label: 'Đơn hàng đã hủy', description: 'Đã hủy đơn hàng và giải phóng tồn kho tạm giữ (Reserved Stock)', completed: true, current: true }
                ]
              : isVnpay && paymentStatus === 'cancelled'
              ? [
                  { status: 'placed' as OrderStatus, label: 'Đã hủy thanh toán VNPay', description: 'Khách hàng hủy giao dịch hoặc quá thời hạn chờ thanh toán VNPay', completed: false, current: false },
                  { status: 'cancelled' as OrderStatus, label: 'Đơn hàng đã hủy', description: 'Đã hủy đơn hàng và giải phóng tồn kho tạm giữ (Reserved Stock)', completed: true, current: true }
                ]
              : [
                  { status: 'placed' as OrderStatus, label: 'Đặt hàng thành công', description: 'Đã nhận đơn hàng', completed: true, current: false },
                  { status: 'cancelled' as OrderStatus, label: 'Đơn hàng đã hủy', description: 'Đơn hàng đã hủy và hoàn trả tồn kho an toàn', completed: true, current: true }
                ]
          )
        : [
            isVnpay
              ? (paymentStatus === 'paid'
                  ? { status: 'placed' as OrderStatus, label: 'Đặt hàng & Thanh toán thành công', description: 'Đã xác nhận thanh toán VNPay hợp lệ', completed: true, current: status === 'placed' }
                  : { status: 'placed' as OrderStatus, label: 'Chờ thanh toán VNPay', description: 'Đơn hàng đang tạm giữ tồn kho chờ xác nhận thanh toán từ VNPay (chưa đủ điều kiện giao hàng)', completed: false, current: status === 'placed' })
              : { status: 'placed' as OrderStatus, label: 'Đặt hàng thành công', description: 'Đã nhận đơn hàng', completed: true, current: status === 'placed' },
            {
              status: 'confirmed' as OrderStatus,
              label: 'Đã xác nhận đơn',
              description: isVnpay && !isVnpayPaid ? 'Chỉ xác nhận sau khi giao dịch VNPay thành công hợp lệ' : 'Đã kiểm tra size và đóng gói',
              completed: isVnpayPaid && ['confirmed', 'preparing', 'shipping', 'delivered'].includes(status),
              current: isVnpayPaid && status === 'confirmed'
            },
            {
              status: 'shipping' as OrderStatus,
              label: 'Đang giao hàng (3PL)',
              description: (carrier && trackingCode)
                ? `Vận chuyển qua ${carrier}: ${trackingCode}`
                : 'Kiện hàng đang chờ bàn giao cho đối tác vận chuyển 3PL',
              completed: isVnpayPaid && status === 'delivered',
              current: isVnpayPaid && status === 'shipping'
            },
            { status: 'delivered' as OrderStatus, label: 'Giao hàng thành công', description: 'Đã giao an toàn', completed: isVnpayPaid && status === 'delivered', current: false }
          ];

      return {
        id: orderId,
        maHd: h.ma_hd,
        customerId: h.ma_kh ?? undefined,
        createdAt,
        createdAtTimestamp: h.ngay_dat || undefined,
        status,
        shippingMethod: 'standard',
        shippingFee: h.phi_van_chuyen || 0,
        paymentMethod,
        paymentStatus,
        paymentResponseCode: h.yeu_cau_dia_chi?.vnp_response_code || undefined,
        paymentTransactionNo: h.yeu_cau_dia_chi?.vnp_transaction_no || undefined,
        stockHoldStatus: h.trang_thai_giu || undefined,
        holdExpiresAt: h.thoi_han_hold || h.yeu_cau_dia_chi?.hold_expires_at || undefined,
        subtotal: h.tong_tien_hang,
        discountAmount: h.giam_gia || 0,
        voucherCode: h.voucher?.code || (h.ma_voucher ? `VOUCHER-${h.ma_voucher}` : undefined),
        total: h.thanh_tien,
        carrier,
        trackingCode,
        deliveredAt,
        yeuCauDiaChi: h.yeu_cau_dia_chi || undefined,
        shippingAddress: {
          ...parseShippingAddress(h.dia_chi_giao || ''),
          fullName: h.ten_nguoi_nhan,
          phone: customerPhone,
          email: customerEmail,
          isDefault: true
        },
        items,
        timeline
      };
    });
  } catch (err: any) {
    console.warn('⚠️ Lỗi kết nối Supabase Orders:', err?.message);
    return [];
  }
};

/**
 * Persist a newly placed order directly into Supabase Cloud `hoadon` and `chitiethoadon`
 */
export const createOrderInSupabase = async (
  order: Order,
  user?: UserAccount | null
): Promise<{ success: boolean; ma_hd?: number }> => {
  const saved = await placeOrder(supabase, order, order.clientCode || order.id);
  return { success: true, ma_hd: saved.order_id };
};

/**
 * Live fetch return/exchange requests from Supabase Cloud `yeucaudoitra` table
 */
export const fetchReturnsFromSupabase = async (): Promise<ReturnRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('yeucaudoitra')
      .select('*, hoadon(*), chitietyeucaudoitra(*, chitiethoadon(*), chitietsanpham!ma_ctsp_moi(bangsize(kich_co)), minhchungdoitra(*))')
      .order('ma_ycdt', { ascending: false });

    if (error) {
      console.warn('⚠️ Lỗi truy vấn Supabase yeucaudoitra:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((y: any): ReturnRequest => {
      const orderId = `BS-HD0${y.ma_hd}`;
      const custName = y.hoadon?.ten_nguoi_nhan || 'Khách hàng';
      const custPhone = y.hoadon?.sdt_nguoi_nhan || '';

      const statusMap: Record<string, ReturnRequest['status']> = {
        'cho_xu_ly': 'pending_review',
        'duyet_so_bo': 'approved',
        'da_nhan_hang': 'received_goods',
        'da_kiem_tra': 'received_goods',
        'dang_giao_hang_doi': 'exchange_sent',
        'completed': 'refunded',
        'hoan_tat': 'refunded',
        'tu_choi': 'rejected'
      };
      const status: ReturnRequest['status'] = statusMap[y.trang_thai] || 'pending_review';

      // Phục hồi đầy đủ tất cả sản phẩm thuộc yêu cầu đổi trả
      const rawDetails = y.chitietyeucaudoitra || [];
      const items: ReturnItemInfo[] = rawDetails.map((ct: any) => {
        const ctHd = ct.chitiethoadon;
        return {
          orderItemId: ct.ma_cthd,
          returnDetailId: ct.ma_ctycdt,
          inspected: ct.ket_qua_kiem_tra != null,
          sku: ctHd?.sku_mua,
          productId: ctHd?.sku_mua || `sp-${ct.ma_cthd || ct.ma_ctycdt}`,
          productName: ctHd?.ten_sp_mua || 'Sản phẩm đổi trả',
          productImage: '',
          currentSize: ctHd?.kich_co_mua as any,
          requestedSize: ct.chitietsanpham?.bangsize?.kich_co as any,
          quantity: ct.so_luong || 1,
          price: ctHd?.don_gia || 0,
          reasonDetail: ct.tinh_trang_thuc_te || y.ghi_chu_xu_ly || ''
        };
      });

      const firstItem = items[0] || {
        productId: '',
        productName: 'Chờ bổ sung thông tin sản phẩm',
        productImage: '',
        currentSize: undefined as any,
        quantity: 1,
        price: 0
      };

      return {
        id: `RET-00${y.ma_ycdt}`,
        orderId,
        customerName: custName,
        customerPhone: custPhone,
        type: y.loai_yeu_cau === 'doi_size' ? 'exchange_size' : 'return_refund',
        productId: firstItem.productId,
        productName: items.length > 1 ? `${firstItem.productName} (+${items.length - 1} món khác)` : firstItem.productName,
        productImage: firstItem.productImage,
        currentSize: firstItem.currentSize,
        requestedSize: firstItem.requestedSize,
        items,
        reason: y.reason_code || 'other',
        reasonDetail: y.ghi_chu_xu_ly || '',
        images: rawDetails.flatMap((ct: any) => (ct.minhchungdoitra || []).filter((m: any) => m.loai_file === 'image').map((m: any) => m.duong_dan_file)),
        videoUrl: rawDetails.flatMap((ct: any) => ct.minhchungdoitra || []).find((m: any) => m.loai_file === 'video')?.duong_dan_file,
        createdAt: y.ngay_yeu_cau ? new Date(y.ngay_yeu_cau).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'),
        status,
        adminNote: y.ghi_chu_xu_ly || '',
        refundAmount: y.loai_yeu_cau === 'tra_hang' || y.loai_yeu_cau === 'hoan_tien' ? (y.hoadon?.thanh_tien || 0) : undefined,
        newTrackingCode: y.exchange_tracking_code || undefined,
        recoveryInfo: y.recovery_info || undefined
      };
    });
  } catch (err: any) {
    console.warn('⚠️ Lỗi kết nối Supabase Returns:', err?.message);
    return [];
  }
};

/**
 * Live fetch stock adjustment logs from Supabase Cloud `lichsudieuchinhsoluong` table
 */
export const fetchAdjustmentLogsFromSupabase = async (options: { strict?: boolean } = {}): Promise<StockAdjustmentLog[]> => {
  try {
    const { data, error } = await supabase
      .from('lichsudieuchinhsoluong')
      .select('*, chitietsanpham(*, sanpham(*), bangsize(*)), nhanvien(taikhoan(ho_ten))')
      .order('ma_lich_su', { ascending: false });

    if (error) {
      if (options.strict) throw error;
      console.warn('⚠️ Lỗi truy vấn Supabase lichsudieuchinhsoluong:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((l: any): StockAdjustmentLog => {
      const ct = l.chitietsanpham;
      const sp = ct?.sanpham;
      const bs = ct?.bangsize;
      const sku = ct?.sku || 'SKU-TON-KHO';
      const productName = sp?.ten_sp || 'Sản phẩm Big Size';
      const size = (bs?.kich_co || 'XL') as any;
      const changeType = l.chenh_lech > 0 ? 'in' : l.chenh_lech < 0 ? 'out' : 'adjust';
      const performer = l.nhanvien?.taikhoan?.ho_ten || 'Nhân viên kiểm kê';

      return {
        id: `ADJ-00${l.ma_lich_su}`,
        sku,
        productName,
        size,
        changeType,
        quantityChange: l.chenh_lech || (l.so_luong_sau - l.so_luong_truoc),
        previousQuantity: l.so_luong_truoc,
        newQuantity: l.so_luong_sau,
        reason: l.ly_do || 'Kiểm kê và điều chỉnh kho thực tế',
        performedBy: performer,
        timestamp: l.thoi_gian ? new Date(l.thoi_gian).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : ''
      };
    });
  } catch (err: any) {
    if (options.strict) throw err;
    console.warn('⚠️ Lỗi kết nối Supabase StockAdjustmentLogs:', err?.message);
    return [];
  }
};

/**
 * Live fetch cancellation requests from Supabase Cloud `yeucauhuy` table
 */
export const fetchCancellationsFromSupabase = async (): Promise<CancellationRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('yeucauhuy')
      .select('*, hoadon(*), khachhang(ma_tk, taikhoan(email, ho_ten, so_dien_thoai))')
      .order('ma_ych', { ascending: false });

    if (error) {
      console.warn('⚠️ Lỗi truy vấn Supabase yeucauhuy:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    // This optional read must not hide cancellation records when deployment is pending.
    const refundRead = await supabase.from('hoantien').select('ma_ych,trang_thai');
    const refundRows = refundRead.error ? null : (refundRead.data || []);

    return data.map((y: any): CancellationRequest => {
      const custName = y.hoadon?.ten_nguoi_nhan || y.khachhang?.taikhoan?.ho_ten || 'Khách hàng';
      const orderId = `BS-HD0${y.ma_hd}`;

      const statusMap: Record<string, CancellationRequest['status']> = {
        'da_duyet': 'approved',
        'tu_choi': 'rejected',
        'cho_xu_ly': 'pending_review'
      };
      const status: CancellationRequest['status'] = statusMap[y.trang_thai] || 'pending_review';

      const refunds = refundRows?.filter((r: any) => r.ma_ych === y.ma_ych) || [];
      const refundStatus: CancellationRequest['refundStatus'] = refundRows === null ? 'unknown' : refunds.some((r: any) => r.trang_thai === 'thanh_cong')
        ? 'completed' : refunds.some((r: any) => r.trang_thai === 'cho_xu_ly') ? 'pending' : 'none';

      const createdAt = y.thoi_gian_yeu_cau
        ? new Date(y.thoi_gian_yeu_cau).toLocaleString('vi-VN')
        : '2026-10-21 10:00';

      return {
        id: `CAN-00${y.ma_ych}`,
        orderId,
        customerName: custName,
        reason: y.ly_do || 'Yêu cầu hủy đơn hàng',
        createdAt,
        status,
        refundStatus,
        adminNote: y.ghi_chu_xu_ly || (status === 'approved' ? 'Đã duyệt yêu cầu hủy đơn.' : undefined)
      };
    });
  } catch (err: any) {
    console.warn('⚠️ Lỗi kết nối Supabase Cancellations:', err?.message);
    return [];
  }
};

/**
 * Realtime Cart Sync with Supabase Cloud (`giohang` & `chitietgiohang`)
 * Persists active customer cart into real PostgreSQL tables.
 */
export const syncCartToSupabase = async (
  cartItems: CartItem[], userEmailOrId?: string | null
): Promise<{ success: boolean; cartId?: number }> => {
  if (!userEmailOrId || !Array.isArray(cartItems) || cartItems.length > 100) return { success: false };
  try {
    let maTk: number | null = null;
    let targetEmail = '';

    if (userEmailOrId.includes('@')) {
      targetEmail = userEmailOrId.toLowerCase().trim();
    } else {
      const parsed = parseInt(userEmailOrId.replace('usr_', ''), 10);
      if (!isNaN(parsed)) maTk = parsed;
    }

    if (!maTk && targetEmail) {
      const { data: tkFound, error: accountError } = await supabase
        .from('taikhoan')
        .select('ma_tk')
        .ilike('email', targetEmail)
        .maybeSingle();
      if (accountError) return { success: false };
      if (tkFound?.ma_tk) maTk = tkFound.ma_tk;
    }

    if (!maTk) return { success: false };

    // 1. Get or create khachhang record
    let maKh: number | null = null;
    const { data: existingKh, error: customerError } = await supabase
      .from('khachhang')
      .select('ma_kh')
      .eq('ma_tk', maTk)
      .maybeSingle();

    if (customerError) return { success: false };

    if (existingKh?.ma_kh) {
      maKh = existingKh.ma_kh;
    } else {
      const { data: newKh, error: createCustomerError } = await supabase
        .from('khachhang')
        .insert({ ma_tk: maTk, trangthai: 'hoat_dong' })
        .select('ma_kh')
        .maybeSingle();
      if (createCustomerError) return { success: false };
      if (newKh?.ma_kh) maKh = newKh.ma_kh;
    }

    if (!maKh) return { success: false };

    // 2. Find or create active cart (trang_thai = 'dang_su_dung')
    let maGioHang: number | null = null;
    const { data: activeCart, error: cartError } = await supabase
      .from('giohang')
      .select('ma_gio_hang')
      .eq('ma_kh', maKh)
      .eq('trang_thai', 'dang_su_dung')
      .order('ma_gio_hang', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cartError) return { success: false };

    if (activeCart?.ma_gio_hang) {
      maGioHang = activeCart.ma_gio_hang;
    } else {
      const { data: createdCart, error: createCartErr } = await supabase
        .from('giohang')
        .insert({
          ma_kh: maKh,
          trang_thai: 'dang_su_dung'
        })
        .select('ma_gio_hang')
        .maybeSingle();

      if (createCartErr || !createdCart) {
        console.warn('⚠️ Lỗi tạo giỏ hàng Supabase:', createCartErr?.message);
        return { success: false };
      }
      maGioHang = createdCart.ma_gio_hang;
    }

    // Validate every variant before changing cart lines. An explicit SKU never falls back.
    let finalRows: { ma_gio_hang: number; ma_ctsp: number; so_luong: number }[] = [];
    if (cartItems.length > 0 && maGioHang) {
      const { data: allCtsp, error: ctspErr } = await supabase
        .from('chitietsanpham')
        .select('ma_ctsp, ma_sp, sku, mau_sac, bangsize(kich_co)');

      if (ctspErr || !allCtsp) {
        console.warn('⚠️ Lỗi kiểm tra biến thể giỏ hàng:', ctspErr?.message);
        return { success: false, cartId: maGioHang ?? undefined };
      }

      const itemsToInsert = cartItems.map((item) => {
        if (!item || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 9999) return null;
        const productId = /^prod-0*([1-9]\d*)$/.exec(item.productId || '');
        const rawSpId = productId ? Number(productId[1]) : NaN;
        const hasSku = item.sku !== undefined && item.sku !== null;
        const matches = allCtsp.filter((c: any) => {
          if (hasSku) return typeof item.sku === 'string' && item.sku.trim().length > 0 && c.sku === item.sku;
          const size = Array.isArray(c.bangsize) ? c.bangsize[0]?.kich_co : c.bangsize?.kich_co;
          return Number.isSafeInteger(rawSpId) && c.ma_sp === rawSpId &&
            !!item.size && !!item.colorName && size === item.size && c.mau_sac === item.colorName;
        });
        // Ambiguous fallback variants must not silently pick the first row.
        if (matches.length !== 1) return null;
        const match = matches[0];

        const qty = item.quantity;
        return {
          ma_gio_hang: maGioHang!,
          ma_ctsp: match.ma_ctsp,
          so_luong: qty
        };
      });

      // If ANY item in cart fails to match, do NOT proceed or wipe old rows!
      if (itemsToInsert.some(it => it === null)) {
        console.warn('⚠️ Phát hiện sản phẩm trong giỏ không khớp biến thể. Hủy ghi để bảo toàn dữ liệu.');
        return { success: false, cartId: maGioHang ?? undefined };
      }

      // Deduplicate by ma_ctsp if multiple cart items map to the same ctsp
      const dedupMap = new Map<number, number>();
      (itemsToInsert as { ma_gio_hang: number; ma_ctsp: number; so_luong: number }[]).forEach((it) => {
        dedupMap.set(it.ma_ctsp, (dedupMap.get(it.ma_ctsp) || 0) + it.so_luong);
      });

      finalRows = Array.from(dedupMap.entries()).map(([ma_ctsp, so_luong]) => ({
        ma_gio_hang: maGioHang!,
        ma_ctsp,
        so_luong
      }));
      if (finalRows.some(row => !Number.isSafeInteger(row.so_luong) || row.so_luong > 9999)) return { success: false };
    }

    // Separate HTTP requests are not a transaction. Preserve old lines if the write fails.
    const { data: previousRows, error: readError } = await supabase.from('chitietgiohang')
      .select('ma_ct_gio_hang, ma_ctsp, so_luong').eq('ma_gio_hang', maGioHang);
    if (readError || !Array.isArray(previousRows)) return { success: false };

    if (finalRows.length > 0) {
      const { data: savedRows, error: saveError } = await supabase.from('chitietgiohang')
        .upsert(finalRows, { onConflict: 'ma_gio_hang,ma_ctsp' })
        .select('ma_ctsp, so_luong');
      if (saveError || !Array.isArray(savedRows) || savedRows.length !== finalRows.length ||
        !finalRows.every(row => savedRows.some(saved => saved.ma_ctsp === row.ma_ctsp && saved.so_luong === row.so_luong))) {
        return { success: false };
      }
    }

    // Delete only obsolete lines observed before this write; never clear the cart first.
    const obsoleteRows = previousRows.filter(previous => !finalRows.some(row => row.ma_ctsp === previous.ma_ctsp));
    for (const previous of obsoleteRows) {
      const { data: removed, error: deleteError } = await supabase.from('chitietgiohang').delete()
        .eq('ma_gio_hang', maGioHang).eq('ma_ct_gio_hang', previous.ma_ct_gio_hang)
        .eq('so_luong', previous.so_luong).select('ma_ct_gio_hang');
      if (deleteError || !removed || removed.length !== 1) return { success: false };
    }

    const { error: timestampError } = await supabase.from('giohang')
      .update({ ngay_cap_nhat: new Date().toISOString() }).eq('ma_gio_hang', maGioHang);
    if (timestampError) return { success: false };
    return { success: true, cartId: maGioHang ?? undefined };
  } catch (err: any) {
    console.warn('⚠️ Exception đồng bộ giỏ hàng Supabase:', err?.message);
    return { success: false };
  }
};

/**
 * Mark active cart as converted to order upon successful checkout
 */
export const markCartAsConvertedInSupabase = async (
  userEmailOrId?: string | null
): Promise<void> => {
  if (!userEmailOrId) return;
  try {
    let maTk: number | null = null;
    if (userEmailOrId.includes('@')) {
      const { data: tkFound } = await supabase
        .from('taikhoan')
        .select('ma_tk')
        .ilike('email', userEmailOrId.toLowerCase().trim())
        .maybeSingle();
      if (tkFound?.ma_tk) maTk = tkFound.ma_tk;
    } else {
      const parsed = parseInt(userEmailOrId.replace('usr_', ''), 10);
      if (!isNaN(parsed)) maTk = parsed;
    }
    if (!maTk) return;

    const { data: kh } = await supabase
      .from('khachhang')
      .select('ma_kh')
      .eq('ma_tk', maTk)
      .maybeSingle();
    if (!kh?.ma_kh) return;

    await supabase
      .from('giohang')
      .update({ trang_thai: 'da_chuyen_thanh_hoa_don', ngay_cap_nhat: new Date().toISOString() })
      .eq('ma_kh', kh.ma_kh)
      .eq('trang_thai', 'dang_su_dung');
  } catch (err: any) {
    console.warn('⚠️ Lỗi chuyển trạng thái giỏ hàng Supabase:', err?.message);
  }
};

/**
 * Fetch active cart items from Supabase Cloud
 */
export const fetchCartFromSupabase = async (
  userEmailOrId?: string | null, options: { strict?: boolean } = {}
): Promise<CartItem[] | null> => {
  if (!userEmailOrId) return null;
  try {
    let maTk: number | null = null;
    let targetEmail = '';

    if (userEmailOrId.includes('@')) {
      targetEmail = userEmailOrId.toLowerCase().trim();
    } else {
      const parsed = parseInt(userEmailOrId.replace('usr_', ''), 10);
      if (!isNaN(parsed)) maTk = parsed;
    }

    if (!maTk && targetEmail) {
      const { data: tkFound } = await supabase
        .from('taikhoan')
        .select('ma_tk')
        .ilike('email', targetEmail)
        .maybeSingle();
      if (tkFound?.ma_tk) maTk = tkFound.ma_tk;
    }

    if (!maTk) return null;

    const { data: kh, error: customerError } = await supabase
      .from('khachhang')
      .select('ma_kh')
      .eq('ma_tk', maTk)
      .maybeSingle();

    if (customerError) {
      if (options.strict) throw customerError;
      return null;
    }
    if (!kh?.ma_kh) {
      if (options.strict) return [];
      return null;
    }

    const { data: activeCart, error: cartError } = await supabase
      .from('giohang')
      .select('ma_gio_hang')
      .eq('ma_kh', kh.ma_kh)
      .eq('trang_thai', 'dang_su_dung')
      .order('ma_gio_hang', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cartError) {
      if (options.strict) throw cartError;
      return null;
    }
    if (!activeCart?.ma_gio_hang) return [];

    const { data: items, error } = await supabase
      .from('chitietgiohang')
      .select('ma_ct_gio_hang, so_luong, chitietsanpham(*, sanpham(*), bangsize(*))')
      .eq('ma_gio_hang', activeCart.ma_gio_hang);

    if (error) {
      if (options.strict) throw error;
      return null;
    }
    if (!items || items.length === 0) return [];

    let liveProducts: Product[] = [];
    try {
      if (typeof sessionStorage !== 'undefined') {
        const cached = sessionStorage.getItem('curve_live_products');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) liveProducts = parsed;
        }
      }
      if (liveProducts.length === 0) {
        liveProducts = await fetchProductsFromSupabase({ strict: options.strict });
      }
    } catch (productError) {
      if (options.strict && liveProducts.length === 0) throw productError;
      if (liveProducts.length === 0) liveProducts = [];
    }

    const cartList: CartItem[] = [];
    for (const it of (items as any[])) {
      const ctsp: any = Array.isArray(it.chitietsanpham) ? it.chitietsanpham[0] : it.chitietsanpham;
      const sp: any = Array.isArray(ctsp?.sanpham) ? ctsp?.sanpham[0] : ctsp?.sanpham;
      const bangsize: any = Array.isArray(ctsp?.bangsize) ? ctsp?.bangsize[0] : ctsp?.bangsize;
      if (options.strict && (!ctsp?.sku || !sp?.ma_sp || !bangsize?.kich_co || !ctsp?.mau_sac ||
        !Number.isSafeInteger(it.so_luong) || it.so_luong < 1)) {
        throw new Error('Incomplete cart variant');
      }
      const size = (bangsize?.kich_co || 'XL') as Size;
      const colorName = ctsp?.mau_sac || 'Mặc định';
      const prodId = sp?.ma_sp ? (String(sp.ma_sp).startsWith('prod-') ? String(sp.ma_sp) : `prod-0${sp.ma_sp}`) : 'prod-01';
      if (options.strict && !liveProducts.some(p => p.id === prodId || p.id === String(sp?.ma_sp))) {
        throw new Error('Cart product could not be loaded');
      }
      const product = liveProducts.find(p => p.id === prodId || p.id === String(sp?.ma_sp)) || mockProducts.find(p => p.id === prodId || p.id === String(sp?.ma_sp)) || mockProducts[0];

      cartList.push({
        id: `${prodId}_${size}_${colorName}`,
        productId: prodId,
        product: {
          ...product,
          id: prodId,
          name: sp?.ten_sp || product.name,
          price: ctsp?.don_gia ? Number(ctsp.don_gia) : product.price,
        },
        sku: ctsp?.sku || undefined,
        size,
        colorName,
        colorHex: '#1C1917',
        quantity: it.so_luong || 1,
        price: ctsp?.don_gia ? Number(ctsp.don_gia) : product.price
      });
    }

    return cartList;
  } catch (err: any) {
    console.warn('⚠️ Lỗi tải giỏ hàng Supabase:', err?.message);
    if (options.strict) throw err;
    return null;
  }
};

/**
 * ====================================================================
 * QUẢN LÝ HỒ SƠ SỐ ĐO CƠ THỂ KHÁCH HÀNG (BẢNG SODOCETHE TRÊN SUPABASE)
 * TUYỆT ĐỐI KHÔNG DÙNG MOCK DATA DEMO
 * ====================================================================
 */
export const mapSupabaseSoDoToBodyProfile = (row: any, index: number, activeId?: string | null): BodyProfile => {
  const gender = row.gioi_tinh === 'nu' ? 'nu' : 'nam';
  const fitPreference = row.kieu_dang === 'rong_rai' ? 'loose' : row.kieu_dang === 'om' ? 'snug' : 'regular';
  const id = `sodo_${row.ma_so_do}`;
  return {
    id,
    name: row.ten_ho_so || 'Hồ sơ số đo',
    isDefault: activeId ? id === activeId : index === 0,
    gender,
    height: Number(row.chieu_cao) || 170,
    weight: Number(row.can_nang) || 85,
    chest: Number(row.vong_nguc) || 0,
    waist: Number(row.vong_eo) || 0,
    hips: Number(row.vong_hong) || 0,
    fitPreference,
    bodyFeature: row.kieu_dang === 'rong_rai' ? 'Thích mặc rộng rãi' : row.kieu_dang === 'om' ? 'Thích mặc ôm gọn' : 'Vừa vặn tiêu chuẩn',
    notes: row.kieu_dang || '',
    relationship: index === 0 ? 'Bản thân' : 'Người thân',
    subInfo: `${gender === 'nam' ? 'Nam' : 'Nữ'} • ${row.can_nang}kg • ${row.chieu_cao}cm`
  };
};

export const fetchCustomerBodyProfiles = async (userId: string): Promise<BodyProfile[]> => {
  if (!userId) return [];
  try {
    let maTk: number | null = null;
    if (userId.startsWith('usr_')) {
      maTk = parseInt(userId.replace('usr_', ''), 10);
    }
    if (!maTk) return [];

    const { data: kh, error: khErr } = await supabase
      .from('khachhang')
      .select('ma_kh')
      .eq('ma_tk', maTk)
      .maybeSingle();

    if (khErr || !kh?.ma_kh) return [];

    const { data: list, error: sodoErr } = await supabase
      .from('sodocothe')
      .select('*')
      .eq('ma_kh', kh.ma_kh)
      .order('ma_so_do', { ascending: true });

    if (sodoErr || !Array.isArray(list)) return [];

    return list.map((item, idx) => mapSupabaseSoDoToBodyProfile(item, idx));
  } catch (err) {
    console.error('Lỗi tải hồ sơ số đo từ Supabase:', err);
    return [];
  }
};

export const saveCustomerBodyProfile = async (
  userId: string,
  profileData: Omit<BodyProfile, 'id'>,
  existingProfileId?: string
): Promise<BodyProfile | null> => {
  if (!userId) return null;
  try {
    let maTk: number | null = null;
    if (userId.startsWith('usr_')) {
      maTk = parseInt(userId.replace('usr_', ''), 10);
    }
    if (!maTk) return null;

    let maKh: number | null = null;
    const { data: existingKh } = await supabase
      .from('khachhang')
      .select('ma_kh')
      .eq('ma_tk', maTk)
      .maybeSingle();

    if (existingKh?.ma_kh) {
      maKh = existingKh.ma_kh;
    } else {
      const { data: newKh } = await supabase
        .from('khachhang')
        .insert({ ma_tk: maTk, trangthai: 'hoat_dong' })
        .select('ma_kh')
        .maybeSingle();
      if (newKh?.ma_kh) maKh = newKh.ma_kh;
    }

    if (!maKh) return null;

    const payload = {
      ma_kh: maKh,
      ten_ho_so: profileData.name.trim() || 'Hồ sơ số đo',
      chieu_cao: profileData.height,
      can_nang: profileData.weight,
      vong_nguc: profileData.chest || null,
      vong_eo: profileData.waist || null,
      vong_hong: profileData.hips || null,
      gioi_tinh: profileData.gender === 'nu' ? 'nu' : 'nam',
      kieu_dang: profileData.fitPreference === 'loose' ? 'rong_rai' : profileData.fitPreference === 'snug' ? 'om' : 'vua_van'
    };

    if (existingProfileId && existingProfileId.startsWith('sodo_')) {
      const maSoDo = parseInt(existingProfileId.replace('sodo_', ''), 10);
      const { data: updated, error } = await supabase
        .from('sodocothe')
        .update(payload)
        .eq('ma_so_do', maSoDo)
        .eq('ma_kh', maKh)
        .select()
        .single();
      if (error || !updated) return null;
      return mapSupabaseSoDoToBodyProfile(updated, 0);
    } else {
      const { data: created, error } = await supabase
        .from('sodocothe')
        .insert(payload)
        .select()
        .single();
      if (error || !created) return null;
      return mapSupabaseSoDoToBodyProfile(created, 0);
    }
  } catch (err) {
    console.error('Lỗi lưu hồ sơ số đo lên Supabase:', err);
    return null;
  }
};

export const deleteCustomerBodyProfile = async (
  userId: string,
  profileId: string
): Promise<boolean> => {
  if (!userId || !profileId.startsWith('sodo_')) return false;
  try {
    let maTk: number | null = null;
    if (userId.startsWith('usr_')) {
      maTk = parseInt(userId.replace('usr_', ''), 10);
    }
    if (!maTk) return false;

    const { data: kh } = await supabase
      .from('khachhang')
      .select('ma_kh')
      .eq('ma_tk', maTk)
      .maybeSingle();

    if (!kh?.ma_kh) return false;

    const maSoDo = parseInt(profileId.replace('sodo_', ''), 10);
    const { error } = await supabase
      .from('sodocothe')
      .delete()
      .eq('ma_so_do', maSoDo)
      .eq('ma_kh', kh.ma_kh);

    return !error;
  } catch (err) {
    console.error('Lỗi xóa hồ sơ số đo trên Supabase:', err);
    return false;
  }
};



