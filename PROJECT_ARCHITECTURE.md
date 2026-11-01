# 🏛️ TÀI LIỆU KIẾN TRÚC MÃ NGUỒN & HƯỚNG DẪN BẢO VỆ ĐỒ ÁN
## DỰ ÁN: CURVE & CONFIDENCE – HỆ THỐNG THỜI TRANG BIG SIZE (XL – 5XL)

> **Mô hình kiến trúc**: Monorepo (Tách biệt Frontend Client & Backend Server)  
> **Mô hình vận hành**: Hybrid Cloud-Native (Client kết nối Supabase Cloud PostgreSQL + Express REST API Server chuẩn mực)  
> **Nguyên tắc thiết kế**: Separation of Concerns (SoC), Single Responsibility, 100% Sans-Serif Arial Typography, Zero-Downtime Migration.

---

## 1. TỔNG QUAN CẤU TRÚC THƯ MỤC CẤP CAO (MONOREPO)

```text
Thoi-Trang-BigSize/
├── 📂 frontend/                      # TOÀN BỘ CLIENT-SIDE APPLICATION (REACT + VITE + TAILWIND)
│   ├── 📂 public/                    # Tài nguyên web tĩnh (favicon, icons, logo)
│   ├── 📂 src/
│   │   ├── 📂 modules/               # CÁC THỰC THỂ NGHIỆP VỤ ĐỘC LẬP
│   │   │   ├── 👤 user/             # Khách hàng, Đăng nhập, Hồ sơ, Số đo 3 vòng
│   │   │   ├── 🛡️ admin/            # Cổng Quản trị hệ thống & Cửa hàng trưởng (Module hóa 13 Tabs)
│   │   │   │   ├── layout/          # AdminHeader, AdminSidebar
│   │   │   │   ├── tabs/            # 13 Phân hệ Tabs độc lập:
│   │   │   │   │   ├── SystemDashboardTab.tsx   # [Admin] Tổng quan hạ tầng, biểu đồ SVG
│   │   │   │   │   ├── UserManagementTab.tsx    # [Admin] Quản lý tài khoản, đồng bộ CSDL
│   │   │   │   │   ├── RolePermissionTab.tsx    # [Admin] Ma trận phân quyền RBAC
│   │   │   │   │   ├── SystemSettingsTab.tsx    # [Admin] Cấu hình bảo mật, phiên làm việc
│   │   │   │   │   ├── AuditLogsTab.tsx         # [Admin] Nhật ký hoạt động kiểm toán
│   │   │   │   │   ├── ProductsTab.tsx          # [Manager] Điều phối sản phẩm & modal cropper
│   │   │   │   │   ├── ProductCategoriesTab.tsx # [Manager] Danh mục (Áo, Quần, Đầm, Đồ bộ)
│   │   │   │   │   ├── VariantsAccordionTab.tsx # [Manager] 49 SKU biến thể & bộ lọc tồn kho
│   │   │   │   │   ├── SizeChartsTab.tsx        # [Manager] Bảng thông số kỹ thuật XL-5XL
│   │   │   │   │   ├── InventoryTab.tsx         # [Manager] Quản lý kho, cảnh báo cạn size
│   │   │   │   │   ├── OrdersTab.tsx            # [Manager] Quy trình đơn hàng 3 giai đoạn
│   │   │   │   │   ├── ReturnsTab.tsx           # [Manager] Đổi size & hậu mãi 7 ngày
│   │   │   │   │   ├── VouchersTab.tsx          # [Manager] Khuyến mãi & mã giảm giá
│   │   │   │   │   └── ReportsTab.tsx           # [Manager] Báo cáo doanh thu & cơ cấu size
│   │   │   │   └── AdminPortal.tsx  # Bộ điều hướng & phân quyền RBAC tinh gọn (<470 dòng)
│   │   │   ├── 👗 product/          # Thời trang Big Size XL-5XL, Bảng size, Danh mục
│   │   │   ├── 📦 order/            # Đơn hàng, Thanh toán, Vận chuyển 3PL (GHTK/GHN)
│   │   │   ├── 🛒 cart/             # Giỏ hàng, Mã giảm giá, Tính tiền
│   │   │   ├── 📊 inventory/        # Kiểm kê kho, Cảnh báo cạn size theo từng kích cỡ
│   │   │   ├── 🔄 return/           # Quy trình đổi size miễn phí trong 7 ngày
│   │   │   ├── 🏠 home/             # Giao diện Trang chủ (Hero, Lookbook, Lợi ích)
│   │   │   └── 📰 content/          # Blog phối đồ Big Size & Hỏi đáp FAQ/Liên hệ
│   │   │
│   │   ├── 📂 shared/                # THÀNH PHẦN DÙNG CHUNG TOÀN ỨNG DỤNG
│   │   │   ├── 📁 layout/           # Header, Footer, Navbar, Drawer
│   │   │   ├── 📁 components/       # AIChatbot (Gemini), ConfirmModal, Mascot
│   │   │   ├── 📁 context/          # ToastContext, WishlistContext
│   │   │   ├── 📁 services/         # supabaseClient.ts (Kết nối Supabase Cloud PostgreSQL thật)
│   │   │   ├── 📁 hooks/            # useNavigation.ts
│   │   │   └── 📁 types/            # TypeScript Interfaces & Types dùng chung
│   │   │
│   │   ├── App.tsx                  # Bộ điều hướng trung tâm kết nối các Modules
│   │   ├── main.tsx                 # Điểm khởi chạy React App
│   │   └── index.css                # Toàn bộ CSS quy định font chữ Arial thống nhất
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── 📂 backend/                       # TOÀN BỘ SERVER-SIDE REST API (NODE.JS + EXPRESS + TYPESCRIPT)
│   ├── 📂 src/
│   │   ├── 📁 config/               # Cấu hình môi trường (.env), kết nối PostgreSQL Pool (pg)
│   │   ├── 📁 database/             # Schema SQL, Seed SQL, Script nạp CSDL tự động
│   │   ├── 📁 middlewares/          # JWT authMiddleware, roleMiddleware RBAC, errorHandler
│   │   ├── 📁 modules/              # Phân hệ API RESTful:
│   │   │   ├── auth/                # API Đăng ký, Đăng nhập, cấp JWT Token
│   │   │   ├── admin/               # [ADMIN API] Quản lý users, audit-logs, system settings
│   │   │   ├── manager/             # [MANAGER API] Thống kê, kho hàng, đơn hàng, duyệt đổi size
│   │   │   ├── products/            # [PRODUCT API] Danh mục và biến thể sản phẩm
│   │   │   ├── orders/              # [ORDER API] Tạo và theo dõi đơn hàng
│   │   │   ├── user/                # [USER API] Thông tin cá nhân và số đo 3 vòng
│   │   │   └── ai/                  # [AI API] Trợ lý gợi ý size qua Google Gemini
│   │   ├── 📁 routes/               # Gom routes chuẩn (/api/v1/...)
│   │   └── server.ts                # Express Server (Port 5000)
│   ├── package.json
│   └── tsconfig.json
│
├── 📂 Linh_tinh/                     # TÁCH BIỆT FILE PHỤ, BACKUP & MEDIA CÁ NHÂN
│   ├── 📁 media/                    # Các video tư liệu
│   ├── 📁 backups/                  # Các bản backup nén an toàn
│   └── 📁 docs_cu/                  # Phân rã 7 Module Excel, file dump
│
├── Chay_Website.bat                 # Trung tâm điều khiển 1 chạm Localhost
├── PROJECT_ARCHITECTURE.md          # Tài liệu kiến trúc dự án
└── AGENTS.md                        # Quy tắc hoạt động chuẩn mực (8 Quy tắc bắt buộc)
```

