import { supabase } from './supabaseClient';
import { categoryKey } from '@/shared/utils/categoryUtils';
import type { Size, SupabaseCategory } from '@/shared/types';

export interface CatalogProductColor {
  name: string;
  hex?: string;
}

export interface CatalogProductInput {
  name: string;
  categoryId: number;
  description: string;
  image: string;
  price: number;
  sizes: Size[];
  color?: string;
  colors?: (string | CatalogProductColor)[];
  /** Số lượng tồn kho ban đầu cho từng biến thể theo key `${size}__${color}` hoặc `${size}_${color}` */
  variantQuantities?: Record<string, number>;
}

function resolveVariantInitialStock(
  variantQuantities: Record<string, number> | undefined,
  size: string,
  color: string,
): number {
  if (!variantQuantities) return 0;
  const cleanSize = size.trim();
  const cleanColor = color.trim();
  const val =
    variantQuantities[`${cleanSize}__${cleanColor}`] ??
    variantQuantities[`${cleanSize}_${cleanColor}`] ??
    0;
  if (!Number.isSafeInteger(val) || val < 0) {
    throw new Error(`Số lượng ban đầu của biến thể ${cleanSize} - ${cleanColor} phải là số nguyên không âm.`);
  }
  return val;
}

/**
 * Ensures a subcategory exists in `public.danhmuc` under `parentCategoryId`.
 * If it already exists, returns the existing record (activating it if inactive).
 * If not, inserts a new subcategory record linked via `ma_danh_muc_cha = parentCategoryId`.
 */
