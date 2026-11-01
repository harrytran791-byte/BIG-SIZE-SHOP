# 🛡️ PHÂN HỆ QUẢN TRỊ VIÊN HỆ THỐNG (ADMIN)

Thư mục này tập trung toàn bộ giao diện và chức năng dành riêng cho **Quản trị viên cấp cao (ADMIN)**.

---

## 📋 DANH SÁCH MÀN HÌNH VÀ CHỨC NĂNG:

1. **System Dashboard (Tổng quan hệ thống)**:
   - Theo dõi trạng thái hoạt động của server, thời gian phản hồi, trạng thái cơ sở dữ liệu.
   - Thống kê tổng số người dùng, phân bổ theo vai trò.
2. **User Management (Quản lý tài khoản)**:
   - Danh sách người dùng trong hệ thống (Họ tên, Email, Vai trò, Trạng thái hoạt động).
   - Khóa/Mở khóa tài khoản nhân viên hoặc khách hàng vi phạm.
   - Xóa tài khoản hoặc reset mật khẩu.
3. **Role & Permission Management (Phân quyền truy cập)**:
   - Ma trận phân quyền chi tiết cho 3 vai trò: `ADMIN`, `MANAGER`, `USER`.
   - Cấp phát và thu hồi quyền hạn tác nghiệp trên hệ thống.
4. **System Settings (Cài đặt hệ thống)**:
   - Cấu hình thông tin thương hiệu Curve & Confidence.
   - Cài đặt thời gian chính sách đổi trả size miễn phí (mặc định 7 ngày).
   - Cấu hình API Key (Google Gemini AI, đơn vị vận chuyển GHTK/GHN, cổng thanh toán).
5. **Security Audit Logs (Nhật ký truy vết bảo mật)**:
   - Ghi lại toàn bộ hành động nhạy cảm (đổi quyền, khóa tài khoản, chỉnh sửa cấu hình).
   - Hiển thị người thực hiện, thời gian, IP và chi tiết thay đổi để đảm bảo an ninh thông tin.
