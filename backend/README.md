# 👗 BACKEND API: CURVE & CONFIDENCE (THỜI TRANG BIG SIZE)

Hệ thống API RESTful Backend được xây dựng bằng **Node.js + Express (TypeScript)** và cơ sở dữ liệu **PostgreSQL** (chạy cục bộ và quản lý qua **pgAdmin**).

---

## 🗄️ 1. CẤU TRÚC THƯ MỤC BACKEND

```text
backend/
├── src/
│   ├── config/               # Cấu hình môi trường (.env), kết nối PostgreSQL, Gemini AI
│   ├── database/             # Cơ sở dữ liệu PostgreSQL
│   │   ├── schema.sql        # Kịch bản DDL tạo toàn bộ bảng (Users, BodyProfiles, Variants XL-5XL,...)
│   │   ├── seed.sql          # Dữ liệu khởi tạo (3 tài khoản mẫu, đồ Big Size chuẩn phom)
│   │   ├── initDb.ts         # Script nạp tự động schema + seed vào PostgreSQL
│   │   ├── connection.ts     # PostgreSQL Connection Pool (pg)
│   │   └── models/           # TypeScript Data Models
│   ├── middlewares/          # Bộ lọc trung gian (JWT auth, Role-based access control, Error handling)
│   ├── modules/              # Các phân hệ chức năng:
│   │   ├── auth/             # Đăng ký, đăng nhập, lấy token JWT
│   │   ├── admin/            # [ROLE: ADMIN] Quản lý user, phân quyền, xem audit log, cài đặt hệ thống
│   │   ├── manager/          # [ROLE: MANAGER/ADMIN] Quản lý sản phẩm, tồn kho theo size, duyệt đổi hàng 7 ngày
│   │   ├── user/             # [ROLE: USER] Quản lý thông tin, lưu số đo 3 vòng, lịch sử đơn hàng
│   │   ├── products/         # [PUBLIC] Xem danh mục sản phẩm, lọc theo size (XL - 5XL)
│   │   ├── orders/           # [PUBLIC/USER] Đặt hàng, theo dõi mã vận đơn (GHTK/GHN)
│   │   └── ai/               # AI Stylist tư vấn kích cỡ theo số đo cơ thể qua Google Gemini
│   ├── routes/               # Bộ gom routes chuẩn (/api/v1/...)
│   └── server.ts             # Điểm khởi chạy Express server (Port 5000)
├── .env.example              # Mẫu biến môi trường
├── .env                      # Cấu hình môi trường thực tế (chứa mật khẩu PostgreSQL máy bạn)
├── package.json              # Quản lý thư viện phụ thuộc
└── tsconfig.json             # Cấu hình TypeScript
```

---

## 🚀 2. HƯỚNG DẪN KẾT NỐI VỚI PGADMIN & KHỞI CHẠY

### Bước 1: Tạo Database trên pgAdmin
1. Mở **pgAdmin 4** trên máy tính của bạn.
2. Đăng nhập vào PostgreSQL Server (mặc định port `5432`).
3. Chuột phải vào mục **Databases** -> Chọn **Create** -> **Database...**
4. Nhập tên Database là: `thoitrang_bigsize_db` rồi bấm **Save**.

### Bước 2: Cập nhật mật khẩu trong file `.env`
Mở file `backend/.env` và điền mật khẩu tài khoản `postgres` máy bạn:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=mat_khau_postgres_cua_ban
DB_NAME=thoitrang_bigsize_db
```

### Bước 3: Cài đặt thư viện và Khởi tạo Bảng dữ liệu tự động
Mở terminal trong thư mục `backend` và chạy:
```bash
# 1. Cài đặt thư viện phụ thuộc
npm install

# 2. Khởi tạo toàn bộ bảng và dữ liệu mẫu tự động vào PostgreSQL
npm run db:init

# 3. Khởi chạy máy chủ Backend ở chế độ phát triển
npm run dev
```

Server sẽ lắng nghe tại: `http://localhost:5000`  
Endpoint kiểm tra trạng thái: `http://localhost:5000/health`

---

## 👥 3. TÀI KHOẢN MẪU KHỞI TẠO SẴN

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn truy cập |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (ADMIN)** | `admin@bigsize.vn` | `123456` | Toàn quyền hệ thống, phân quyền, xem nhật ký truy vết bảo mật |
| **Quản lý cửa hàng (MANAGER)** | `manager@bigsize.vn` | `123456` | Thêm sửa sản phẩm, kiểm kê kho theo size XL-5XL, duyệt đổi size 7 ngày |
| **Khách hàng (USER)** | `lan.nguyen@gmail.com` | `123456` | Mua sắm, lưu số đo 3 vòng cơ thể, gửi yêu cầu đổi size |
