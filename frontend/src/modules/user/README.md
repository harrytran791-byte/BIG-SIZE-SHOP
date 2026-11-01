# 👤 PHÂN HỆ KHÁCH HÀNG (USER / CUSTOMER)

Thư mục này quản lý toàn bộ trải nghiệm mua sắm, tài khoản cá nhân và hồ sơ số đo của **Khách hàng (USER)**.

---

## 📋 DANH SÁCH MÀN HÌNH VÀ TÍNH NĂNG:

1. **Authentication (Xác thực tài khoản)**:
   - `AuthModal.tsx` & `LoginPage.tsx`: Đăng nhập, đăng ký tài khoản thành viên, lấy lại mật khẩu.
   - Lưu trữ phiên đăng nhập an toàn bằng JWT.
2. **Body Profile Manager (Hồ sơ số đo 3 vòng cá nhân)**:
   - `BodyProfileManagerPage.tsx`: Nhập thông số chiều cao, cân nặng, số đo vòng 1 (ngực), vòng 2 (eo), vòng 3 (mông).
   - Xác định dáng người (quả lê, quả táo, đồng hồ cát, chữ nhật).
   - Cung cấp dữ liệu đầu vào chuẩn xác để **AI Gemini Stylist** tự động đề xuất kích cỡ vừa vặn nhất mỗi khi xem sản phẩm.
3. **Customer Profile (Thông tin tài khoản & Sổ địa chỉ)**:
   - `ProfilePage.tsx`: Cập nhật họ tên, số điện thoại, địa chỉ nhận hàng mặc định.
4. **Order History & Live Tracking (Lịch sử đơn hàng & Theo dõi vận đơn)**:
   - `OrderTrackingPage.tsx`: Xem danh sách đơn đã mua, tình trạng thanh toán, timeline giao hàng thực tế từ GHTK/GHN.
5. **Return Request (Gửi form yêu cầu đổi size miễn phí trong 7 ngày)**:
   - Khách hàng có thể chọn đơn hàng đã nhận và gửi yêu cầu đổi từ size hiện tại sang size khác nếu mặc chưa ưng ý.
