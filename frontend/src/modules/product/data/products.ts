import { Product, SizeMeasurement, Voucher } from '@/types';

// Standardized Base Size Chart for Men's Tops & Shirts
const mensTopSizeChart: SizeMeasurement[] = [
  { size: 'XL', heightRange: '165 - 175 cm', weightRange: '75 - 84 kg', chest: '102 - 108', waist: '90 - 96', hips: '100 - 106', shoulder: '47 - 49', length: '73' },
  { size: '2XL', heightRange: '170 - 180 cm', weightRange: '85 - 94 kg', chest: '109 - 116', waist: '97 - 104', hips: '107 - 114', shoulder: '50 - 52', length: '75' },
  { size: '3XL', heightRange: '172 - 185 cm', weightRange: '95 - 106 kg', chest: '117 - 126', waist: '105 - 114', hips: '115 - 124', shoulder: '53 - 55', length: '77' },
  { size: '4XL', heightRange: '175 - 190 cm', weightRange: '107 - 120 kg', chest: '127 - 138', waist: '115 - 126', hips: '125 - 136', shoulder: '56 - 58', length: '79' },
  { size: '5XL', heightRange: '175 - 195 cm', weightRange: '121 - 138 kg', chest: '139 - 150', waist: '127 - 138', hips: '137 - 148', shoulder: '59 - 61', length: '81' },
];

// Standardized Base Size Chart for Pants & Jeans
const pantsSizeChart: SizeMeasurement[] = [
  { size: 'XL', heightRange: '165 - 175 cm', weightRange: '75 - 84 kg', chest: '102 - 108', waist: '90 - 96', hips: '102 - 108', length: '100' },
  { size: '2XL', heightRange: '170 - 180 cm', weightRange: '85 - 94 kg', chest: '109 - 116', waist: '97 - 104', hips: '109 - 115', length: '102' },
  { size: '3XL', heightRange: '172 - 185 cm', weightRange: '95 - 106 kg', chest: '117 - 126', waist: '105 - 114', hips: '116 - 124', length: '104' },
  { size: '4XL', heightRange: '175 - 190 cm', weightRange: '107 - 120 kg', chest: '127 - 138', waist: '115 - 126', hips: '125 - 134', length: '105' },
  { size: '5XL', heightRange: '175 - 195 cm', weightRange: '121 - 138 kg', chest: '139 - 150', waist: '127 - 138', hips: '135 - 146', length: '106' },
];

// Standardized Base Size Chart for Women's Dresses & Tops
const womensDressSizeChart: SizeMeasurement[] = [
  { size: 'XL', heightRange: '155 - 165 cm', weightRange: '68 - 77 kg', chest: '98 - 104', waist: '82 - 88', hips: '102 - 108', length: '105' },
  { size: '2XL', heightRange: '158 - 168 cm', weightRange: '78 - 87 kg', chest: '105 - 112', waist: '89 - 96', hips: '109 - 116', length: '107' },
  { size: '3XL', heightRange: '160 - 172 cm', weightRange: '88 - 98 kg', chest: '113 - 122', waist: '97 - 106', hips: '117 - 126', length: '109' },
  { size: '4XL', heightRange: '160 - 175 cm', weightRange: '99 - 112 kg', chest: '123 - 134', waist: '107 - 118', hips: '127 - 138', length: '111' },
  { size: '5XL', heightRange: '160 - 178 cm', weightRange: '113 - 130 kg', chest: '135 - 146', waist: '119 - 130', hips: '139 - 150', length: '112' },
];