---

## 2. BẢNG TRA CỨU NHANH CHO BUỔI BẢO VỆ / REVIEW VỚI GIẢNG VIÊN

Khi giảng viên chỉ định kiểm tra bất kỳ chức năng nào, hãy mở trực tiếp đường dẫn file tương ứng dưới đây:

| Câu hỏi của Giảng viên | Phân hệ phụ trách | Đường dẫn File chính xác | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **"Đâu là code quản lý tài khoản và số đo của User?"** | `user` | [frontend/src/modules/user/pages/ProfilePage.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/frontend/src/modules/user/pages/ProfilePage.tsx)<br>[frontend/src/modules/user/context/AuthContext.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/frontend/src/modules/user/context/AuthContext.tsx)<br>[backend/src/modules/user/user.routes.ts](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/backend/src/modules/user/user.routes.ts) | Quản lý thông tin cá nhân, phân quyền (Admin / Manager / Customer) và lưu trữ số đo chiều cao, cân nặng, ngực, eo, mông để AI gợi ý size. |
| **"Hệ thống Quản trị Admin được phân chia thế nào?"** | `admin` | [frontend/src/modules/admin/AdminPortal.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/frontend/src/modules/admin/AdminPortal.tsx)<br>[frontend/src/modules/admin/tabs/](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/frontend/src/modules/admin/tabs)<br>[backend/src/modules/admin/admin.routes.ts](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/backend/src/modules/admin/admin.routes.ts) | Tách rời 13 Tabs độc lập: Quản trị hệ thống (Dashboard, Users, RBAC, Settings, Logs) và Vận hành shop (Products, Variants, Size Charts, Inventory, Orders, Returns, Vouchers, Reports). |
| **"Sản phẩm Big Size và bảng size XL–5XL xử lý ở đâu?"** | `product` | [frontend/src/modules/product/pages/ProductsPage.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/frontend/src/modules/product/pages/ProductsPage.tsx)<br>[frontend/src/modules/admin/tabs/SizeChartsTab.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/frontend/src/modules/admin/tabs/SizeChartsTab.tsx)<br>[backend/src/modules/products/product.routes.ts](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/backend/src/modules/products/product.routes.ts) | Danh mục quần áo Big Size chuẩn phom, bảng đo kích thước 3 vòng theo từng size (XL, 2XL, 3XL, 4XL, 5XL) phục vụ người ngoại cỡ từ 75kg - 138kg. |
| **"Logic đặt hàng và tích hợp đơn vị vận chuyển 3PL?"** | `order` | [frontend/src/modules/order/pages/CheckoutPage.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/frontend/src/modules/order/pages/CheckoutPage.tsx)<br>[frontend/src/modules/admin/tabs/OrdersTab.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/frontend/src/modules/admin/tabs/OrdersTab.tsx)<br>[backend/src/modules/orders/order.routes.ts](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/backend/src/modules/orders/order.routes.ts) | Xử lý giỏ hàng sang đơn hàng, tính phí ship, mã vận đơn và timeline theo dõi trạng thái từ GHTK/GHN/Viettel Post. |
| **"Chính sách đổi size 7 ngày đặc thù của đồ Big Size?"** | `return` | [frontend/src/modules/return/components/ReturnModal.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/frontend/src/modules/return/components/ReturnModal.tsx)<br>[frontend/src/modules/admin/tabs/ReturnsTab.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/frontend/src/modules/admin/tabs/ReturnsTab.tsx) | Hỗ trợ khách hàng gửi yêu cầu đổi size miễn phí tận nhà trong 7 ngày kèm ảnh/video minh chứng và giao diện xem bằng chứng chuyên nghiệp. |
| **"Kiểm soát tồn kho và cảnh báo cạn size đặt ở đâu?"** | `inventory` | [frontend/src/modules/admin/tabs/InventoryTab.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/frontend/src/modules/admin/tabs/InventoryTab.tsx)<br>[backend/src/modules/manager/manager.routes.ts](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/backend/src/modules/manager/manager.routes.ts) | Giám sát số lượng tồn theo từng biến thể (Màu + Size), tự động kích hoạt cảnh báo khi tồn kho xuống dưới ngưỡng an toàn (<10 cái). |
| **"Trợ lý AI Stylist tư vấn size tích hợp như thế nào?"** | `shared` & `ai` | [frontend/src/shared/components/AIChatbot.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/frontend/src/shared/components/AIChatbot.tsx)<br>[backend/src/modules/ai/ai.routes.ts](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/backend/src/modules/ai/ai.routes.ts) | Kết nối Google Gemini API với System Prompt chuyên gia định hình phong cách, tư vấn phom dáng che khuyết điểm cho người mặc đồ Big Size. |

---

## 3. TIÊU CHUẨN KỸ THUẬT & ĐẢM BẢO CHẤT LƯỢNG

1. **Phân chia độc lập Monorepo (Frontend & Backend)**:
   - `frontend/`: 100% Client-side React 19, Vite, Tailwind CSS, TypeScript.
   - `backend/`: 100% Server-side Node.js, Express, Middleware JWT, RBAC, TypeScript, PostgreSQL Pool.
2. **Kiến trúc Vận hành Hybrid Cloud-Native**:
   - Tối ưu hóa tuyệt đối: Frontend đồng bộ trực tiếp với Supabase Cloud PostgreSQL thật (`https://vucrgwryaerhphparchc.supabase.co`).
   - Tốc độ phản hồi tức thì, không bị nghẽn mạng trung gian, 1 click deploy lên Vercel là chạy live ngay.
3. **Biên dịch & Tối ưu hóa**:
   - `frontend`: `tsc -b && vite build` hoàn thành trong **3.18 giây**, **0 cảnh báo, 0 lỗi TypeScript**.
   - `backend`: `tsc` hoàn thành với **0 lỗi cú pháp**.
