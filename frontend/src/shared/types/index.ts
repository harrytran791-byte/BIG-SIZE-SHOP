export type Size = 'XL' | '2XL' | '3XL' | '4XL' | '5XL';

export type Category = 'ao' | 'ao-thun' | 'so-mi' | 'quan-jeans' | 'dam-vay' | 'ao-khoac' | 'do-bo' | string;

export interface SupabaseCategory {
  ma_danh_muc: number;
  code: string;
  ten_danh_muc: string;
  mo_ta?: string | null;
  ma_danh_muc_cha?: number | null;
  trang_thai: string;
}

export type Gender = 'nam' | 'nu' | 'unisex';

export interface ProductVariant {
  id: string;
  size: Size;
  colorName: string;
  colorHex: string;
  stock: number; // 0 means out of stock
  sku: string;
}

export interface SizeMeasurement {
  size: Size;
  heightRange: string; // e.g., "165-175 cm"
  weightRange: string; // e.g., "75-85 kg"
  chest: string; // cm (e.g., "102-108")
  waist: string; // cm (e.g., "90-96")
  hips: string; // cm (e.g., "104-110")
  shoulder?: string;
  length?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: Category;
  categoryId?: number;
  parentCategoryId?: number;
  categoryName?: string;
  parentCategoryName?: string;
  gender: Gender;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  importPrice?: number;
  rating: number;
  ratingCount: number;
  shortDesc: string;
  description: string;
  material: string;
  careInstructions: string[];
  features: string[];
  images: string[];
  colors: { name: string; hex: string }[];
  sizes: Size[];
  variants: ProductVariant[];
  sizeChart: SizeMeasurement[];
  isNew?: boolean;
  isBestSeller?: boolean;
  tags: string[];
}

export interface CartItem {
  sku?: string;
  orderItemId?: number;
  id: string; // unique item cart id: productId_size_color
  productId: string;
  product: Product;
  size: Size;
  colorName: string;
  colorHex: string;
  quantity: number;
  price: number;
}

export type VoucherType = 'discount' | 'shipping';

export interface Voucher {
  id?: number | string;
  code: string;
  name?: string;
  voucherType?: VoucherType; // 'discount' (giảm giá tiền hàng) | 'shipping' (hỗ trợ phí vận chuyển)
  discountType: 'percent' | 'fixed';
  discountValue: number; // e.g. 10 for 10%, or 50000 for 50,000 VND
  maxDiscount?: number;
  minOrderValue: number;
  description: string;
  status?: string;
  startsAt?: string;
  expiresAt?: string;
}

export interface BodyProfile {
  id: string;
  name: string; // e.g. "Cá nhân", "Bạn bè", "Anh Tuấn"
  isDefault?: boolean;
  gender: Gender;
  height: number; // cm
  weight: number; // kg
  chest: number; // cm (ngực)
  waist: number; // cm (eo)
  hips: number; // cm (mông)
  shoulder?: number; // cm (vai)
  fitPreference: 'snug' | 'regular' | 'loose'; // Ôm nhẹ | Vừa vặn | Thoải mái rộng rãi
  notes?: string;
  age?: number;
  relationship?: string;
  bodyFeature?: string;
  subInfo?: string;
}

export interface SizeRecommendation {
  recommendedSize: Size;
  alternativeSize?: Size;
  confidenceScore: number; // 0 - 100%
  fitType: 'snug' | 'regular' | 'loose';
  reason: string;
  measurementComparison: {
    part: string;
    userValue: number;
    recommendedRange: string;
    status: 'perfect' | 'tight' | 'loose';
  }[];
}

export type OrderStatus = 'placed' | 'confirmed' | 'preparing' | 'shipping' | 'delivered' | 'cancelled';

export interface OrderTimelineStep {
  status: OrderStatus;
  label: string;
  time?: string;
  description: string;
  completed: boolean;
  current: boolean;
}