export const mockProducts: Product[] = [
  {
    id: 'prod-01',
    name: 'Áo Polo Nam Big Size Dry-Tech Dệt Tổ Ong Kháng Khuẩn',
    slug: 'ao-polo-nam-big-size-dry-tech',
    category: 'ao-thun',
    gender: 'nam',
    price: 389000,
    originalPrice: 489000,
    discountPercent: 20,
    rating: 4.9,
    ratingCount: 142,
    shortDesc: 'Vải dệt Pique tổ ong co giãn 4 chiều, thiết kế nẹp cổ đứng tôn phom, giấu bụng hiệu quả.',
    description: 'Áo polo Dry-Tech được nghiên cứu riêng cho thể trạng người đầy đặn. Cổ áo dệt bo cứng cáp chống quăn, phần nách áo và ngực được nới tỷ lệ 15% so với phom chuẩn, giúp người mặc luôn thoải mái cử động khi lái xe hay ngồi làm việc mà không lộ ngấn bụng.',
    material: '92% Cotton chải kỹ, 8% Spandex kháng khuẩn Dry-Tech siêu thấm hút.',
    careInstructions: [
      'Giặt máy ở nhiệt độ thường với sản phẩm cùng màu',
      'Không dùng thuốc tẩy chứa Clo mạnh',
      'Ủi ở nhiệt độ trung bình dưới 140 độ C',
      'Phơi mặt trái trong bóng râm'
    ],
    features: [
      'Vải dệt tổ ong thoáng khí gấp 3 lần cotton thông thường',
      'Đường may giấu gấu đôi gia cố chịu lực',
      'Cắt may 3D Ergonomic giấu bụng bia khéo léo',
      'Dải size từ XL đến 5XL (75kg - 135kg)'
    ],
    images: [
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=900&auto=format&fit=crop&q=80'
    ],
    colors: [
      { name: 'Xanh Navy Đậm', hex: '#1B2A4A' },
      { name: 'Đen Tuyển', hex: '#18181B' },
      { name: 'Xám Khói Titan', hex: '#6B7280' }
    ],
    sizes: ['XL', '2XL', '3XL', '4XL', '5XL'],
    variants: [
      { id: 'v1', size: 'XL', colorName: 'Xanh Navy Đậm', colorHex: '#1B2A4A', stock: 12, sku: 'POLO-NAV-XL' },
      { id: 'v2', size: '2XL', colorName: 'Xanh Navy Đậm', colorHex: '#1B2A4A', stock: 18, sku: 'POLO-NAV-2XL' },
      { id: 'v3', size: '3XL', colorName: 'Xanh Navy Đậm', colorHex: '#1B2A4A', stock: 15, sku: 'POLO-NAV-3XL' },
      { id: 'v4', size: '4XL', colorName: 'Xanh Navy Đậm', colorHex: '#1B2A4A', stock: 8, sku: 'POLO-NAV-4XL' },
      { id: 'v5', size: '5XL', colorName: 'Xanh Navy Đậm', colorHex: '#1B2A4A', stock: 5, sku: 'POLO-NAV-5XL' },
      { id: 'v6', size: 'XL', colorName: 'Đen Tuyển', colorHex: '#18181B', stock: 20, sku: 'POLO-BLK-XL' },
      { id: 'v7', size: '2XL', colorName: 'Đen Tuyển', colorHex: '#18181B', stock: 14, sku: 'POLO-BLK-2XL' },
      { id: 'v8', size: '3XL', colorName: 'Đen Tuyển', colorHex: '#18181B', stock: 9, sku: 'POLO-BLK-3XL' },
      { id: 'v9', size: '4XL', colorName: 'Đen Tuyển', colorHex: '#18181B', stock: 4, sku: 'POLO-BLK-4XL' },
      { id: 'v10', size: '5XL', colorName: 'Đen Tuyển', colorHex: '#18181B', stock: 0, sku: 'POLO-BLK-5XL' }, // Out of stock example
      { id: 'v11', size: '3XL', colorName: 'Xám Khói Titan', colorHex: '#6B7280', stock: 7, sku: 'POLO-GRY-3XL' }
    ],
    sizeChart: mensTopSizeChart,
    isNew: true,
    isBestSeller: true,
    tags: ['Áo Polo', 'Nam', 'Dry-Tech', 'Đi làm', 'Hàng ngày']
  },
  {
    id: 'prod-02',
    name: 'Áo Sơ Mi Oxford Dài Tay Big Size Form Loose Fit Chống Nhăn',
    slug: 'ao-so-mi-oxford-dai-tay-big-size',
    category: 'so-mi',
    gender: 'nam',
    price: 450000,
    originalPrice: 550000,
    discountPercent: 18,
    rating: 4.8,
    ratingCount: 98,
    shortDesc: 'Vải sợi bông tự nhiên dệt Oxford cao cấp, cổ áo cài khuy Button-Down thanh lịch chuẩn quý ông.',
    description: 'Chiếc sơ mi Oxford công sở hoàn hảo cho nam giới từ 80kg - 135kg. Phần vạt áo bầu nhẹ tạo cảm giác thon gọn chiều cao, tay áo có 2 nấc cài cúc linh hoạt điều chỉnh vừa cổ tay người đậm người.',
    material: '100% Premium Cotton dệt cấu trúc Oxford 80s bề mặt đanh mịn.',
    careInstructions: [
      'Nên giặt chế độ nhẹ để giữ phom cổ áo bền lâu',
      'Treo áo ngay sau khi vắt để giảm nhăn tự nhiên',
      'Ủi lụa hoặc ủi hơi nước ở nhiệt độ thích hợp'
    ],
    features: [
      'Công nghệ xử lý chống nhăn Easy-Iron tiết kiệm thời gian',
      'Phom Regular Boxy không ôm sát, che bụng gọn gàng',
      'Cúc xà cừ khắc chìm cao cấp chịu nhiệt không bể vỡ'
    ],
    images: [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=900&auto=format&fit=crop&q=80'
    ],
    colors: [
      { name: 'Xanh Lam Pastel', hex: '#BFDBFE' },
      { name: 'Trắng Sữa Tinh Khôi', hex: '#F8FAFC' },
      { name: 'Sọc Xanh Classic', hex: '#60A5FA' }
    ],
    sizes: ['XL', '2XL', '3XL', '4XL', '5XL'],
    variants: [
      { id: 'v12', size: 'XL', colorName: 'Xanh Lam Pastel', colorHex: '#BFDBFE', stock: 10, sku: 'SOMI-BLU-XL' },
      { id: 'v13', size: '2XL', colorName: 'Xanh Lam Pastel', colorHex: '#BFDBFE', stock: 15, sku: 'SOMI-BLU-2XL' },
      { id: 'v14', size: '3XL', colorName: 'Xanh Lam Pastel', colorHex: '#BFDBFE', stock: 12, sku: 'SOMI-BLU-3XL' },
      { id: 'v15', size: '4XL', colorName: 'Xanh Lam Pastel', colorHex: '#BFDBFE', stock: 6, sku: 'SOMI-BLU-4XL' },
      { id: 'v16', size: '5XL', colorName: 'Xanh Lam Pastel', colorHex: '#BFDBFE', stock: 4, sku: 'SOMI-BLU-5XL' },
      { id: 'v17', size: 'XL', colorName: 'Trắng Sữa Tinh Khôi', colorHex: '#F8FAFC', stock: 14, sku: 'SOMI-WHT-XL' },
      { id: 'v18', size: '2XL', colorName: 'Trắng Sữa Tinh Khôi', colorHex: '#F8FAFC', stock: 11, sku: 'SOMI-WHT-2XL' },
      { id: 'v19', size: '3XL', colorName: 'Trắng Sữa Tinh Khôi', colorHex: '#F8FAFC', stock: 8, sku: 'SOMI-WHT-3XL' }
    ],
    sizeChart: mensTopSizeChart,
    isNew: false,
    isBestSeller: true,
    tags: ['Sơ mi', 'Công sở', 'Oxford', 'Nam']
  },
  {
    id: 'prod-03',
    name: 'Quần Jeans Nam Big Size Cạp Chun Ẩn Co Giãn 4 Chiều Tech-Flex',
    slug: 'quan-jeans-nam-big-size-cap-chun-an',
    category: 'quan-jeans',
    gender: 'nam',
    price: 520000,
    originalPrice: 650000,
    discountPercent: 20,
    rating: 4.9,
    ratingCount: 164,
    shortDesc: 'Đột phá cạp chun ẩn co giãn thêm 5-7cm khi ngồi, chất denim 11oz mềm rũ tôn dáng.',
    description: 'Nỗi ám ảnh bị thít bụng, tức bụng khi mặc quần jeans của các anh em Big Size hoàn toàn biến mất. Quần Jeans Tech-Flex sở hữu đai lưng trợ lực có dải chun co giãn viền trong, bên ngoài vẫn giữ nguyên cúc cài và đỉa thắt lưng da sang trọng.',
    material: '81% Cotton, 17% Tencel làm mát, 2% Lycra đàn hồi cực đại.',
    careInstructions: [
      'Lộn trái quần khi giặt máy và phơi để giữ màu chàm',
      'Giặt với nước lạnh ở nhiệt độ dưới 30 độ C',
      'Không dùng chế độ sấy nhiệt độ cao'
    ],
    features: [
      'Cạp quần co giãn bí mật mở rộng đến 7cm khi ăn no hoặc ngồi lâu',
      'Ống đứng Straight-Fit rộng rãi từ đùi xuống gấu chân',
      'Đũng quần đắp vải hình thoi chống mài mòn, chống rách khi bước rộng'
    ],
    images: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=900&auto=format&fit=crop&q=80'
    ],
    colors: [
      { name: 'Xanh Indigo Cổ Điển', hex: '#243B55' },
      { name: 'Đen Mờ Tối Giản', hex: '#262626' }
    ],
    sizes: ['XL', '2XL', '3XL', '4XL', '5XL'],
    variants: [
      { id: 'v20', size: 'XL', colorName: 'Xanh Indigo Cổ Điển', colorHex: '#243B55', stock: 12, sku: 'JEA-IND-XL' },
      { id: 'v21', size: '2XL', colorName: 'Xanh Indigo Cổ Điển', colorHex: '#243B55', stock: 18, sku: 'JEA-IND-2XL' },
      { id: 'v22', size: '3XL', colorName: 'Xanh Indigo Cổ Điển', colorHex: '#243B55', stock: 14, sku: 'JEA-IND-3XL' },
      { id: 'v23', size: '4XL', colorName: 'Xanh Indigo Cổ Điển', colorHex: '#243B55', stock: 7, sku: 'JEA-IND-4XL' },
      { id: 'v24', size: '5XL', colorName: 'Xanh Indigo Cổ Điển', colorHex: '#243B55', stock: 3, sku: 'JEA-IND-5XL' },
      { id: 'v25', size: '3XL', colorName: 'Đen Mờ Tối Giản', colorHex: '#262626', stock: 9, sku: 'JEA-BLK-3XL' }
    ],
    sizeChart: pantsSizeChart,
    isNew: false,
    isBestSeller: true,
    tags: ['Jeans', 'Cạp chun ẩn', 'Co giãn', 'Nam']
  },
  {
    id: 'prod-04',
    name: 'Đầm Xòe Dáng Chữ A Cổ Tim Big Size Tôn Vòng 1 Che Khuyết Điểm',
    slug: 'dam-xoe-dang-chu-a-co-tim-big-size',
    category: 'dam-vay',
    gender: 'nu',
    price: 495000,
    originalPrice: 620000,
    discountPercent: 20,
    rating: 4.9,
    ratingCount: 187,
    shortDesc: 'Thiết kế chiết eo cao trên rốn, tùng váy xòe tự nhiên che trọn bụng dưới và đùi to duyên dáng.',
    description: 'Mẫu đầm best-seller tôn vinh đường cong đầy đặn của phái đẹp. Cổ tim khoét vừa phải giúp phần cổ trông thon dài, tay phồng nhẹ lửng che bắp tay to, chất liệu vải Tencel lụa mát rượi có lớp lót mỏng nhẹ nhàng nâng niu làn da.',
    material: 'Vải Tencel Silk cao cấp phối lót Habutai chống bám dính.',
    careInstructions: [
      'Ưu tiên giặt tay hoặc cho vào túi giặt chế độ nhẹ',
      'Tránh vắt xoắn mạnh làm hỏng kết cấu sợi lụa',
      'Ủi hơi nước mặt trong đầm'
    ],
    features: [
      'Đai lưng có dải nhún co giãn nhẹ phía sau vừa khít vòng eo',
      'Độ dài qua gối lịch sự, phù hợp cả đi tiệc lẫn dạo phố',
      'Có 2 túi sườn ẩn sâu tiện lợi để điện thoại son phấn'
    ],
    images: [
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=900&auto=format&fit=crop&q=80'
    ],
    colors: [
      { name: 'Đỏ Rượu Vang Burgundy', hex: '#6B1D2F' },
      { name: 'Xanh Rêu Emerald', hex: '#1E3A2F' },
      { name: 'Hoa Nhí Vintage Nền Đen', hex: '#262626' }
    ],
    sizes: ['XL', '2XL', '3XL', '4XL', '5XL'],
    variants: [
      { id: 'v26', size: 'XL', colorName: 'Đỏ Rượu Vang Burgundy', colorHex: '#6B1D2F', stock: 10, sku: 'DRS-RED-XL' },
      { id: 'v27', size: '2XL', colorName: 'Đỏ Rượu Vang Burgundy', colorHex: '#6B1D2F', stock: 16, sku: 'DRS-RED-2XL' },
      { id: 'v28', size: '3XL', colorName: 'Đỏ Rượu Vang Burgundy', colorHex: '#6B1D2F', stock: 12, sku: 'DRS-RED-3XL' },
      { id: 'v29', size: '4XL', colorName: 'Đỏ Rượu Vang Burgundy', colorHex: '#6B1D2F', stock: 8, sku: 'DRS-RED-4XL' },
      { id: 'v30', size: '5XL', colorName: 'Đỏ Rượu Vang Burgundy', colorHex: '#6B1D2F', stock: 5, sku: 'DRS-RED-5XL' },
      { id: 'v31', size: '2XL', colorName: 'Xanh Rêu Emerald', colorHex: '#1E3A2F', stock: 11, sku: 'DRS-GRE-2XL' },
      { id: 'v32', size: '3XL', colorName: 'Xanh Rêu Emerald', colorHex: '#1E3A2F', stock: 6, sku: 'DRS-GRE-3XL' }
    ],
    sizeChart: womensDressSizeChart,
    isNew: true,
    isBestSeller: true,
    tags: ['Đầm xòe', 'Che bụng', 'Nữ', 'Dự tiệc']
  },
  {
    id: 'prod-05',
    name: 'Áo Khoác Blazer Nữ Big Size Phom Suông Phong Cách Hàn Quốc',
    slug: 'ao-khoac-blazer-nu-big-size-phom-suong',
    category: 'ao-khoac',
    gender: 'nu',
    price: 590000,
    originalPrice: 720000,
    discountPercent: 18,
    rating: 4.8,
    ratingCount: 76,
    shortDesc: 'Đệm vai mỏng định hình khung vai chuẩn, ve cổ nhọn thanh mảnh kéo dài tỉ lệ cơ thể.',
    description: 'Item không thể thiếu trong tủ đồ nàng công sở mũm mĩm. Đường cắt dập may thẳng đứng tạo hiệu ứng thị giác thon gọn 2 bên eo. Lớp lót trượt satin thoáng khí không gây bí lưng vào những ngày nắng nóng.',
    material: 'Vải dệt Tweed mềm pha Wool nhân tạo cao cấp, không bai xù.',
    careInstructions: [
      'Giặt hấp hoặc giặt khô để giữ cầu vai thẳng chuẩn',
      'Treo bằng móc gỗ bản to tránh gãy phom',
      'Ủi lót bàn là nhiệt độ ấm'
    ],
    features: [
      'Cầu vai gia cố mỏng tạo đường thẳng lưng kiêu hãnh',
      'Dáng suông giấu hông to hoàn hảo khi phối với quần âu hoặc chân váy',
      'Túi mổ 2 bên may nẹp chắc chắn'
    ],
    images: [
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551803091-e20673f15770?w=900&auto=format&fit=crop&q=80'
    ],
    colors: [
      { name: 'Nâu Cà Phê Latte', hex: '#8B5A2B' },
      { name: 'Đen Tuyển Quý Phái', hex: '#1C1917' },
      { name: 'Kem Vani Nude', hex: '#E7DEC8' }
    ],
    sizes: ['XL', '2XL', '3XL', '4XL', '5XL'],
    variants: [
      { id: 'v33', size: 'XL', colorName: 'Nâu Cà Phê Latte', colorHex: '#8B5A2B', stock: 8, sku: 'BLZ-BRN-XL' },
      { id: 'v34', size: '2XL', colorName: 'Nâu Cà Phê Latte', colorHex: '#8B5A2B', stock: 14, sku: 'BLZ-BRN-2XL' },
      { id: 'v35', size: '3XL', colorName: 'Nâu Cà Phê Latte', colorHex: '#8B5A2B', stock: 10, sku: 'BLZ-BRN-3XL' },
      { id: 'v36', size: '4XL', colorName: 'Nâu Cà Phê Latte', colorHex: '#8B5A2B', stock: 5, sku: 'BLZ-BRN-4XL' },
      { id: 'v37', size: '5XL', colorName: 'Nâu Cà Phê Latte', colorHex: '#8B5A2B', stock: 2, sku: 'BLZ-BRN-5XL' },
      { id: 'v38', size: '2XL', colorName: 'Đen Tuyển Quý Phái', colorHex: '#1C1917', stock: 12, sku: 'BLZ-BLK-2XL' },
      { id: 'v39', size: '3XL', colorName: 'Đen Tuyển Quý Phái', colorHex: '#1C1917', stock: 9, sku: 'BLZ-BLK-3XL' }
    ],
    sizeChart: womensDressSizeChart,
    isNew: true,
    isBestSeller: false,
    tags: ['Blazer', 'Áo khoác', 'Nữ', 'Công sở']
  },
  {
    id: 'prod-06',
    name: 'Áo Thun Unisex Cotton USA 280GSM Drop-Shoulder Big Size',
    slug: 'ao-thun-unisex-cotton-usa-drop-shoulder',
    category: 'ao-thun',
    gender: 'unisex',
    price: 299000,
    originalPrice: 380000,
    discountPercent: 21,
    rating: 4.9,
    ratingCount: 220,
    shortDesc: 'Định lượng dày dặn 280GSM đứng phom không dính người, tay lỡ rộng rãi phóng khoáng.',
    description: 'Chiếc áo thun basic nhưng đẳng cấp mà mọi tín đồ phong cách đường phố ngoại cỡ đều khao khát. Chất vải Cotton Mỹ đầm tay, bo cổ dệt sợi Spandex kép giặt 100 lần không nhão. Cắt vai trễ thông minh che bắp tay và xuôi vai thon gọn.',
    material: '100% Sợi bông Cotton USA nguyên bản, giặt Enzyme mài lông mịn.',
    careInstructions: [
      'Giặt máy với chu trình vừa phải',
      'Không ủi trực tiếp lên hình in phản quang nhỏ sau lưng',
      'Phơi ngang hoặc vắt bằng móc nhựa to bản'
    ],
    features: [
      'Định lượng 280GSM siêu đứng phom, không lộ đầu ngực hay ngấn mỡ lưng',
      'Bo cổ dày 2.5cm dệt 2 sợi không bai dão sau thời gian dài',
      'Phù hợp cho cả nam và nữ từ 70kg đến 140kg'
    ],
    images: [
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=900&auto=format&fit=crop&q=80'
    ],
    colors: [
      { name: 'Xanh Lá Xô Thơm Sage', hex: '#627B66' },
      { name: 'Trắng Sữa Sand', hex: '#EBE5D8' },
      { name: 'Đen Than Chì', hex: '#262626' }
    ],
    sizes: ['XL', '2XL', '3XL', '4XL', '5XL'],
    variants: [
      { id: 'v40', size: 'XL', colorName: 'Xanh Lá Xô Thơm Sage', colorHex: '#627B66', stock: 15, sku: 'TSH-SGE-XL' },
      { id: 'v41', size: '2XL', colorName: 'Xanh Lá Xô Thơm Sage', colorHex: '#627B66', stock: 22, sku: 'TSH-SGE-2XL' },
      { id: 'v42', size: '3XL', colorName: 'Xanh Lá Xô Thơm Sage', colorHex: '#627B66', stock: 18, sku: 'TSH-SGE-3XL' },
      { id: 'v43', size: '4XL', colorName: 'Xanh Lá Xô Thơm Sage', colorHex: '#627B66', stock: 12, sku: 'TSH-SGE-4XL' },
      { id: 'v44', size: '5XL', colorName: 'Xanh Lá Xô Thơm Sage', colorHex: '#627B66', stock: 6, sku: 'TSH-SGE-5XL' },
      { id: 'v45', size: '3XL', colorName: 'Đen Than Chì', colorHex: '#262626', stock: 25, sku: 'TSH-BLK-3XL' }
    ],
    sizeChart: mensTopSizeChart,
    isNew: false,
    isBestSeller: true,
    tags: ['Áo thun', 'Unisex', 'Cotton USA', 'Streetwear']
  },
  {
    id: 'prod-07',
    name: 'Quần Tây Âu Nam Big Size Xếp Ly Phom Rộng Relaxed Smart Casual',
    slug: 'quan-tay-au-nam-big-size-xep-ly',
    category: 'quan-jeans',
    gender: 'nam',
    price: 480000,
    originalPrice: 590000,
    discountPercent: 19,
    rating: 4.7,
    ratingCount: 64,
    shortDesc: 'Xếp 2 ly trước tạo độ phồng che đùi và hông lớn, tôn dáng thanh thoát sang trọng.',
    description: 'Lấy cảm hứng từ phong cách sartorial cổ điển, quần âu 2 ly rộng rãi giải quyết triệt để vấn đề đùi ếch và hông to ở nam giới. Vải dệt chéo dày vừa phải, độ rũ tự nhiên khiến ống quần luôn thẳng tắp khi di chuyển.',
    material: '65% Poly rũ cao cấp, 30% Rayon bóng nhẹ, 5% Spandex.',
    careInstructions: [
      'Nên giặt nước ấm nhẹ, ủi định hình theo nếp ly',
      'Tránh vò mạnh phần lưng quần'
    ],
    features: [
      'Chi tiết xếp 2 ly trước kinh điển tăng thêm 4cm vòng đùi khi cử động',
      'Đai lưng may tăng đơ linh hoạt 2 bên sườn (Side Adjusters) không cần thắt lưng',
      'Ống xuông rộng thời thượng phong cách quý ông cổ điển'
    ],
    images: [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=900&auto=format&fit=crop&q=80'
    ],
    colors: [
      { name: 'Xám Ghi Tro', hex: '#4B5563' },
      { name: 'Đen Classic', hex: '#18181B' },
      { name: 'Nâu Be Khaki', hex: '#A89F91' }
    ],
    sizes: ['XL', '2XL', '3XL', '4XL', '5XL'],
    variants: [
      { id: 'v46', size: 'XL', colorName: 'Xám Ghi Tro', colorHex: '#4B5563', stock: 8, sku: 'TRS-GRY-XL' },
      { id: 'v47', size: '2XL', colorName: 'Xám Ghi Tro', colorHex: '#4B5563', stock: 12, sku: 'TRS-GRY-2XL' },
      { id: 'v48', size: '3XL', colorName: 'Xám Ghi Tro', colorHex: '#4B5563', stock: 10, sku: 'TRS-GRY-3XL' },
      { id: 'v49', size: '4XL', colorName: 'Xám Ghi Tro', colorHex: '#4B5563', stock: 5, sku: 'TRS-GRY-4XL' },
      { id: 'v50', size: '5XL', colorName: 'Xám Ghi Tro', colorHex: '#4B5563', stock: 4, sku: 'TRS-GRY-5XL' }
    ],
    sizeChart: pantsSizeChart,
    isNew: true,
    isBestSeller: false,
    tags: ['Quần âu', 'Xếp ly', 'Nam', 'Công sở']
  },
  {
    id: 'prod-08',
    name: 'Set Đồ Bộ Thể Thao Nữ Big Size Active-Fit Co Giãn Thoáng Mồ Hôi',
    slug: 'set-do-bo-the-thao-nu-big-size-active-fit',
    category: 'do-bo',
    gender: 'nu',
    price: 490000,
    originalPrice: 600000,
    discountPercent: 18,
    rating: 4.8,
    ratingCount: 112,
    shortDesc: 'Set áo thun lỡ kết hợp quần suông lửng cạp cao bản to, bảo đảm năng động không cấn ngấn bụng.',
    description: 'Trang phục thể thao và mặc nhà lý tưởng cho các nàng size lớn. Bản cạp quần rộng 6cm ôm trọn vùng bụng dưới mà không hề gây tức thở, chất thun da cá Cotton dệt kim thông thoáng thấm mồ hôi nhanh gấp đôi bình thường.',
    material: '95% French Terry Cotton tự nhiên, 5% Elastane.',
    careInstructions: [
      'Giặt máy bình thường, phơi ngang tránh giãn chiều dài áo',
      'Ủi mặt trái ở nhiệt độ thấp'
    ],
    features: [
      'Cạp quần bản rộng nẹp bụng êm ái',
      'Đường viền sọc chạy dọc tạo hiệu ứng thon dài chân',
      'Vải thun da cá không xù lông sau nhiều lần giặt'
    ],
    images: [
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&auto=format&fit=crop&q=80'
    ],
    colors: [
      { name: 'Tím Khói Lavender', hex: '#967BB6' },
      { name: 'Xanh Cổ Vịt Teal', hex: '#005F73' }
    ],
    sizes: ['XL', '2XL', '3XL', '4XL', '5XL'],
    variants: [
      { id: 'v51', size: 'XL', colorName: 'Tím Khói Lavender', colorHex: '#967BB6', stock: 10, sku: 'SET-LAV-XL' },
      { id: 'v52', size: '2XL', colorName: 'Tím Khói Lavender', colorHex: '#967BB6', stock: 14, sku: 'SET-LAV-2XL' },
      { id: 'v53', size: '3XL', colorName: 'Tím Khói Lavender', colorHex: '#967BB6', stock: 11, sku: 'SET-LAV-3XL' },
      { id: 'v54', size: '4XL', colorName: 'Tím Khói Lavender', colorHex: '#967BB6', stock: 6, sku: 'SET-LAV-4XL' },
      { id: 'v55', size: '5XL', colorName: 'Tím Khói Lavender', colorHex: '#967BB6', stock: 3, sku: 'SET-LAV-5XL' }
    ],
    sizeChart: womensDressSizeChart,
    isNew: true,
    isBestSeller: true,
    tags: ['Đồ bộ', 'Thể thao', 'Nữ', 'Ở nhà']
  }
];

