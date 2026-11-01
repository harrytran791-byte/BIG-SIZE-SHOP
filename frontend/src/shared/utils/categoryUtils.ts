import type { Product, SupabaseCategory } from '@/shared/types';

export function categoryKey(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function findCategory(categories: SupabaseCategory[], key: string): SupabaseCategory | undefined {
  const aliases: Record<string, string> = { quan: 'quan-jeans', dam: 'dam-vay', dobo: 'do-bo', 'ao-thun': 'ao' };
  const normalized = aliases[categoryKey(key)] || categoryKey(key);
  return categories.find(c => String(c.ma_danh_muc) === key || categoryKey(c.code || c.ten_danh_muc) === normalized);
}

export function categoryPath(categoryId: number, categories: SupabaseCategory[]): number[] {
  const path: number[] = [];
  let id: number | null | undefined = categoryId;
  while (id && !path.includes(id)) {
    path.push(id);
    id = categories.find(c => c.ma_danh_muc === id)?.ma_danh_muc_cha;
  }
  return path;
}

export function matchesCatalogCategory(product: Product, key: string, categories: SupabaseCategory[]): boolean {
  if (key === 'all' || key === 'tat-ca') return true;
  const category = findCategory(categories, key);
  if (!category || !product.categoryId) return false;
  return categoryPath(product.categoryId, categories).includes(category.ma_danh_muc);
}