export interface ShippingAddress {
  id?: string;
  fullName: string;
  phone: string;
  email: string;
  province: string;
  district: string;
  ward: string;
  addressDetail: string;
  note?: string;
  isDefault?: boolean;
  label?: string; // 'Nhà riêng', 'Văn phòng'
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export interface Order {
  id: string; // BS-XXXXX
  createdAt: string;
  createdAtTimestamp?: string;
  status: OrderStatus;
  items: CartItem[];
  shippingAddress: ShippingAddress;
  shippingMethod: 'standard' | 'express';
  shippingFee: number;
  paymentMethod: 'cod' | 'vietqr' | 'momo' | 'vnpay';
  paymentStatus: PaymentStatus;
  paymentResponseCode?: string;
  paymentTransactionNo?: string;
  stockHoldStatus?: 'Hold' | 'Reserved' | 'Released' | 'Deducted' | string;
  holdExpiresAt?: string;
  customerId?: number;
  subtotal: number;
  discountAmount: number;
  voucherCode?: string;
  total: number;
  timeline: OrderTimelineStep[];
  deliveredAt?: string;
  // 3PL Carrier Details
  trackingCode?: string;
  carrier?: 'GHTK' | 'GHN' | 'ViettelPost';
  // Module 7: After-sales & Cancellation
  cancellationReason?: string;
  cancellationStatus?: 'none' | 'requested' | 'approved' | 'rejected';
  returnStatus?: 'none' | 'requested' | 'approved' | 'received' | 'exchanged' | 'refunded';
  // Aliases & Database Cross-Reference
  clientCode?: string;
  maHd?: number;
  // Invoice Email Option
  wantInvoice?: boolean;
  invoiceEmail?: string;
  notes?: string;
  note?: string;
  yeuCauDiaChi?: {
    trang_thai?: 'cho_xu_ly' | 'da_hoan_tat';
    ly_do?: string;
    ngay_gui?: string;
    ngay_cap_nhat?: string;
    vnpay_status?: string;
    vnp_response_code?: string;
    vnp_transaction_no?: string;
    hold_expires_at?: string;
  };
}

// ==========================================
// MODULE 1: AUTH & USER MANAGEMENT
// ==========================================
export type UserRole = 'guest' | 'customer' | 'manager' | 'admin';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'locked';
  avatar?: string;
  createdAt: string;
  addresses: ShippingAddress[];
  authProvider?: 'google' | 'local';
  hasCustomPassword?: boolean;
  gender?: 'male' | 'female' | 'other' | string;
  birthday?: string;
}

// ==========================================
// MODULE 5: INVENTORY MANAGEMENT
// ==========================================
export interface StockItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  category: Category;
  size: Size;
  color: string;
  sku: string;
  quantity: number;
  heldQuantity: number; // Held during pending checkout
  lowStockThreshold: number; // default: 5
  unitCost: number;
  sellingPrice: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  updatedAt: string;
}

export interface StockAuditSchedule {
  id: string;
  title: string;
  period: 'weekly' | 'monthly' | 'quarterly';
  assignedTo: string;
  scheduledDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

export interface StockAuditRecord {
  id: string;
  auditScheduleId?: string;
  sku: string;
  productName: string;
  size: Size;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  reason?: string;
  auditedBy: string;
  auditedAt: string;
  status: 'pending_review' | 'approved' | 'rejected';
}

export interface StockAdjustmentLog {
  id: string;
  sku: string;
  productName: string;
  size: Size;
  changeType: 'in' | 'out' | 'adjust' | 'hold' | 'release';
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  performedBy: string;
  timestamp: string;
}

// ==========================================
// MODULE 6: PAYMENT & 3PL CARRIER
// ==========================================
export interface PaymentTransaction {
  id: string;
  orderId: string;
  method: 'vietqr' | 'momo' | 'vnpay' | 'card' | 'cod';
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  qrUrl?: string;
  createdAt: string;
  holdExpiresAt?: string;
  refundedAt?: string;
  refundReason?: string;
}

export interface CarrierShipment {
  orderId: string;
  trackingCode: string;
  carrier: 'GHTK' | 'GHN' | 'ViettelPost';
  estimatedDelivery: string;
  currentLocation: string;
  status: 'created' | 'picked_up' | 'in_transit' | 'delivering' | 'delivered';
  events: {
    timestamp: string;
    location: string;
    note: string;
  }[];
}

// ==========================================
// MODULE 7: AFTER-SALES & RETURNS
// ==========================================
export type ReturnReason = 'too_tight' | 'too_loose' | 'wrong_item' | 'defective' | 'other';

export interface ReturnItemInfo {
  returnDetailId?: number;
  inspected?: boolean;
  orderItemId?: number;
  sku?: string;
  productId: string;
  productName: string;
  productImage: string;
  currentSize: Size;
  requestedSize?: Size;
  quantity: number;
  reason?: ReturnReason;
  reasonDetail?: string;
  price?: number;
}

export interface ReturnRequest {
  id: string; // e.g. RET-1001
  orderId: string;
  customerName: string;
  customerPhone: string;
  type: 'exchange_size' | 'return_refund';
  productId: string;
  productName: string;
  productImage: string;
  currentSize: Size;
  requestedSize?: Size;
  items?: ReturnItemInfo[];
  reason: ReturnReason;
  reasonDetail: string;
  images: string[];
  videoUrl?: string;
  createdAt: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'received_goods' | 'exchange_sent' | 'refunded';
  adminNote?: string;
  refundAmount?: number;
  newTrackingCode?: string;
  recoveryInfo?: {
    state?: string;
    note?: string;
    at?: string;
    source?: string;
  };
}

export interface CancellationRequest {
  id: string;
  orderId: string;
  customerName: string;
  reason: string;
  createdAt: string;
  status: 'pending_review' | 'approved' | 'rejected';
  refundStatus: 'none' | 'pending' | 'completed' | 'unknown';
  adminNote?: string;
}
