# 📡 TÀI LIỆU API RESTFUL: CURVE & CONFIDENCE
## CỔNG GIAO TIẾP DỮ LIỆU FRONTEND - BACKEND

- **Base URL**: `http://localhost:5000/api/v1`
- **Định dạng dữ liệu**: `JSON (Content-Type: application/json)`
- **Xác thực**: `Bearer Token` trong Header `Authorization: Bearer <JWT_TOKEN>`

---

## 1. PHÂN HỆ XÁC THỰC (AUTHENTICATION)
| Phương thức | Endpoint | Yêu cầu đăng nhập | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Không | Đăng ký tài khoản khách hàng mới |
| `POST` | `/auth/login` | Không | Đăng nhập hệ thống (trả về JWT & Role) |
| `GET` | `/auth/me` | Có (Mọi Role) | Lấy thông tin tài khoản hiện tại |

---

## 2. PHÂN HỆ DÀNH RIÊNG CHO ADMIN (QUẢN TRỊ VIÊN)
*Header yêu cầu: `Authorization: Bearer <TOKEN>` (Role = `ADMIN`)*

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/admin/users` | Lấy danh sách toàn bộ người dùng trong hệ thống |
| `PATCH`| `/admin/users/:userId/role` | Cập nhật vai trò (ADMIN, MANAGER, USER) |
| `PATCH`| `/admin/users/:userId/status`| Khóa / Mở khóa tài khoản |
| `GET` | `/admin/audit-logs` | Xem danh sách nhật ký bảo mật truy vết hành vi |
| `GET` | `/admin/settings` | Lấy cấu hình hệ thống & thông số cửa hàng |
| `PUT` | `/admin/settings/:key` | Cập nhật cấu hình hệ thống theo key |

---

## 3. PHÂN HỆ DÀNH RIÊNG CHO MANAGER (QUẢN LÝ CỬA HÀNG & VẬN HÀNH)
*Header yêu cầu: `Authorization: Bearer <TOKEN>` (Role = `MANAGER` hoặc `ADMIN`)*

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/manager/stats` | Thống kê doanh thu, số đơn, cảnh báo cạn size |
| `POST` | `/manager/products` | Thêm mới sản phẩm Big Size kèm các biến thể XL-5XL |
| `PATCH`| `/manager/inventory/variants/:variantId` | Cập nhật số lượng tồn kho theo kích cỡ |
| `GET` | `/manager/inventory/low-stock` | Lấy danh sách kích cỡ sắp cạn kho (<= 5 cái) |
| `PATCH`| `/manager/orders/:orderId/status` | Cập nhật trạng thái đơn & mã vận đơn 3PL |
| `PATCH`| `/manager/returns/:requestId` | Duyệt / Từ chối yêu cầu đổi size 7 ngày |

---

## 4. PHÂN HỆ DÀNH CHO USER (KHÁCH HÀNG MUA SẮM)
*Header yêu cầu: `Authorization: Bearer <TOKEN>` (Role = `USER`)*

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/user/body-profile` | Lấy thông số số đo 3 vòng (chiều cao, cân nặng, ngực, eo, mông) |
| `POST` | `/user/body-profile` | Lưu / Cập nhật số đo 3 vòng để AI gợi ý kích cỡ |
| `GET` | `/user/orders` | Lấy danh sách đơn hàng đã mua của cá nhân |
| `POST` | `/user/returns` | Gửi yêu cầu đổi size miễn phí trong 7 ngày |

---

## 5. PHÂN HỆ CÔNG KHAI (PUBLIC APIS)
| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/products` | Danh sách sản phẩm, hỗ trợ lọc theo size (`?size=3XL`) |
| `GET` | `/products/:slug` | Xem chi tiết sản phẩm và bảng đo kích cỡ |
| `POST` | `/orders/checkout` | Tạo đơn hàng mới & trừ tồn kho |
| `GET` | `/orders/track/:code` | Tra cứu đơn hàng theo mã đơn hoặc mã vận đơn |
| `POST` | `/ai/recommend-size` | AI Stylist phân tích số đo và đề xuất size chuẩn nhất |
