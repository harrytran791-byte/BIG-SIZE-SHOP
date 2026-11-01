export type BigSize = 'XL' | '2XL' | '3XL' | '4XL' | '5XL';

export interface ProductVariant {
  id: number;
  product_id: number;
  size: BigSize;
  color: string;
  stock_quantity: number;
  sku: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  category_id?: number;
  price: number;
  original_price?: number;
  description?: string;
  fabric_details?: string;
  images: string[];
  is_active: boolean;
  variants?: ProductVariant[];
  created_at: Date;
  updated_at: Date;
}
