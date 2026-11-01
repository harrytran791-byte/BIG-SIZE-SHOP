import { StockItem, StockAuditSchedule, StockAuditRecord, StockAdjustmentLog } from '@/types';
import { mockProducts } from '@/modules/product/data/products';

// Seed initial inventory from products variants
export const initialInventory: StockItem[] = [];

mockProducts.forEach((product) => {
  product.sizes.forEach((size) => {
    // Generate some interesting stock levels
    let qty = 15;
    if (size === '3XL') qty = 4; // Low stock alert!
    if (size === '5XL') qty = 2; // Very low stock!
    if (size === '4XL') qty = 8;
    if (size === 'XL') qty = 22;
    if (size === '2XL') qty = 18;

    const sku = `${product.id.toUpperCase()}-${size}`;
    initialInventory.push({
      id: `stock_${product.id}_${size}`,
      productId: product.id,
      productName: product.name,
      productImage: product.images[0],
      category: product.category,
      size,
      color: product.colors[0]?.name || 'Tiêu chuẩn',
      sku,
      quantity: qty,
      heldQuantity: 0,
      lowStockThreshold: 5,
      unitCost: Math.round(product.price * 0.45),
      sellingPrice: product.price,
      status: qty <= 0 ? 'out_of_stock' : qty <= 5 ? 'low_stock' : 'in_stock',
      updatedAt: '2026-10-05 08:30:00'
    });
  });
});

export const mockAuditSchedules: StockAuditSchedule[] = [
  {
    id: 'AUD-2026-W40',
    title: 'Kiểm kê định kỳ Kho Áo sơ mi & Quần Tây Tuần 40',
    period: 'weekly',
    assignedTo: 'Nguyễn Kiều Duyên (Manager)',
    scheduledDate: '2026-10-06',
    status: 'pending',
    notes: 'Tập trung đối soát các mã size lớn 3XL-5XL có tỷ lệ bán nhanh.'
  },
  {
    id: 'AUD-2026-M09',
    title: 'Kiểm kê tổng kết toàn bộ kho hàng Tháng 9/2026',
    period: 'monthly',
    assignedTo: 'Quốc Khánh & Kiều Duyên',
    scheduledDate: '2026-09-30',
    status: 'completed',
    notes: 'Đã hoàn tất đối chiếu và cân bằng số liệu trên hệ thống.'
  }
];

export const mockAuditRecords: StockAuditRecord[] = [
  {
    id: 'REC-01',
    auditScheduleId: 'AUD-2026-M09',
    sku: 'PROD-1-3XL',
    productName: 'Áo Sơ Mi Oxford Form Rộng Tôn Dáng',
    size: '3XL',
    systemQuantity: 10,
    actualQuantity: 8,
    difference: -2,
    reason: 'May mẫu chụp lookbook & 1 áo bị lỗi chỉ may',
    auditedBy: 'Quốc Khánh',
    auditedAt: '2026-09-30 16:45',
    status: 'approved'
  },
  {
    id: 'REC-02',
    auditScheduleId: 'AUD-2026-M09',
    sku: 'PROD-2-4XL',
    productName: 'Quần Tây Âu Co Giãn Công Thái Học',
    size: '4XL',
    systemQuantity: 6,
    actualQuantity: 6,
    difference: 0,
    reason: 'Khớp số liệu 100%',
    auditedBy: 'Quốc Khánh',
    auditedAt: '2026-09-30 17:00',
    status: 'approved'
  }
];

export const mockAdjustmentLogs: StockAdjustmentLog[] = [
  {
    id: 'LOG-001',
    sku: 'PROD-1-3XL',
    productName: 'Áo Sơ Mi Oxford Form Rộng Tôn Dáng',
    size: '3XL',
    changeType: 'adjust',
    quantityChange: -2,
    previousQuantity: 10,
    newQuantity: 8,
    reason: 'Hư hỏng 1 cái và lấy làm mẫu may 1 cái',
    performedBy: 'Nguyễn Kiều Duyên',
    timestamp: '2026-10-01 09:15'
  },
  {
    id: 'LOG-002',
    sku: 'PROD-3-2XL',
    productName: 'Đầm Maxi Dáng Suông Che Khuyết Điểm',
    size: '2XL',
    changeType: 'in',
    quantityChange: 15,
    previousQuantity: 5,
    newQuantity: 20,
    reason: 'Nhập lô hàng may mới từ xưởng may ngoại cỡ',
    performedBy: 'Nguyễn Kiều Duyên',
    timestamp: '2026-10-03 14:30'
  }
];
