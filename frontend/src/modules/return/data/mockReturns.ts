import { ReturnRequest, CancellationRequest } from '@/types';

export const mockReturnRequests: ReturnRequest[] = [
  {
    id: 'RET-1001',
    orderId: 'BS-84920',
    customerName: 'Trần Minh Anh',
    customerPhone: '0912345678',
    type: 'exchange_size',
    productId: 'prod-1',
    productName: 'Áo Sơ Mi Oxford Form Rộng Tôn Dáng',
    productImage: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80',
    currentSize: '2XL',
    requestedSize: '3XL',
    reason: 'too_tight',
    reasonDetail: 'Vòng bụng hơi kích khi ngồi làm việc văn phòng, tôi muốn đổi lên size 3XL để mặc thoải mái hơn.',
    images: [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&auto=format&fit=crop&q=80'
    ],
    createdAt: '2026-10-04 10:30',
    status: 'pending_review',
    adminNote: 'Khách hàng thân thiết, sẵn sàng đổi size 3XL miễn phí vận chuyển 2 chiều.'
  },
  {
    id: 'RET-1002',
    orderId: 'BS-65231',
    customerName: 'Lê Hoàng Nam',
    customerPhone: '0934567890',
    type: 'return_refund',
    productId: 'prod-4',
    productName: 'Áo Thun Cổ Tròn Dáng Rộng Giấu Khuyết Điểm',
    productImage: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    currentSize: '4XL',
    reason: 'too_loose',
    reasonDetail: 'Áo quá rộng so với mong đợi, muốn trả lại sản phẩm và nhận hoàn tiền.',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80'
    ],
    createdAt: '2026-10-02 14:15',
    status: 'approved',
    adminNote: 'Đã duyệt yêu cầu hoàn tiền 320.000đ. Đang chờ bưu tá GHN thu hồi sản phẩm về kho.',
    refundAmount: 320000
  }
];

export const mockCancellationRequests: CancellationRequest[] = [];

