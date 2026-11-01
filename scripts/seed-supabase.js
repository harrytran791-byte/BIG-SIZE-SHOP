const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vucrgwryaerhphparchc.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Y3Jnd3J5YWVyaHBocGFyY2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjQ5MTYsImV4cCI6MjEwNzMwMDkxNn0.cbnMNX8_i_ZY5kbOpNEUFNiKQivParO0qKg4RV1Tg4c';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runSeed() {
  console.log('🚀 Bắt đầu quá trình đồng bộ toàn bộ dữ liệu vào Supabase Cloud...');

  // 1. Danh mục sản phẩm (DanhMuc) - 4 nhóm danh mục chuẩn 1, 2, 3, 4
  const danhmucList = [
    { ma_danh_muc: 1, code: 'AO', ten_danh_muc: 'Áo', mo_ta: 'Tất cả các dòng áo may đo Big Size: Áo thun, Polo Dry-Tech, Sơ mi kháng nhăn, Áo khoác gió trượt nước.', trang_thai: 'hoat_dong' },
    { ma_danh_muc: 2, code: 'QUAN-JEANS', ten_danh_muc: 'Quần & Jeans', mo_ta: 'Thiết kế cạp chun co giãn công thái học, không bó thít bụng.', trang_thai: 'hoat_dong' },
    { ma_danh_muc: 3, code: 'DAM-VAY', ten_danh_muc: 'Đầm & Váy', mo_ta: 'Đầm chữ A chiết eo cao trên rốn giấu mỡ bụng tuyệt đối cho phái nữ.', trang_thai: 'hoat_dong' },
    { ma_danh_muc: 4, code: 'DO-BO', ten_danh_muc: 'Đồ Bộ & Thể Thao', mo_ta: 'Đồ bộ nỉ thun da cá co giãn thoải mái vận động cho người ngoại cỡ.', trang_thai: 'hoat_dong' }
  ];

  const { error: dmError } = await supabase.from('danhmuc').upsert(danhmucList, { onConflict: 'ma_danh_muc' });
  if (dmError) {
    console.error('❌ Lỗi nạp DanhMuc:', dmError);
    return;
  }
  console.log('✅ Đã đồng bộ 4 Danh Mục sản phẩm.');

  // 2. Sản phẩm (SanPham) - 8 sản phẩm
  const sanphamList = [
    {
      ma_sp: 1,
      ten_sp: 'Áo Polo Nam Big Size Dry-Tech Dệt Tổ Ong Kháng Khuẩn',
      ma_danh_muc: 1,
      mo_ta: 'Vải dệt Pique tổ ong co giãn 4 chiều, thiết kế nẹp cổ đứng tôn phom, giấu bụng hiệu quả.',
      hinh_anh: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=900&auto=format&fit=crop&q=80',
      trang_thai: 'dang_kinh_doanh'
    },
    {
      ma_sp: 2,
      ten_sp: 'Áo Sơ Mi Oxford Dài Tay Big Size Form Loose Fit Chống Nhăn',
      ma_danh_muc: 2,
      mo_ta: 'Vải sợi bông tự nhiên dệt Oxford cao cấp, cổ áo cài khuy Button-Down thanh lịch chuẩn quý ông.',
      hinh_anh: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=900&auto=format&fit=crop&q=80',
      trang_thai: 'dang_kinh_doanh'
    },
    {
      ma_sp: 3,
      ten_sp: 'Quần Jeans Nam Big Size Cạp Chun Ẩn Co Giãn 4 Chiều Tech-Flex',
      ma_danh_muc: 3,
      mo_ta: 'Đột phá cạp chun ẩn co giãn thêm 5-7cm khi ngồi, chất denim 11oz mềm rũ tôn dáng.',
      hinh_anh: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=900&auto=format&fit=crop&q=80',
      trang_thai: 'dang_kinh_doanh'
    },
    {
      ma_sp: 4,
      ten_sp: 'Đầm Xòe Dáng Chữ A Cổ Tim Big Size Tôn Vòng 1 Che Khuyết Điểm',
      ma_danh_muc: 4,
      mo_ta: 'Thiết kế chiết eo cao trên rốn, tùng váy xòe tự nhiên che trọn bụng dưới và đùi to duyên dáng.',
      hinh_anh: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=900&auto=format&fit=crop&q=80',
      trang_thai: 'dang_kinh_doanh'
    },
    {
      ma_sp: 5,
      ten_sp: 'Áo Khoác Blazer Nữ Big Size Phom Suông Phong Cách Hàn Quốc',
      ma_danh_muc: 5,
      mo_ta: 'Đệm vai mỏng định hình khung vai chuẩn, ve cổ nhọn thanh mảnh kéo dài tỉ lệ cơ thể.',
      hinh_anh: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&auto=format&fit=crop&q=80',
      trang_thai: 'dang_kinh_doanh'
    },
    {
      ma_sp: 6,
      ten_sp: 'Áo Thun Unisex Cotton USA 280GSM Drop-Shoulder Big Size',
      ma_danh_muc: 1,
      mo_ta: 'Định lượng dày dặn 280GSM đứng phom không dính người, tay lỡ rộng rãi phóng khoáng.',
      hinh_anh: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=900&auto=format&fit=crop&q=80',
      trang_thai: 'dang_kinh_doanh'
    },
    {
      ma_sp: 7,
      ten_sp: 'Quần Tây Âu Nam Big Size Xếp Ly Phom Rộng Relaxed Smart Casual',
      ma_danh_muc: 3,
      mo_ta: 'Xếp 2 ly trước tạo độ phồng che đùi và hông lớn, tôn dáng thanh thoát sang trọng.',
      hinh_anh: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=900&auto=format&fit=crop&q=80',
      trang_thai: 'dang_kinh_doanh'
    },
    {
      ma_sp: 8,
      ten_sp: 'Set Đồ Bộ Thể Thao Nữ Big Size Active-Fit Co Giãn Thoáng Mồ Hôi',
      ma_danh_muc: 6,
      mo_ta: 'Set áo thun lỡ kết hợp quần suông lửng cạp cao bản to, bảo đảm năng động không cấn ngấn bụng.',
      hinh_anh: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&auto=format&fit=crop&q=80',
      trang_thai: 'dang_kinh_doanh'
    }
  ];

  const { error: spError } = await supabase.from('sanpham').upsert(sanphamList, { onConflict: 'ma_sp' });
  if (spError) {
    console.error('❌ Lỗi nạp SanPham:', spError);
    return;
  }
  console.log('✅ Đã đồng bộ 8 Sản Phẩm BigSize hoàn chỉnh.');

  // 3. Bảng Size (BangSize) - 5 size (XL, 2XL, 3XL, 4XL, 5XL) cho từng sản phẩm (tổng 40 dòng)
  const mensTopMeasurements = [
    { kich_co: 'XL', min_chieu_cao: 165, max_chieu_cao: 175, min_can_nang: 75, max_can_nang: 84, min_vong_nguc: 102, max_vong_nguc: 108, min_vong_eo: 90, max_vong_eo: 96, min_vong_hong: 100, max_vong_hong: 106 },
    { kich_co: '2XL', min_chieu_cao: 170, max_chieu_cao: 180, min_can_nang: 85, max_can_nang: 94, min_vong_nguc: 109, max_vong_nguc: 116, min_vong_eo: 97, max_vong_eo: 104, min_vong_hong: 107, max_vong_hong: 114 },
    { kich_co: '3XL', min_chieu_cao: 172, max_chieu_cao: 185, min_can_nang: 95, max_can_nang: 106, min_vong_nguc: 117, max_vong_nguc: 126, min_vong_eo: 105, max_vong_eo: 114, min_vong_hong: 115, max_vong_hong: 124 },
    { kich_co: '4XL', min_chieu_cao: 175, max_chieu_cao: 190, min_can_nang: 107, max_can_nang: 120, min_vong_nguc: 127, max_vong_nguc: 138, min_vong_eo: 115, max_vong_eo: 126, min_vong_hong: 125, max_vong_hong: 136 },
    { kich_co: '5XL', min_chieu_cao: 175, max_chieu_cao: 195, min_can_nang: 121, max_can_nang: 138, min_vong_nguc: 139, max_vong_nguc: 150, min_vong_eo: 127, max_vong_eo: 138, min_vong_hong: 137, max_vong_hong: 148 }
  ];

  const pantsMeasurements = [
    { kich_co: 'XL', min_chieu_cao: 165, max_chieu_cao: 175, min_can_nang: 75, max_can_nang: 84, min_vong_nguc: 102, max_vong_nguc: 108, min_vong_eo: 90, max_vong_eo: 96, min_vong_hong: 102, max_vong_hong: 108 },
    { kich_co: '2XL', min_chieu_cao: 170, max_chieu_cao: 180, min_can_nang: 85, max_can_nang: 94, min_vong_nguc: 109, max_vong_nguc: 116, min_vong_eo: 97, max_vong_eo: 104, min_vong_hong: 109, max_vong_hong: 115 },
    { kich_co: '3XL', min_chieu_cao: 172, max_chieu_cao: 185, min_can_nang: 95, max_can_nang: 106, min_vong_nguc: 117, max_vong_nguc: 126, min_vong_eo: 105, max_vong_eo: 114, min_vong_hong: 116, max_vong_hong: 124 },
    { kich_co: '4XL', min_chieu_cao: 175, max_chieu_cao: 190, min_can_nang: 107, max_can_nang: 120, min_vong_nguc: 127, max_vong_nguc: 138, min_vong_eo: 115, max_vong_eo: 126, min_vong_hong: 125, max_vong_hong: 134 },
    { kich_co: '5XL', min_chieu_cao: 175, max_chieu_cao: 195, min_can_nang: 121, max_can_nang: 138, min_vong_nguc: 139, max_vong_nguc: 150, min_vong_eo: 127, max_vong_eo: 138, min_vong_hong: 135, max_vong_hong: 146 }
  ];

  const womensMeasurements = [
    { kich_co: 'XL', min_chieu_cao: 155, max_chieu_cao: 165, min_can_nang: 68, max_can_nang: 77, min_vong_nguc: 98, max_vong_nguc: 104, min_vong_eo: 82, max_vong_eo: 88, min_vong_hong: 102, max_vong_hong: 108 },
    { kich_co: '2XL', min_chieu_cao: 158, max_chieu_cao: 168, min_can_nang: 78, max_can_nang: 87, min_vong_nguc: 105, max_vong_nguc: 112, min_vong_eo: 89, max_vong_eo: 96, min_vong_hong: 109, max_vong_hong: 116 },
    { kich_co: '3XL', min_chieu_cao: 160, max_chieu_cao: 172, min_can_nang: 88, max_can_nang: 98, min_vong_nguc: 113, max_vong_nguc: 122, min_vong_eo: 97, max_vong_eo: 106, min_vong_hong: 117, max_vong_hong: 126 },
    { kich_co: '4XL', min_chieu_cao: 160, max_chieu_cao: 175, min_can_nang: 99, max_can_nang: 112, min_vong_nguc: 123, max_vong_nguc: 134, min_vong_eo: 107, max_vong_eo: 118, min_vong_hong: 127, max_vong_hong: 138 },
    { kich_co: '5XL', min_chieu_cao: 160, max_chieu_cao: 178, min_can_nang: 113, max_can_nang: 130, min_vong_nguc: 135, max_vong_nguc: 146, min_vong_eo: 119, max_vong_eo: 130, min_vong_hong: 139, max_vong_hong: 150 }
  ];

  const bangSizeInserts = [];
  [1, 2, 6].forEach((ma_sp) => {
    mensTopMeasurements.forEach((m) => {
      bangSizeInserts.push({ ma_sp, ...m });
    });
  });

  [3, 7].forEach((ma_sp) => {
    pantsMeasurements.forEach((m) => {
      bangSizeInserts.push({ ma_sp, ...m });
    });
  });

  [4, 5, 8].forEach((ma_sp) => {
    womensMeasurements.forEach((m) => {
      bangSizeInserts.push({ ma_sp, ...m });
    });
  });

  const { error: bsError } = await supabase.from('bangsize').upsert(bangSizeInserts, { onConflict: 'ma_sp, kich_co' });
  if (bsError) {
    console.error('❌ Lỗi nạp BangSize:', bsError);
    return;
  }
  console.log(`✅ Đã đồng bộ ${bangSizeInserts.length} quy chuẩn Bảng Size cho cả 8 sản phẩm (XL - 5XL).`);

  // 4. Lấy lại danh sách Bảng Size vừa tạo để ánh xạ ma_bang_size chuẩn
  const { data: allBangSize, error: queryBsErr } = await supabase.from('bangsize').select('ma_bang_size, ma_sp, kich_co');
  if (queryBsErr || !allBangSize) {
    console.error('❌ Lỗi truy vấn BangSize:', queryBsErr);
    return;
  }

  const getBangSizeId = (ma_sp, kich_co) => {
    const found = allBangSize.find((b) => b.ma_sp === ma_sp && b.kich_co === kich_co);
    return found ? found.ma_bang_size : null;
  };

  // 5. Lấy các chi tiết sản phẩm đã có sẵn để phân loại Update vs Insert
  const { data: existingCtsp } = await supabase.from('chitietsanpham').select('ma_ctsp, ma_sp, ma_bang_size, mau_sac, sku');
  const existingMap = new Map();
  if (existingCtsp) {
    existingCtsp.forEach((row) => {
      existingMap.set(`${row.ma_sp}_${row.ma_bang_size}_${row.mau_sac}`, row);
    });
  }

  // Danh sách biến thể SKU chuẩn cho toàn bộ 8 sản phẩm
  const rawVariants = [
    // SP 1: Áo Polo Dry-Tech
    { ma_sp: 1, size: 'XL', color: 'Đen Huyền Bí', price: 389000, qty: 22, hold: 2, sku: 'POLO-DEN-XL' },
    { ma_sp: 1, size: '2XL', color: 'Đen Huyền Bí', price: 389000, qty: 18, hold: 1, sku: 'POLO-DEN-2XL' },
    { ma_sp: 1, size: '3XL', color: 'Đen Huyền Bí', price: 389000, qty: 15, hold: 0, sku: 'POLO-DEN-3XL' },
    { ma_sp: 1, size: '4XL', color: 'Đen Huyền Bí', price: 389000, qty: 8, hold: 0, sku: 'POLO-DEN-4XL' },
    { ma_sp: 1, size: '5XL', color: 'Đen Huyền Bí', price: 389000, qty: 5, hold: 0, sku: 'POLO-DEN-5XL' },
    { ma_sp: 1, size: 'XL', color: 'Xanh Navy', price: 389000, qty: 12, hold: 0, sku: 'POLO-NAVY-XL' },
    { ma_sp: 1, size: '2XL', color: 'Xanh Navy', price: 389000, qty: 16, hold: 0, sku: 'POLO-NAVY-2XL' },

    // SP 2: Áo Sơ Mi Oxford
    { ma_sp: 2, size: 'XL', color: 'Trắng Sữa Tinh Khôi', price: 450000, qty: 20, hold: 1, sku: 'SOMI-WHT-XL' },
    { ma_sp: 2, size: '2XL', color: 'Trắng Sữa Tinh Khôi', price: 450000, qty: 18, hold: 0, sku: 'SOMI-WHT-2XL' },
    { ma_sp: 2, size: '3XL', color: 'Trắng Sữa Tinh Khôi', price: 450000, qty: 14, hold: 0, sku: 'SOMI-WHT-3XL' },
    { ma_sp: 2, size: '4XL', color: 'Trắng Sữa Tinh Khôi', price: 450000, qty: 7, hold: 0, sku: 'SOMI-WHT-4XL' },
    { ma_sp: 2, size: '5XL', color: 'Trắng Sữa Tinh Khôi', price: 450000, qty: 4, hold: 0, sku: 'SOMI-WHT-5XL' },
    { ma_sp: 2, size: '2XL', color: 'Xanh Lam Pastel', price: 450000, qty: 15, hold: 0, sku: 'SOMI-BLU-2XL' },

    // SP 3: Quần Jeans Tech-Flex
    { ma_sp: 3, size: 'XL', color: 'Xanh Indigo Cổ Điển', price: 520000, qty: 20, hold: 0, sku: 'JEA-IND-XL' },
    { ma_sp: 3, size: '2XL', color: 'Xanh Indigo Cổ Điển', price: 520000, qty: 18, hold: 1, sku: 'JEA-IND-2XL' },
    { ma_sp: 3, size: '3XL', color: 'Xanh Indigo Cổ Điển', price: 520000, qty: 14, hold: 0, sku: 'JEA-IND-3XL' },
    { ma_sp: 3, size: '4XL', color: 'Xanh Indigo Cổ Điển', price: 520000, qty: 8, hold: 0, sku: 'JEA-IND-4XL' },
    { ma_sp: 3, size: '5XL', color: 'Xanh Indigo Cổ Điển', price: 520000, qty: 3, hold: 0, sku: 'JEA-IND-5XL' },
    { ma_sp: 3, size: '3XL', color: 'Đen Mờ Tối Giản', price: 520000, qty: 9, hold: 0, sku: 'JEA-BLK-3XL' },

    // SP 4: Đầm Chữ A Chiết Eo
    { ma_sp: 4, size: 'XL', color: 'Đỏ Burgundy', price: 495000, qty: 18, hold: 1, sku: 'DAM-DO-XL' },
    { ma_sp: 4, size: '2XL', color: 'Đỏ Burgundy', price: 495000, qty: 16, hold: 0, sku: 'DAM-DO-2XL' },
    { ma_sp: 4, size: '3XL', color: 'Đỏ Burgundy', price: 495000, qty: 12, hold: 0, sku: 'DAM-DO-3XL' },
    { ma_sp: 4, size: '4XL', color: 'Đỏ Burgundy', price: 495000, qty: 8, hold: 0, sku: 'DAM-DO-4XL' },
    { ma_sp: 4, size: '5XL', color: 'Đỏ Burgundy', price: 495000, qty: 4, hold: 0, sku: 'DAM-DO-5XL' },
    { ma_sp: 4, size: '2XL', color: 'Đen Quyền Lực', price: 495000, qty: 22, hold: 0, sku: 'DAM-DEN-2XL' },

    // SP 5: Áo Khoác Blazer Nữ
    { ma_sp: 5, size: 'XL', color: 'Nâu Cà Phê Latte', price: 590000, qty: 15, hold: 0, sku: 'BLZ-BRN-XL' },
    { ma_sp: 5, size: '2XL', color: 'Nâu Cà Phê Latte', price: 590000, qty: 14, hold: 0, sku: 'BLZ-BRN-2XL' },
    { ma_sp: 5, size: '3XL', color: 'Nâu Cà Phê Latte', price: 590000, qty: 10, hold: 0, sku: 'BLZ-BRN-3XL' },
    { ma_sp: 5, size: '4XL', color: 'Nâu Cà Phê Latte', price: 590000, qty: 5, hold: 0, sku: 'BLZ-BRN-4XL' },
    { ma_sp: 5, size: '5XL', color: 'Nâu Cà Phê Latte', price: 590000, qty: 2, hold: 0, sku: 'BLZ-BRN-5XL' },
    { ma_sp: 5, size: '2XL', color: 'Đen Tuyển Quý Phái', price: 590000, qty: 12, hold: 0, sku: 'BLZ-BLK-2XL' },

    // SP 6: Áo Thun Drop-Shoulder 280GSM
    { ma_sp: 6, size: 'XL', color: 'Xanh Lá Xô Thơm Sage', price: 299000, qty: 25, hold: 0, sku: 'TSH-SGE-XL' },
    { ma_sp: 6, size: '2XL', color: 'Xanh Lá Xô Thơm Sage', price: 299000, qty: 22, hold: 0, sku: 'TSH-SGE-2XL' },
    { ma_sp: 6, size: '3XL', color: 'Xanh Lá Xô Thơm Sage', price: 299000, qty: 18, hold: 0, sku: 'TSH-SGE-3XL' },
    { ma_sp: 6, size: '4XL', color: 'Xanh Lá Xô Thơm Sage', price: 299000, qty: 12, hold: 0, sku: 'TSH-SGE-4XL' },
    { ma_sp: 6, size: '5XL', color: 'Xanh Lá Xô Thơm Sage', price: 299000, qty: 6, hold: 0, sku: 'TSH-SGE-5XL' },
    { ma_sp: 6, size: '3XL', color: 'Đen Than Chì', price: 299000, qty: 25, hold: 0, sku: 'TSH-BLK-3XL' },

    // SP 7: Quần Tây Âu Nam Xếp Ly
    { ma_sp: 7, size: 'XL', color: 'Xám Ghi Tro', price: 480000, qty: 18, hold: 0, sku: 'TRS-GRY-XL' },
    { ma_sp: 7, size: '2XL', color: 'Xám Ghi Tro', price: 480000, qty: 15, hold: 0, sku: 'TRS-GRY-2XL' },
    { ma_sp: 7, size: '3XL', color: 'Xám Ghi Tro', price: 480000, qty: 12, hold: 0, sku: 'TRS-GRY-3XL' },
    { ma_sp: 7, size: '4XL', color: 'Xám Ghi Tro', price: 480000, qty: 6, hold: 0, sku: 'TRS-GRY-4XL' },
    { ma_sp: 7, size: '5XL', color: 'Xám Ghi Tro', price: 480000, qty: 4, hold: 0, sku: 'TRS-GRY-5XL' },
    { ma_sp: 7, size: '2XL', color: 'Đen Classic', price: 480000, qty: 14, hold: 0, sku: 'TRS-BLK-2XL' },

    // SP 8: Set Đồ Bộ Thể Thao
    { ma_sp: 8, size: 'XL', color: 'Tím Khói Lavender', price: 490000, qty: 16, hold: 0, sku: 'SET-LAV-XL' },
    { ma_sp: 8, size: '2XL', color: 'Tím Khói Lavender', price: 490000, qty: 14, hold: 0, sku: 'SET-LAV-2XL' },
    { ma_sp: 8, size: '3XL', color: 'Tím Khói Lavender', price: 490000, qty: 11, hold: 0, sku: 'SET-LAV-3XL' },
    { ma_sp: 8, size: '4XL', color: 'Tím Khói Lavender', price: 490000, qty: 6, hold: 0, sku: 'SET-LAV-4XL' },
    { ma_sp: 8, size: '5XL', color: 'Tím Khói Lavender', price: 490000, qty: 3, hold: 0, sku: 'SET-LAV-5XL' },
    { ma_sp: 8, size: '2XL', color: 'Xanh Cổ Vịt Teal', price: 490000, qty: 10, hold: 0, sku: 'SET-TEA-2XL' }
  ];

  const updateRecords = [];
  const newRecords = [];

  rawVariants.forEach((v) => {
    const ma_bang_size = getBangSizeId(v.ma_sp, v.size);
    if (!ma_bang_size) return;

    const key = `${v.ma_sp}_${ma_bang_size}_${v.color}`;
    const existing = existingMap.get(key);

    if (existing) {
      updateRecords.push({
        ma_ctsp: existing.ma_ctsp,
        ma_sp: v.ma_sp,
        sku: existing.sku,
        ma_bang_size,
        mau_sac: v.color,
        don_gia: v.price,
        so_luong_ton: v.qty,
        so_luong_giu: v.hold,
        trang_thai: 'dang_kinh_doanh',
        ngay_kiem_ke: new Date().toISOString(),
        ma_nv_kiem_ke: 2
      });
    } else {
      newRecords.push({
        ma_sp: v.ma_sp,
        sku: v.sku,
        ma_bang_size,
        mau_sac: v.color,
        don_gia: v.price,
        so_luong_ton: v.qty,
        so_luong_giu: v.hold,
        trang_thai: 'dang_kinh_doanh',
        ngay_kiem_ke: new Date().toISOString(),
        ma_nv_kiem_ke: 2
      });
    }
  });

  // Update existing rows
  if (updateRecords.length > 0) {
    const { error: upErr } = await supabase.from('chitietsanpham').upsert(updateRecords, { onConflict: 'ma_ctsp' });
    if (upErr) {
      console.error('❌ Lỗi cập nhật biến thể cũ:', upErr);
      return;
    }
    console.log(`✅ Đã cập nhật ${updateRecords.length} biến thể tồn kho hiện hữu.`);
  }

  // Insert new rows
  if (newRecords.length > 0) {
    const { error: insErr } = await supabase.from('chitietsanpham').insert(newRecords);
    if (insErr) {
      console.error('❌ Lỗi thêm biến thể mới:', insErr);
      return;
    }
    console.log(`✅ Đã thêm mới ${newRecords.length} biến thể tồn kho (SKU) mới.`);
  }

  // 6. Voucher
  const voucherList = [
    {
      code: 'BIGSIZE10',
      ten_voucher: 'Giảm 10% Cho Đơn Hàng Đầu Tiên',
      loai_giam: 'phan_tram',
      gia_tri_giam: 10,
      giam_toi_da: 100000,
      don_toi_thieu: 300000,
      trang_thai: 'dang_hoat_dong'
    },
    {
      code: 'FREESHIP50',
      ten_voucher: 'Miễn Phí Vận Chuyển Đơn Từ 500k',
      loai_giam: 'so_tien',
      gia_tri_giam: 35000,
      giam_toi_da: 35000,
      don_toi_thieu: 500000,
      trang_thai: 'dang_hoat_dong'
    },
    {
      code: 'WELCOME50K',
      ten_voucher: 'Giảm Ngay 50k Cho Khách Hàng Mới',
      loai_giam: 'so_tien',
      gia_tri_giam: 50000,
      giam_toi_da: 50000,
      don_toi_thieu: 600000,
      trang_thai: 'dang_hoat_dong'
    }
  ];

  const { error: vError } = await supabase.from('voucher').upsert(voucherList, { onConflict: 'code' });
  if (vError) {
    console.error('❌ Lỗi nạp Voucher:', vError);
  } else {
    console.log('✅ Đã đồng bộ 3 Voucher khuyến mãi.');
  }

  console.log('\n🎉 TOÀN BỘ DỮ LIỆU ĐÃ ĐƯỢC ĐỒNG BỘ THÀNH CÔNG VÀO SUPABASE CLOUD!');
}

runSeed();
