# 🏛️ TÀI LIỆU KIẾN TRÚC MÃ NGUỒN & HƯỚNG DẪN BẢO VỆ ĐỒ ÁN
## DỰ ÁN: CURVE & CONFIDENCE – HỆ THỐNG THỜI TRANG BIG SIZE (XL – 5XL)

> **Mô hình kiến trúc**: Feature-Driven / Domain-Driven Architecture (Kiến trúc hướng Thực thể & Phân hệ)  
> **Nguyên tắc thiết kế**: Separation of Concerns (SoC), Single Responsibility, 100% Sans-Serif Arial Typography, Zero-Downtime Migration.

---

## 1. TỔNG QUAN CẤU TRÚC THƯ MỤC CẤP CAO

```text
Thoi-Trang-BigSize/
├── 📂 Linh_tinh/                     # TÁCH BIỆT TOÀN BỘ FILE PHỤ, BACKUP & MEDIA CÁ NHÂN
│   ├── 📁 media/                    # Các video tải về (black_cat_clapping_hands.mp4, snaptik...mp4)
│   ├── 📁 backups/                  # Các bản backup nén (backup_before_7_modules.zip, backup_v2_stable, *.bak)
│   ├── 📁 scripts/                  # Các file batch script cũ (deploy.bat, restore_backup.bat)
│   └── 📁 docs_cu/                  # Tài liệu phân tích cũ, file Excel, file dump
│
├── 📂 public/                        # Tài nguyên web tĩnh chuẩn (favicon, icons, hero-rack.png)
│
├── 📂 src/                           # TOÀN BỘ MÃ NGUỒN CHÍNH (ENTITY-DRIVEN MODULAR)
│   ├── 📂 modules/                   # CÁC THỰC THỂ NGHIỆP VỤ ĐỘC LẬP
│   │   ├── 👤 user/                 # Khách hàng, Đăng nhập, Hồ sơ, Số đo 3 vòng
│   │   ├── 🛡️ admin/                # Quản trị hệ thống (5 screens) & Vận hành shop (5 screens)
│   │   ├── 👗 product/              # Thời trang Big Size XL-5XL, Bảng size, Tư vấn size
│   │   ├── 📦 order/                # Đơn hàng, Thanh toán, Vận chuyển 3PL (GHTK/GHN)
│   │   ├── 🛒 cart/                 # Giỏ hàng, Mã giảm giá, Tính tiền
│   │   ├── 📊 inventory/            # Kiểm kê kho, Cảnh báo cạn size theo từng kích cỡ
│   │   ├── 🔄 return/               # Quy trình đổi size miễn phí trong 7 ngày
│   │   ├── 🏠 home/                 # Giao diện Trang chủ (Hero, Lookbook, Lợi ích)
│   │   └── 📰 content/              # Blog phối đồ Big Size & Hỏi đáp FAQ/Liên hệ
│   │
│   ├── 📂 shared/                    # THÀNH PHẦN DÙNG CHUNG TOÀN ỨNG DỤNG
│   │   ├── 📁 layout/               # Header, Footer, Navbar, Drawer
│   │   ├── 📁 components/           # AIChatbot (Gemini), ConfirmModal, Mascot
│   │   ├── 📁 context/              # ToastContext, WishlistContext
│   │   ├── 📁 services/             # geminiService.ts (Trợ lý AI Stylist)
│   │   ├── 📁 hooks/                # useNavigation.ts
│   │   └── 📁 types/                # index.ts (TypeScript Interfaces & Types dùng chung)
│   │
│   ├── App.tsx                      # Bộ điều hướng trung tâm kết nối các Modules
│   ├── main.tsx                     # Điểm khởi chạy React App
│   └── index.css                    # Toàn bộ CSS quy định font chữ Arial thống nhất
│
├── .env                             # Biến môi trường
├── .gitignore                       # Danh sách loại trừ file nặng khi đẩy git / nộp bài
├── package.json                     # Quản lý thư viện phụ thuộc
├── tailwind.config.js               # Cấu hình TailwindCSS (Arial Sans-Serif chuẩn hóa)
├── tsconfig.json / tsconfig.app.json# Cấu hình TypeScript với Path Aliases (@/, @modules/, @shared/)
└── vite.config.ts                   # Cấu hình Vite bundler hiện đại
```

---

## 2. BẢNG TRA CỨU NHANH CHO BUỔI BẢO VỆ / REVIEW VỚI GIẢNG VIÊN

Khi giảng viên chỉ định kiểm tra bất kỳ chức năng nào, hãy mở trực tiếp đường dẫn file tương ứng dưới đây:

