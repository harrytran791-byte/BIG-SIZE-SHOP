export interface FaqItem {
  id: string;
  category: 'size' | 'exchange' | 'shipping' | 'general';
  question: string;
  answer: string;
}

export const mockFaqList: FaqItem[] = [
  // Sizing FAQs
  {
    id: 'f1',
    category: 'size',
    question: 'Làm sao để biết tôi nên mặc size 2XL hay 3XL?',
    answer: 'Bạn chỉ cần sử dụng công cụ "Tìm size của tôi" trên website, nhập Chiều cao, Cân nặng và số đo Ngực/Bụng. Hệ thống sẽ so khớp chính xác với bảng số đo cắt may của từng sản phẩm. Nếu số đo nằm ở ranh giới 2 size và bạn thích mặc vừa vặn, hãy chọn size nhỏ hơn; nếu muốn thoải mái giấu bụng, hãy chọn size lớn hơn.'
  },
  {
    id: 'f2',
    category: 'size',
    question: 'Bảng size của shop là phom Việt Nam hay phom Quốc Tế (US/EU)?',
    answer: 'Bảng size của chúng tôi được nghiên cứu và may đo độc quyền theo chuẩn thể trạng người Việt (Asian Plus-Size Fit): chiều dài áo/quần được cắt vừa vặn không bị thừa dài, trong khi vòng ngực, bụng và bắp tay được nới rộng tối đa.'
  },
  {
    id: 'f3',
    category: 'size',
    question: 'Tôi nặng 115kg, cao 1m72 thì có size vừa không?',
    answer: 'Dạ hoàn toàn vừa vặn! Với thể trạng này, bạn thường sẽ mặc rất đẹp size 4XL hoặc 5XL tùy thuộc vào sở thích mặc ôm nhẹ hay thoải mái. Tất cả sản phẩm đều hỗ trợ dải size đến 5XL (tối đa 135-140kg).'
  },

  // Exchange FAQs
  {
    id: 'f4',
    category: 'exchange',
    question: 'Chính sách đổi size nếu mặc không vừa như thế nào?',
    answer: 'Chúng tôi hỗ trợ đổi size miễn phí tận nhà trong vòng 7 ngày kể từ khi nhận hàng. Shipper sẽ mang size mới đến tận cửa và thu hồi sản phẩm cũ cùng lúc, bạn không cần phải ra bưu cục gửi hàng.'
  },
  {
    id: 'f5',
    category: 'exchange',
    question: 'Sản phẩm đổi cần đáp ứng điều kiện gì?',
    answer: 'Sản phẩm còn nguyên tem mác, chưa qua giặt ủi và không có mùi lạ. Quý khách vui lòng giữ lại hóa đơn hoặc tin nhắn xác nhận đơn hàng khi shipper đến hỗ trợ đổi hàng.'
  },

  // Shipping FAQs
  {
    id: 'f6',
    category: 'shipping',
    question: 'Thời gian giao hàng mất bao lâu?',
    answer: 'Nội thành TP.HCM và Hà Nội: 1 - 2 ngày làm việc (hỗ trợ giao hỏa tốc 4h). Các tỉnh thành khác: 2 - 4 ngày làm việc qua đối tác vận chuyển GHTK/GHN.'
  },
  {
    id: 'f7',
    category: 'shipping',
    question: 'Tôi có được kiểm tra và thử hàng trước khi thanh toán không?',
    answer: 'Quý khách được quyền đồng kiểm (kiểm tra đúng mẫu, đúng màu, đúng size và chất lượng đường may) trước khi thanh toán cho shipper.'
  }
];
