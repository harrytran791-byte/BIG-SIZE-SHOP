# 🌐 FRONTEND: CURVE & CONFIDENCE – THỜI TRANG BIG SIZE

Giao diện người dùng được xây dựng bằng **React 19 + TypeScript + Vite + TailwindCSS**. Thiết kế 100% tuân thủ tiêu chuẩn Typography Sans-Serif Arial thống nhất, hiện đại và chuẩn Responsive trên mọi kích thước màn hình.

---

## 🏛️ 1. CẤU TRÚC PHÂN CHIA THEO VAI TRÒ (ROLE-BASED & FEATURE-DRIVEN)

Mã nguồn được phân tách rành mạch theo 3 nhóm đối tượng sử dụng chính:

| Thư mục | Đối tượng sử dụng | Mô tả chức năng chính |
| :--- | :--- | :--- |
| `src/modules/admin/` | **Quản trị viên (ADMIN)** | Dashboard hệ thống, Quản lý tài khoản, Phân quyền Role/Permission, Cài đặt hệ thống, Nhật ký Audit Logs. |
| `src/modules/manager/` | **Quản lý cửa hàng (MANAGER)** | Quản lý sản phẩm & bảng size XL-5XL, Quản lý tồn kho theo biến thể, Xử lý đơn hàng, Duyệt đổi size 7 ngày, Khuyến mãi. |
| `src/modules/user/` | **Khách hàng (USER)** | Đăng nhập/Đăng ký, Hồ sơ cá nhân, Quản lý số đo 3 vòng cơ thể (Body Profile), Lịch sử mua hàng, Đổi trả size. |
| `src/modules/product/` | Khách hàng & Cửa hàng | Danh mục sản phẩm Big Size, Chi tiết sản phẩm, Bảng tra cứu kích thước, AI tư vấn size. |
| `src/modules/cart/` & `order/` | Khách hàng | Giỏ hàng, Mã giảm giá, Thanh toán Checkout, Theo dõi mã vận đơn thời gian thực. |
| `src/shared/` | Toàn hệ thống | Header, Navbar, Footer, Chatbot AI Stylist (Google Gemini), Modal xác nhận, Toast thông báo. |

---

## 🚀 2. LỆNH CHẠY DỰ ÁN FRONTEND

```bash
# 1. Cài đặt thư viện (nếu chưa có)
npm install

# 2. Khởi chạy môi trường phát triển (Hot-Reload)
npm run dev

# 3. Kiểm tra lỗi và Build phiên bản hoàn chỉnh
npm run build
```

Mặc định ứng dụng chạy tại: `http://localhost:5173`