export async function ensureCatalogSubcategory(
  name: string,
  parentCategoryId: number,
  client = supabase,
): Promise<SupabaseCategory> {
  const cleanName = name.trim();
  if (!cleanName || !Number.isSafeInteger(parentCategoryId) || parentCategoryId <= 0) {
    throw new Error('Thông tin Danh mục và Phân loại không hợp lệ.');
  }
  const targetKey = categoryKey(cleanName);

  const { data: existingList, error: fetchErr } = await client
    .from('danhmuc')
    .select('*')
    .eq('ma_danh_muc_cha', parentCategoryId);

  if (fetchErr) throw fetchErr;

  const matched = (existingList || []).find(
    (c: any) =>
      categoryKey(c.ten_danh_muc || '') === targetKey ||
      categoryKey(c.code || '') === targetKey,
  );

  if (matched) {
    if (matched.trang_thai !== 'hoat_dong') {
      const { data: activated, error: actErr } = await client
        .from('danhmuc')
        .update({ trang_thai: 'hoat_dong' })
        .eq('ma_danh_muc', matched.ma_danh_muc)
        .select('*')
        .single();
      if (!actErr && activated) return activated as SupabaseCategory;
    }
    return matched as SupabaseCategory;
  }

  const baseCode = targetKey.toUpperCase().replace(/-/g, '_') || 'PHAN_LOAI';
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = attempt === 0 ? `${baseCode}_${parentCategoryId}` : `${baseCode}_${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await client
      .from('danhmuc')
      .insert({
        code,
        ten_danh_muc: cleanName,
        mo_ta: `Phân loại ${cleanName}`,
        ma_danh_muc_cha: parentCategoryId,
        trang_thai: 'hoat_dong',
      })
      .select('*')
      .single();
    if (!error && data) return data as SupabaseCategory;
    if (error && !/duplicate|unique/i.test(error.message)) throw error;
  }
  throw new Error('Không thể khởi tạo phân loại danh mục trong cơ sở dữ liệu.');
}

export const catalogErrorMessage = (error: unknown): string => {
  const code = (error as { code?: string })?.code;
  if (code === '23505') return 'Thông tin đã tồn tại. Vui lòng tải lại và kiểm tra trước khi lưu.';
  if (code === '23503') return 'Danh mục hoặc phân loại đã thay đổi. Vui lòng tải lại danh sách.';
  if (code === '42501' || code === 'PGRST301') return 'Phiên đăng nhập không có quyền lưu thay đổi này.';
  return 'Chưa lưu đầy đủ thay đổi. Vui lòng kiểm tra kết nối và thử lại; biểu mẫu được giữ nguyên.';
};

export function requireSavedRows<T>(result: { data: T[] | null; error: unknown }, expected?: number): T[] {
  if (result.error) throw result.error;
  if (!result.data?.length || (expected !== undefined && result.data.length !== expected)) {
    throw new Error('Không xác nhận được số bản ghi đã lưu');
  }
  return result.data;
}

/** A failed new product stays unpublished. Retrying resumes the same draft ID. */
export async function saveCatalogProduct(
  input: CatalogProductInput,
  options: { productId?: number; draftId?: number; onDraftCreated: (id: number) => void },
  client = supabase,
): Promise<number> {
  if (
    !input.name.trim() ||
    input.name.length > 200 ||
    !Number.isSafeInteger(input.categoryId) ||
    input.categoryId <= 0 ||
    !Number.isFinite(input.price) ||
    input.price <= 0 ||
    input.price > 9999999999.99 ||
    !input.sizes.length ||
    input.sizes.some(size => !['XL', '2XL', '3XL', '4XL', '5XL'].includes(size)) ||
    input.description.length > 10000 ||
    !input.image.trim() ||
    !/^(https?:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(input.image)
  ) {
    throw new Error('Thông tin sản phẩm chưa hợp lệ');
  }

  if (input.variantQuantities) {
    for (const [key, qty] of Object.entries(input.variantQuantities)) {
      if (!Number.isSafeInteger(qty) || qty < 0) {
        throw new Error(`Số lượng tồn kho ban đầu không hợp lệ (${key}). Chỉ chấp nhận số nguyên không âm.`);
      }
    }
  }

  const rawColors: string[] = [];
  if (Array.isArray(input.colors) && input.colors.length > 0) {
    for (const c of input.colors) {
      const name = typeof c === 'string' ? c.trim() : (c?.name || '').trim();
      if (name && !rawColors.includes(name)) rawColors.push(name);
    }
  } else if (typeof input.color === 'string' && input.color.trim()) {
    rawColors.push(input.color.trim());
  }

  const isNew = !options.productId;
  if (isNew) {
    if (rawColors.length === 0) throw new Error('Vui lòng nhập màu sắc sản phẩm');
    if (rawColors.some(c => c.length > 50)) throw new Error('Tên màu sắc không được vượt quá 50 ký tự');
  }

  let id = options.productId || options.draftId;
  const fields = {
    ten_sp: input.name.trim(),
    mo_ta: input.description.trim(),
    hinh_anh: input.image,
    ma_danh_muc: input.categoryId,
  };

  if (!id) {
    const [row] = requireSavedRows(
      await client.from('sanpham').insert({ ...fields, trang_thai: 'ngung_kinh_doanh' }).select('ma_sp'),
      1,
    );
    id = row.ma_sp;
    if (!id) throw new Error('Không xác nhận được sản phẩm');
    options.onDraftCreated(id);
  } else {
    requireSavedRows(await client.from('sanpham').update(fields).eq('ma_sp', id).select('ma_sp'), 1);
  }
  if (!id) throw new Error('Không xác nhận được sản phẩm');

  const nowIso = new Date().toISOString();

  if (isNew) {
    try {
      const sizes = [...new Set(input.sizes)];
      const rows = requireSavedRows(
        await client
          .from('bangsize')
          .upsert(
            sizes.map(kich_co => ({ ma_sp: id, kich_co })),
            { onConflict: 'ma_sp,kich_co' },
          )
          .select('ma_bang_size,kich_co'),
        sizes.length,
      );

      // Clear any previous unpublished draft variants for this draft ID so retries never duplicate or leave stale SKUs
      const clearDraftVariants = await client.from('chitietsanpham').delete().eq('ma_sp', id);
      if (clearDraftVariants.error) throw clearDraftVariants.error;

      const variantsToInsert: {
        ma_sp: number;
        ma_bang_size: number;
        sku: string;
        mau_sac: string;
        don_gia: number;
        so_luong_ton: number;
        so_luong_giu: number;
        ngay_kiem_ke: string;
        trang_thai: string;
      }[] = [];

      rows.forEach(row => {
        rawColors.forEach((color, idx) => {
          const skuSuffix = rawColors.length === 1 ? '01' : String(idx + 1).padStart(2, '0');
          const initialQty = resolveVariantInitialStock(input.variantQuantities, row.kich_co, color);
          variantsToInsert.push({
            ma_sp: id as number,
            ma_bang_size: row.ma_bang_size,
            sku: `SP${id}-${row.kich_co}-${skuSuffix}`,
            mau_sac: color,
            don_gia: input.price,
            so_luong_ton: initialQty,
            so_luong_giu: 0,
            ngay_kiem_ke: nowIso,
            trang_thai: 'dang_kinh_doanh',
          });
        });
      });

      if (variantsToInsert.length) {
        requireSavedRows(
          await client.from('chitietsanpham').insert(variantsToInsert).select('ma_ctsp'),
          variantsToInsert.length,
        );
      }

      requireSavedRows(
        await client
          .from('sanpham')
          .update({ trang_thai: 'dang_kinh_doanh' })
          .eq('ma_sp', id)
          .select('ma_sp'),
        1,
      );
    } catch (err) {
      // Rollback any partial chitietsanpham rows for the unpublished draft so inventory is never polluted
      await client.from('chitietsanpham').delete().eq('ma_sp', id);
      throw err;
    }
  } else if (input.sizes?.length && rawColors.length > 0) {
    const sizes = [...new Set(input.sizes)];
    const rows = requireSavedRows(
      await client
        .from('bangsize')
        .upsert(
          sizes.map(kich_co => ({ ma_sp: id, kich_co })),
          { onConflict: 'ma_sp,kich_co' },
        )
        .select('ma_bang_size,kich_co'),
      sizes.length,
    );

    const existing = await client.from('chitietsanpham').select('ma_bang_size, mau_sac').eq('ma_sp', id);
    if (!existing.error && existing.data) {
      const existingKeys = new Set(existing.data.map(row => `${row.ma_bang_size}_${(row.mau_sac || '').trim()}`));
      const missing: {
        ma_sp: number;
        ma_bang_size: number;
        sku: string;
        mau_sac: string;
        don_gia: number;
        so_luong_ton: number;
        so_luong_giu: number;
        ngay_kiem_ke: string;
        trang_thai: string;
      }[] = [];
      rows.forEach(row => {
        rawColors.forEach(color => {
          const key = `${row.ma_bang_size}_${color}`;
          if (!existingKeys.has(key)) {
            const skuSuffix = String(existing.data.length + missing.length + 1).padStart(2, '0');
            const initialQty = resolveVariantInitialStock(input.variantQuantities, row.kich_co, color);
            missing.push({
              ma_sp: id as number,
              ma_bang_size: row.ma_bang_size,
              sku: `SP${id}-${row.kich_co}-${skuSuffix}`,
              mau_sac: color,
              don_gia: input.price,
              so_luong_ton: initialQty,
              so_luong_giu: 0,
              ngay_kiem_ke: nowIso,
              trang_thai: 'dang_kinh_doanh',
            });
          }
        });
      });
      if (missing.length) {
        requireSavedRows(await client.from('chitietsanpham').insert(missing).select('ma_ctsp'), missing.length);
      }
    }

    requireSavedRows(
      await client
        .from('chitietsanpham')
        .update({
          don_gia: input.price,
        })
        .eq('ma_sp', id)
        .select('ma_ctsp'),
    );
  }

  return id;
}

export async function updateCatalogPrice(productId: string, price: number, client = supabase): Promise<void> {
  const match = /^prod-0(\d+)$/.exec(productId);
  if (!match || !Number.isFinite(price) || price <= 0) throw new Error('Thông tin giá chưa hợp lệ');
  requireSavedRows(
    await client.from('chitietsanpham').update({ don_gia: price }).eq('ma_sp', Number(match[1])).select('ma_ctsp'),
  );
}
