# 👗 CURVE & CONFIDENCE — HỆ THỐNG THỜI TRANG BIG SIZE (XL – 5XL)
Hướng dẫn lấy code, cấu hình môi trường và làm việc theo nhánh: [Cộng tác cùng nhóm](docs/CONTRIBUTING.md).

## KIẾN TRÚC TOÀN DIỆN: 

Dự án thương mại điện tử chuyên biệt cho dòng thời trang ngoại cỡ (65kg – 140kg), tích hợp công cụ tư vấn chọn kích cỡ thông minh (AI Size Advisor), phân quyền chặt chẽ giữa **Quản trị viên (Admin)**, **Quản lý cửa hàng (Manager)** và **Khách hàng (User)**.

---

## 🏛️ TỔNG QUAN CẤU TRÚC THƯ MỤC CẤP CAO

```text
Thoi-Trang-BigSize/
├── 🌐 frontend/                  # GIAO DIỆN NGƯỜI DÙNG (React 19, Vite, TailwindCSS)
│   ├── src/
│   │   ├── modules/admin/       # Giao diện dành riêng cho Admin (Dashboard, User, Roles, Audit Logs)
│   │   ├── modules/manager/     # Giao diện dành riêng cho Manager (Sản phẩm, Kho XL-5XL, Đổi size 7 ngày)
│   │   ├── modules/user/        # Giao diện Khách hàng (Hồ sơ, Số đo 3 vòng, Đặt hàng, Lịch sử)
│   │   ├── modules/product/     # Danh mục thời trang Big Size, bảng tra cứu số đo
│   │   └── shared/              # Header, Navbar, Footer, Chatbot AI Stylist (Google Gemini)
│   └── package.json             # Scripts và dependencies của Frontend
│
├── ⚙️ backend/                   # MÁY CHỦ API & CƠ SỞ DỮ LIỆU (Node.js, Express, PostgreSQL)
│   ├── src/
│   │   ├── database/            # schema.sql, seed.sql, initDb.ts, TypeScript Models
│   │   ├── middlewares/         # JWT Auth, Phân quyền RBAC (ADMIN/MANAGER/USER), Error Handler
│   │   ├── modules/             # API chia theo vai trò (auth, admin, manager, user, products, orders, ai)
│   │   └── server.ts            # Khởi chạy Express Server (Port 5000)
│   ├── .env                     # Cấu hình kết nối PostgreSQL & pgAdmin
│   └── package.json             # Scripts và dependencies của Backend
│
├── 📦 Linh_tinh/                 # KHU VỰC CÁCH LY FILE PHỤ & CÁ NHÂN
│   ├── media/                   # Video demo tải về, clip ngắn mp4
│   ├── backups/                 # Các bản backup nén zip, file .bak
│   ├── scripts/                 # Các file batch script cũ
│   └── docs_cu/                 # Bản nháp phân tích cũ, file Excel mẫu
│
├── 📚 docs/                      # TÀI LIỆU DỰ ÁN & BẢO VỆ ĐỒ ÁN
│   ├── PROJECT_ARCHITECTURE.md  # Tài liệu kiến trúc toàn hệ thống
│   ├── DATABASE_DESIGN.md       # Thiết kế CSDL PostgreSQL (ERD, bảng, khóa ngoại)
│   └── API_DOCUMENTATION.md     # Danh sách các endpoints RESTful API
│
├── package.json                 # Monorepo Workspace Controller
├── .gitignore                   # Loại trừ file rác, node_modules, bản backup
└── README.md                    # Tài liệu hướng dẫn này
```

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG

### 1. Khởi chạy Frontend (Giao diện)
```bash
# Di chuyển vào frontend và chạy
npm run dev:frontend

# Hoặc:
cd frontend
npm run dev
```
Ứng dụng sẽ mở tại: `http://localhost:5173`

### 2. Khởi chạy Backend 
1. Đảm bảo dịch vụ PostgreSQL đang chạy (Port 5432) và đã tạo Database `thoitrang_bigsize_db` trong **pgAdmin**.
2. Kiểm tra thông tin đăng nhập trong file `backend/.env`.
3. Chạy các lệnh:
```bash
# Khởi tạo toàn bộ bảng và dữ liệu mẫu vào PostgreSQL
npm run db:init

# Chạy server backend
npm run dev:backend

# Hoặc:
cd backend
npm install
npm run dev
```
Máy chủ backend sẽ lắng nghe tại: `http://localhost:5000`

---

## 👥 TÀI KHOẢN MẪU KHỞI TẠO TRONG HỆ THỐNG

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (ADMIN)** | `admin@bigsize.vn` | `123456` | Toàn quyền cấu hình hệ thống, quản lý tài khoản, phân quyền, xem audit log. |
| **Quản lý cửa hàng (MANAGER)** | `manager@bigsize.vn` | `123456` | Quản lý sản phẩm, tồn kho theo size XL–5XL, cập nhật đơn hàng, duyệt đổi size 7 ngày. |
| **Khách hàng (USER)** | `lan.nguyen@gmail.com` | `123456` | Mua sắm, lưu số đo 3 vòng cơ thể, nhận tư vấn size từ AI, gửi yêu cầu đổi size. |
