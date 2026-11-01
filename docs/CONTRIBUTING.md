# Cộng tác cùng nhóm

## Lấy code và chạy localhost

Cài Node.js 22.12 trở lên (khuyến nghị bản LTS còn được hỗ trợ), Git và dùng tài khoản GitHub đã được mời vào repository.

```bash
git clone https://github.com/Kain-Nguyen/bigsize-shop.git
cd bigsize-shop
npm ci
```

Sao chép `.env.example` thành `.env` ở thư mục gốc và `frontend/.env.example` thành `frontend/.env`. Xin cấu hình môi trường phát triển từ chủ dự án qua kênh riêng. Không commit các tệp `.env` thật.

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: cấu hình Supabase dành cho trình duyệt. Không dùng service-role key. Các policy trên database phải kiểm soát quyền thực sự.
- `VITE_GOOGLE_CLIENT_ID`, `VITE_RECAPTCHA_SITE_KEY`: cấu hình công khai của Google; cần cho phép địa chỉ localhost và các domain dùng thử trong dịch vụ tương ứng.
- `EMAIL_USER`, `EMAIL_PASS`: chỉ đặt trong `.env` ở thư mục gốc để API gửi hóa đơn ở localhost sử dụng. Để trống nếu không thử gửi email. Không đặt tiền tố `VITE_` cho mật khẩu.

```bash
npm run dev
```

Mở `http://localhost:5173`. Nếu thay đổi `.env`, khởi động lại dev server. Thiếu cấu hình email sẽ khiến tính năng gửi email báo chưa được cấu hình; không sử dụng mật khẩu dự phòng.

Backend Express là tiến trình riêng. Nếu cần dùng, sao chép `backend/.env.example` thành `backend/.env`, cấu hình PostgreSQL và một JWT secret ngẫu nhiên riêng, rồi chạy `npm run dev:backend`.

## Quy trình mỗi lỗi hoặc chức năng

```bash
git switch main
git pull --ff-only origin main
git switch -c codex/fix-short-description
# Sửa và kiểm tra chức năng tại localhost
npm run build
git add <cac-tep-da-kiem-tra>
git commit -m "fix: describe the change"
git push -u origin codex/fix-short-description
```

Chỉ bắt đầu khi các thay đổi trước đã được commit hoặc lưu an toàn. Mỗi công việc dùng tên nhánh riêng. Mở Pull Request vào `main`, nhờ thành viên khác kiểm tra, xử lý xung đột và kiểm tra bản Preview nếu dự án Vercel đã kết nối GitHub. Gộp PR đã đạt yêu cầu; không force-push `main`.

## Vercel và dữ liệu dùng chung

Chỉ dùng một project Vercel cho trang thành phẩm. Chủ dự án cấu hình Git integration và Production Branch là `main`. Khi cấu hình này hoạt động, gộp code vào `main` có thể tự triển khai production. Không để mỗi người deploy production trực tiếp từ bản code chưa gộp ở máy mình.

Trên Vercel, đặt `EMAIL_USER` và mật khẩu ứng dụng Gmail MỚI trong `EMAIL_PASS` qua Environment Variables, chọn môi trường cần dùng rồi triển khai lại. Mỗi môi trường có cấu hình riêng. Không đưa `.vercel/` hay token Vercel lên GitHub.

Localhost và Preview vẫn thay đổi database thật nếu dùng cùng Supabase project với Production. Khuyến nghị dùng một Supabase Cloud riêng cho phát triển và kiểm thử. Cấu hình hiện tại có fallback trỏ về project dùng chung: xác nhận cấu hình trước khi thao tác. Không chạy seed, migration hay `db:init` trên dữ liệu dùng chung khi chưa thống nhất với nhóm.

## Những việc bảo mật chưa hoàn tất

- Thu hồi mật khẩu ứng dụng Gmail cũ đã xuất hiện trong lịch sử Git. Xóa khỏi phiên bản mới không xóa khỏi commit cũ; chưa viết lại lịch sử repository.
- Gemini hiện gọi từ trình duyệt qua `VITE_GEMINI_API_KEY`. Biến `VITE_` có thể xuất hiện trong bản build; cần chuyển việc gọi AI sang server trước khi dùng khóa riêng.
- VNPay hiện có cấu hình sandbox và secret ký ở frontend. Cần chuyển ký/xác minh thanh toán sang server trước khi dùng thanh toán thật.
- `backend/src/database/security_fix_rls.sql` có policy cấp quyền rộng cho `anon` và `authenticated`. Không dùng script này như một cấu hình bảo mật an toàn; cần kiểm tra policy thực tế trên Supabase Cloud.
- Phân quyền suy luận từ email/tên và state trình duyệt không thay thế xác thực phía server/database. API gửi email cần bổ sung kiểm soát người gửi và giới hạn tần suất trước khi mở rộng sử dụng.
- README/SQL seed hiện có tài khoản mẫu và hash mật khẩu. Xác minh không phải tài khoản hoặc thông tin cá nhân thật trước khi công khai repo.

Giữ repository ở chế độ Private trong khi xử lý các mục trên. Tài liệu này không xác nhận hệ thống đã qua kiểm định bảo mật đầy đủ.