export const categoriesList = [
  { id: 'tat-ca', name: 'Tất cả sản phẩm', count: 8 },
  {
    id: 'ao',
    code: 'AO',
    name: 'Áo',
    count: 4,
    desc: 'Tất cả các dòng áo may đo: Áo thun, Polo, Sơ mi, Áo khoác',
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'quan-jeans',
    code: 'QUAN-JEANS',
    name: 'Quần & Jeans',
    count: 2,
    desc: 'Denim & Kaki cạp chun ẩn co giãn 5cm, đũng sâu thoải mái',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'dam-vay',
    code: 'DAM-VAY',
    name: 'Đầm & Váy',
    count: 1,
    desc: 'Dáng chữ A hạ eo tôn dáng, giấu khuyết điểm cho nàng big size',
    image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'do-bo',
    code: 'DO-BO',
    name: 'Đồ Bộ & Thể Thao',
    count: 1,
    desc: 'Set đồ mặc nhà & vận động thun lạnh dệt kim, thoáng mát êm ái',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80'
  }
];

export const availableVouchers: Voucher[] = [
  {
    id: 1,
    code: 'BIGSIZE10',
    name: 'Giảm 10% Cho Đơn Hàng Đầu Tiên',
    voucherType: 'discount',
    discountType: 'percent',
    discountValue: 10,
    maxDiscount: 100000,
    minOrderValue: 300000,
    description: 'Giảm 10% (tối đa 100.000đ) cho đơn từ 300.000đ',
    status: 'Đang hoạt động'
  },
  {
    id: 2,
    code: 'FREESHIP',
    name: 'Miễn Phí Vận Chuyển Đơn Từ 500k',
    voucherType: 'shipping',
    discountType: 'fixed',
    discountValue: 30000,
    maxDiscount: 30000,
    minOrderValue: 500000,
    description: 'Hỗ trợ 30.000đ phí vận chuyển cho đơn từ 500.000đ',
    status: 'Đang hoạt động'
  },
  {
    id: 3,
    code: 'VIP50K',
    name: 'Giảm 50.000đ Tri Ân Khách Thân Thiết',
    voucherType: 'discount',
    discountType: 'fixed',
    discountValue: 50000,
    maxDiscount: 50000,
    minOrderValue: 400000,
    description: 'Giảm ngay 50.000đ cho đơn hàng thân thiết từ 400.000đ',
    status: 'Đang hoạt động'
  },
  {
    id: 5,
    code: 'FREESHIP50',
    name: 'Miễn Phí Vận Chuyển Đơn Từ 500k',
    voucherType: 'shipping',
    discountType: 'fixed',
    discountValue: 35000,
    maxDiscount: 35000,
    minOrderValue: 500000,
    description: 'Miễn phí vận chuyển (tối đa 35.000đ) cho đơn từ 500.000đ',
    status: 'Đang hoạt động'
  },
  {
    id: 6,
    code: 'WELCOME50K',
    name: 'Giảm Ngay 50k Cho Khách Hàng Mới',
    voucherType: 'discount',
    discountType: 'fixed',
    discountValue: 50000,
    maxDiscount: 50000,
    minOrderValue: 600000,
    description: 'Giảm ngay 50.000đ cho khách hàng mới trải nghiệm lần đầu từ 600.000đ',
    status: 'Đang hoạt động'
  }
];
