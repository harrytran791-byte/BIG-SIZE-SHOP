export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  image: string;
  content: string[];
}

export const mockBlogPosts: BlogPost[] = [
  {
    id: 'b1',
    title: '5 Quy Tắc Vàng Khi Chọn Áo Sơ Mi Cho Nam Giới Bụng Bia & Vai Đô',
    slug: '5-quy-tac-chon-so-mi-nam-bung-bia',
    excerpt: 'Đừng mặc áo quá rộng thùng thình, hãy tập trung vào cổ áo, độ dài vạt bầu và chất liệu dệt chéo chống bám dính.',
    category: 'Mẹo Phối Đồ Nam',
    readTime: '4 phút đọc',
    date: '02/10/2026',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80',
    content: [
      'Nhiều anh em thường nghĩ rằng cơ thể mũm mĩm thì cứ mua áo thật rộng thùng thình là che được khuyết điểm. Thực tế, điều này lại càng khiến bạn trông nặng nề và thấp hơn.',
      '1. Chọn cổ áo cứng cáp (như Button-down hoặc Cutaway) để tạo khung nâng đỡ gương mặt thon gọn hơn.',
      '2. Vạt áo bầu nhẹ: Giúp bạn thoải mái bỏ áo ngoài quần mà trông chân vẫn dài.',
      '3. Tránh xa vải quá mỏng bóng: Vải Oxford hoặc Poplin pha Spandex có mật độ sợi dày sẽ giữ phom đứng áo và không lộ viền mỡ thừa.'
    ]
  },
  {
    id: 'b2',
    title: 'Bí Quyết Hack Dáng Cho Nàng Curvy: Tự Tin Tỏa Sáng Với Đầm Chữ A & Cổ Tim',
    slug: 'bi-quyet-hack-dang-cho-nang-curvy',
    excerpt: 'Tôn vinh vòng một quyến rũ, kéo dài tỉ lệ đôi chân và che trọn bụng dưới chỉ với những đường cắt khéo léo.',
    category: 'Thời Trang Nữ',
    readTime: '5 phút đọc',
    date: '28/09/2026',
    image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80',
    content: [
      'Vẻ đẹp đầy đặn mang nét nữ tính quyến rũ độc đáo nếu bạn biết cách làm nổi bật những ưu điểm của cơ thể.',
      '1. Chiết eo cao trên rốn: Điểm vàng phân chia tỉ lệ 1/3 và 2/3 hoàn hảo.',
      '2. Đường xòe tự nhiên chữ A: Giúp giấu nhẹm phần đùi to và hông đầy đặn một cách tự nhiên nhất.',
      '3. Tay lỡ hoặc cánh tiên: Bảo bối che khuyết điểm bắp tay to được hàng ngàn chị em tin tưởng.'
    ]
  },
  {
    id: 'b3',
    title: 'Tại Sao Cạp Chun Ẩn Là Cuộc Cách Mạng Cho Quần Jeans Ngoại Cỡ?',
    slug: 'tai-sao-cap-chun-an-la-cuoc-cach-mang',
    excerpt: 'Tìm hiểu công nghệ cạp lưng thông minh co giãn thêm 5-7cm khi ngồi, giải phóng hoàn toàn cảm giác thít bụng tức thở.',
    category: 'Chất Liệu & Công Nghệ',
    readTime: '3 phút đọc',
    date: '25/09/2026',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=80',
    content: [
      'Những ai từng mặc quần jeans truyền thống cỡ lớn đều thấu hiểu cảm giác đứng thì vừa nhưng ngồi xuống thì cạp quần cấn sâu vào bụng.',
      'Với dải chun co giãn ẩn bên trong đai lưng, chiếc quần có thể biến thiên linh hoạt theo từng tư thế cơ thể mà vẫn giữ được vẻ ngoài sang trọng của một chiếc quần jeans cao cấp.'
    ]
  }
];
