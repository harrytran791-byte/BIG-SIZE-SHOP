# 💼 PHÂN HỆ QUẢN LÝ CỬA HÀNG & VẬN HÀNH (MANAGER)

Thư mục này phụ trách toàn bộ hoạt động kinh doanh, xuất nhập kho và chăm sóc khách hàng của **Quản lý cửa hàng / Nhân viên vận hành (MANAGER)**.

---

## 📋 DANH SÁCH MÀN HÌNH VÀ NGHIỆP VỤ:

1. **Store Overview & Sales (Báo cáo doanh thu)**:
   - Biểu đồ doanh thu theo ngày/tháng.
   - Thống kê tỷ lệ bán theo từng phân khúc size (XL, 2XL, 3XL, 4XL, 5XL).
2. **Product Catalog Manager (Quản lý sản phẩm Big Size)**:
   - Thêm mới, chỉnh sửa thông tin sản phẩm quần áo Big Size.
   - Thiết lập bảng kích thước chuẩn (chiều cao, cân nặng, số đo 3 vòng tương ứng).
   - Đính kèm mẹo phối đồ và công nghệ giấu bụng/tôn dáng.
3. **Inventory & Size Depletion Warning (Quản lý kho & Cảnh báo cạn size)**:
   - Giám sát số lượng tồn kho theo từng biến thể (Màu sắc + Kích cỡ từ XL đến 5XL).
   - Tự động kích hoạt chuông cảnh báo khi số lượng size xuống dưới ngưỡng an toàn (<= 5 sản phẩm).
   - Lập lịch kiểm kê định kỳ và ghi nhận chênh lệch kho.
4. **Order & Shipping Management (Quản lý đơn hàng & Vận chuyển 3PL)**:
   - Tiếp nhận đơn đặt hàng mới.
   - Cập nhật trạng thái đơn (Chờ xử lý -> Đã xác nhận -> Đang đóng gói -> Đang giao).
   - Khởi tạo mã vận đơn tự động liên kết với GHTK/GHN/Viettel Post.
5. **Return & Exchange Management (Xử lý ĐỔI SIZE MIỄN PHÍ 7 NGÀY)**:
   - Tiếp nhận yêu cầu đổi size từ khách hàng do mặc không vừa phom.
   - Duyệt yêu cầu, điều phối shipper đến lấy hàng cũ và giao size mới tận nhà cho khách.
6. **Promotion & Voucher (Khuyến mãi & Mã giảm giá)**:
   - Tạo mã voucher giảm giá %, số tiền cố định, hoặc miễn phí giao hàng (Freeship).
