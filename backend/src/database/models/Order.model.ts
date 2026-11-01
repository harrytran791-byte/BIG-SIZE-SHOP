export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  variant_id?: number;
  product_name: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  total_price: number;
}

export interface Order {
  id: number;
  order_code: string;
  user_id?: number;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  total_amount: number;
  shipping_fee: number;
  discount_amount: number;
  payment_method: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  tracking_code?: string;
  carrier?: string;
  notes?: string;
  items?: OrderItem[];
  created_at: Date;
  updated_at: Date;
}