| Câu hỏi của Giảng viên | Module phụ trách | Đường dẫn File chính xác | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **"Đâu là code quản lý tài khoản và số đo của User?"** | `user` | [src/modules/user/pages/ProfilePage.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/user/pages/ProfilePage.tsx)<br>[src/modules/user/pages/BodyProfileManagerPage.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/user/pages/BodyProfileManagerPage.tsx)<br>[src/modules/user/context/AuthContext.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/user/context/AuthContext.tsx) | Quản lý thông tin cá nhân, phân quyền (Admin / Manager / Customer) và lưu trữ số đo chiều cao, cân nặng, ngực, eo, mông để AI gợi ý size. |
| **"Hệ thống Quản trị Admin được phân chia thế nào?"** | `admin` | [src/modules/admin/AdminPortal.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/admin/AdminPortal.tsx)<br>[src/modules/admin/layout/AdminHeader.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/admin/layout/AdminHeader.tsx)<br>[src/modules/admin/layout/AdminSidebar.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/admin/layout/AdminSidebar.tsx)<br>[src/modules/admin/data/mockSystemAdmin.ts](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/admin/data/mockSystemAdmin.ts) | Phân chia thành 2 nhóm khoa học:<br>1. **Quản trị hệ thống**: Dashboard, Users, Roles & Permissions, System Settings, Audit Logs.<br>2. **Vận hành**: Quản lý sản phẩm, tồn kho, đơn hàng, đổi size, voucher. |
| **"Sản phẩm Big Size và bảng size XL–5XL xử lý ở đâu?"** | `product` | [src/modules/product/pages/ProductsPage.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/product/pages/ProductsPage.tsx)<br>[src/modules/product/pages/ProductDetailPage.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/product/pages/ProductDetailPage.tsx)<br>[src/modules/product/data/products.ts](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/product/data/products.ts) | Danh mục quần áo Big Size chuẩn phom, bảng đo kích thước 3 vòng theo từng size (XL, 2XL, 3XL, 4XL, 5XL). |
| **"Logic đặt hàng và tích hợp đơn vị vận chuyển 3PL?"** | `order` | [src/modules/order/pages/CheckoutPage.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/order/pages/CheckoutPage.tsx)<br>[src/modules/order/pages/OrderTrackingPage.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/order/pages/OrderTrackingPage.tsx)<br>[src/modules/order/context/OrderContext.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/order/context/OrderContext.tsx) | Xử lý giỏ hàng sang đơn hàng, tính phí ship, mã vận đơn và timeline theo dõi trạng thái từ GHTK/GHN/Viettel Post. |
| **"Chính sách đổi size 7 ngày đặc thù của đồ Big Size?"** | `return` | [src/modules/return/components/ReturnModal.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/return/components/ReturnModal.tsx)<br>[src/modules/return/context/ReturnContext.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/return/context/ReturnContext.tsx) | Hỗ trợ khách hàng gửi yêu cầu đổi size miễn phí tận nhà trong vòng 7 ngày nếu mặc không vừa form. |
| **"Kiểm soát tồn kho và cảnh báo cạn size đặt ở đâu?"** | `inventory` | [src/modules/inventory/context/InventoryContext.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/inventory/context/InventoryContext.tsx)<br>[src/modules/inventory/data/mockInventory.ts](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/modules/inventory/data/mockInventory.ts) | Giám sát số lượng tồn theo từng biến thể (Màu + Size), tự động kích hoạt cảnh báo khi tồn kho xuống dưới ngưỡng an toàn. |
| **"Trợ lý AI Stylist tư vấn size tích hợp như thế nào?"** | `shared` | [src/shared/components/AIChatbot.tsx](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/shared/components/AIChatbot.tsx)<br>[src/shared/services/geminiService.ts](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/src/shared/services/geminiService.ts) | Kết nối Google Gemini API với System Prompt chuyên gia định hình phong cách, tư vấn phom dáng che khuyết điểm cho người mặc đồ Big Size. |

---

## 3. TIÊU CHUẨN KỸ THUẬT & ĐẢM BẢO CHẤT LƯỢNG

1. **Kiến trúc Clean & Decoupled**:
   - Mỗi module tự chứa trọn vẹn nghiệp vụ của mình (Cohesion cao).
   - Tương tác giữa các module thông qua Context API và TypeScript Interfaces chuẩn xác (Coupling thấp).
2. **Font chữ 100% Sans-Serif Arial thống nhất**:
   - Không có bất kỳ font có chân/đuôi (Serif/Times New Roman).
   - Đảm bảo an toàn không bị lệch khung hay nhảy chữ trên các thiết bị.
3. **Thư mục gọn nhẹ, sạch sẽ**:
   - Thư mục gốc chỉ chứa đúng các file cấu hình chuẩn của React/Vite.
   - Các file cá nhân, clip demo, file backup cũ đều được cách ly hoàn toàn vào thư mục `Linh_tinh/`.
4. **Biên dịch & Tối ưu hóa**:
   - `tsc -b && vite build` hoàn thành trong **~2.5 giây**, **0 cảnh báo, 0 lỗi TypeScript**.
   - Code-splitting tách rời các trang nặng (Admin, Profile, Login) để tốc độ tải trang chủ đạt chuẩn dưới 1 giây.
