# 📚 HỒ SƠ TÀI LIỆU KỸ THUẬT & QUẢN TRỊ ĐỒ ÁN CAPSTONE PROJECT
## DỰ ÁN: CURVE & CONFIDENCE – HỆ THỐNG THỜI TRANG BIG SIZE TRỰC TUYẾN (XL – 5XL)
- **Môn học**: ISP392 / Capstone Project IS2004 (Đồ án Hệ thống thông tin)
- **Giảng viên hướng dẫn**: Thầy Trần Thanh Nguyên
- **Nhóm sinh viên thực hiện**:
  1. Nguyễn Thị Kiều Duyên (Leader) - Phụ trách: Module 2 (Master Data Sản phẩm), Module 5.1 (Tồn kho)
  2. Nguyễn Nho Toàn - Phụ trách: Module 1 (Auth & Users), Module 6 (Payment & 3PL)
  3. Nguyễn Cao Quốc Khánh - Phụ trách: Module 3 (Body Profile & AI), Module 5.2–5.3 (Kiểm kê)
  4. Trương Khánh Ngân - Phụ trách: Module 4 (Giỏ hàng & Đơn hàng), Module 7 (Hậu mãi Đổi size 7 ngày)

---

## 🧭 BẢN ĐỒ TRA CỨU TÀI LIỆU (DOCUMENTATION SITEMAP)

Tất cả các tài liệu kỹ thuật được phân bổ khoa học, chuẩn hóa định dạng Markdown GitHub-style, có thể đọc trực tiếp trên trình soạn thảo hoặc xuất thành PDF để nộp cho Giảng viên hướng dẫn:

| STT | Tên Tài Liệu & Mục Tiêu | Đường Dẫn File Chi Tiết | Ý Nghĩa Trong Buổi Báo Cáo / Chấm Điểm |
| :---: | :--- | :--- | :--- |
| **01** | **Đặc tả Chi tiết 7 Module (FSD)**<br>*(Mô tả chi tiết 50 chức năng, Input/Output, Validation, Business Rules)* | [docs/FUNCTIONAL_SPECIFICATION.md](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/docs/FUNCTIONAL_SPECIFICATION.md) | **Yêu cầu bắt buộc nộp trong tuần này của Thầy**. Chứng minh hệ thống được thiết kế nghiệp vụ đầy đủ, có ràng buộc chặt chẽ. |
| **02** | **Kế hoạch Triển khai Master Data First**<br>*(Thứ tự phát triển dữ liệu nền tảng trước, Business Flow sau)* | [docs/MASTER_DATA_IMPLEMENTATION_PLAN.md](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/docs/MASTER_DATA_IMPLEMENTATION_PLAN.md) | Trả lời yêu cầu số 1 & 3 của Thầy: Chứng minh nhóm phát triển từ lõi dữ liệu sản phẩm/size thay vì làm giao diện chắp vá. |
| **03** | **Kế hoạch & Ma trận Kiểm thử (Test Matrix)**<br>*(38 Kịch bản kiểm thử: Dữ liệu Đúng, Dữ liệu Sai & Biên)* | [docs/TEST_PLAN_AND_MATRIX.md](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/docs/TEST_PLAN_AND_MATRIX.md) | Trả lời yêu cầu số 4 của Thầy: "Code đến đâu test đến đó, kiểm tra cả trường hợp đúng và sai". |
| **04** | **Phương án Dự phòng & Chịu lỗi (Resilience)**<br>*(Kế hoạch Fallback khi AI, Cloud DB, Payment, 3PL gặp sự cố)* | [docs/SYSTEM_RESILIENCE_AND_FALLBACK.md](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/docs/SYSTEM_RESILIENCE_AND_FALLBACK.md) | Trả lời yêu cầu số 5 của Thầy: Đảm bảo hệ thống vận hành thực tế 24/7, không bao giờ bị đơ hay sập khi demo. |
| **05** | **Thiết kế Cơ sở dữ liệu PostgreSQL**<br>*(Sơ đồ ERD 21 bảng, chuẩn 3NF, bảng thuộc tính chi tiết)* | [docs/DATABASE_DESIGN.md](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/docs/DATABASE_DESIGN.md) | Minh chứng cấu trúc quan hệ dữ liệu vững chắc đã được Thầy Trần Thanh Nguyên định hướng thông qua. |
| **06** | **Kiến trúc Mã nguồn & Bảng Tra cứu Nhanh**<br>*(Phân rã thư mục, nguyên tắc SoC, bảng trả lời nhanh câu hỏi)* | [docs/PROJECT_ARCHITECTURE.md](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/docs/PROJECT_ARCHITECTURE.md) | Dùng trực tiếp khi Thầy hỏi: *"Code chức năng X nằm ở file nào?"* để mở đúng file trong vòng 3 giây. |
| **07** | **Tài liệu API RESTful Kết nối**<br>*(Danh mục Endpoints, Headers, Dữ liệu truyền nhận JSON)* | [docs/API_DOCUMENTATION.md](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/docs/API_DOCUMENTATION.md) | Cổng giao tiếp chuẩn xác giữa Giao diện React/Vite và Backend API/Supabase. |

---

## 🎯 HƯỚNG DẪN SỬ DỤNG CHO BUỔI BẢO VỆ TIẾN ĐỘ TUẦN NÀY

1. **Gửi trước cho Thầy**:
   - Gửi file [docs/FUNCTIONAL_SPECIFICATION.md](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/docs/FUNCTIONAL_SPECIFICATION.md) và [docs/MASTER_DATA_IMPLEMENTATION_PLAN.md](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/docs/MASTER_DATA_IMPLEMENTATION_PLAN.md) qua email hoặc hệ thống nộp bài để Thầy thấy nhóm đã hoàn thành đúng hạn việc mô tả chi tiết chức năng trước khi tính khối lượng code.
2. **Khi Thầy hỏi về Kiểm thử**:
   - Mở ngay [docs/TEST_PLAN_AND_MATRIX.md](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/docs/TEST_PLAN_AND_MATRIX.md), chỉ ra tỷ lệ **47.4% test case dành riêng cho dữ liệu sai và trường hợp biên (Negative Testing)**.
3. **Khi Thầy hỏi về Tính thực tiễn & Rủi ro bên thứ ba**:
   - Mở ngay [docs/SYSTEM_RESILIENCE_AND_FALLBACK.md](file:///c:/Users/KY%20ANH/Downloads/Thoi-Trang-BigSize/docs/SYSTEM_RESILIENCE_AND_FALLBACK.md) để trình bày giải pháp Hybrid AI Stylist, Cơ chế Tạm giữ 15 phút, và State Machine vận đơn nội bộ.
