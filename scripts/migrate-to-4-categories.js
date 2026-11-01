const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vucrgwryaerhphparchc.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Y3Jnd3J5YWVyaHBocGFyY2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjQ5MTYsImV4cCI6MjEwNzMwMDkxNn0.cbnMNX8_i_ZY5kbOpNEUFNiKQivParO0qKg4RV1Tg4c';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migrateTo4Categories() {
  console.log('🔄 Đang đồng bộ CSDL Supabase về 4 danh mục chuẩn...');

  // Bước 1: Chuyển các sản phẩm đang có ma_danh_muc = 2 (Sơ mi) và 5 (Áo khoác) về ma_danh_muc = 1 (Áo)
  console.log('1️⃣ Cập nhật sản phẩm sơ mi và áo khoác sang mã danh mục 1...');
  const { error: spErr } = await supabase
    .from('sanpham')
    .update({ ma_danh_muc: 1 })
    .in('ma_danh_muc', [2, 5]);

  if (spErr) {
    console.error('❌ Lỗi cập nhật SanPham:', spErr);
    return;
  }
  console.log('✅ Đã gộp sản phẩm về danh mục Áo (ma_danh_muc = 1) an toàn.');

  // Bước 2: Cập nhật tên danh mục 1
  console.log('2️⃣ Cập nhật tên danh mục 1...');
  const { error: updateDmErr } = await supabase
    .from('danhmuc')
    .update({
      ten_danh_muc: 'Áo Nam & Nữ Big Size (Thun, Polo, Sơ Mi, Khoác)',
      code: 'AO-THUN',
      mo_ta: 'Tất cả các dòng áo may đo Big Size: Áo thun, Polo Dry-Tech, Sơ mi kháng nhăn, Áo khoác gió trượt nước.'
    })
    .eq('ma_danh_muc', 1);

  if (updateDmErr) {
    console.warn('⚠️ Lỗi cập nhật tên danh mục 1:', updateDmErr);
  }

  // Bước 3: Xóa 2 dòng ma_danh_muc = 2 và 5 khỏi bảng danhmuc
  console.log('3️⃣ Xóa danh mục 2 và 5 khỏi bảng danhmuc...');
  const { error: delDmErr } = await supabase
    .from('danhmuc')
    .delete()
    .in('ma_danh_muc', [2, 5]);

  if (delDmErr) {
    console.error('❌ Lỗi xóa danh mục 2 & 5:', delDmErr);
    return;
  }
  console.log('✅ Đã xóa 2 danh mục thừa khỏi bảng danhmuc.');

  // Bước 4: Kiểm tra lại danh sách bảng danhmuc
  const { data: finalDanhmuc, error: fetchErr } = await supabase
    .from('danhmuc')
    .select('ma_danh_muc, code, ten_danh_muc, trang_thai')
    .order('ma_danh_muc');

  if (fetchErr) {
    console.error('❌ Lỗi kiểm tra:', fetchErr);
    return;
  }

  console.log('\n📊 BẢNG DANHMUC SUPABASE HIỆN TẠI (ĐỦ 4 DANH MỤC):');
  console.table(finalDanhmuc);
}

migrateTo4Categories();
