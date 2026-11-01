# Chuyển tài khoản khách mẫu sang Supabase Auth

> Cập nhật quy ước ngày 25/10/2026: người dùng không cung cấp/lưu khóa Admin ở máy. Công cụ Admin API bên dưới được giữ làm phương án kỹ thuật chưa thực thi; **không phải bước bắt buộc và không tiếp tục yêu cầu điền key**. Hiện tiếp tục qua đăng ký/Google chuẩn hoặc thao tác Auth do chủ project tự thực hiện trong Dashboard. Không thay bằng SQL INSERT trực tiếp vào auth.users. Chưa có tài khoản nào được tạo bởi công cụ này.

## Phạm vi

Công cụ local `migrate-demo-customers.cjs` dùng Admin API chính thức. Nó tạo Auth cho khách đã có trong `taikhoan` và `khachhang`, không tạo hồ sơ nghiệp vụ mới hoặc đổi khóa/liên kết đơn hàng. Quyền vẫn do `taikhoan.role` quyết định, không lấy từ metadata Auth.

Mặc định chỉ xem trước. Chỉ áp dụng cho `khach_hang` đang hoạt động, thiếu Auth, có email chuẩn hóa không trùng. Tài khoản Google/Auth đã có được bỏ qua, kể cả chưa có mật khẩu. Không đổi mật khẩu, xác nhận email hoặc gán quyền lại cho tài khoản hiện hữu. Nhóm admin/manager/nhân viên cần kế hoạch riêng.

Lần Codex xem trước ngày 25/10/2026: 6 khách cần tạo, 3 khách đã có Auth; Tài khoản khách đang cần kiểm thử thuộc nhóm cần tạo. Chưa tạo tài khoản thật vì kết nối MCP chỉ đọc và chưa có khóa Admin cục bộ.

## Cấu hình một lần trên máy của chủ project

Mở `backend/.env` (Git đã bỏ qua), điền:

```dotenv
SUPABASE_URL=https://vucrgwryaerhphparchc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
AUTH_DEMO_PASSWORD=
```

Có thể dùng `SUPABASE_SECRET_KEY` thay cho `SUPABASE_SERVICE_ROLE_KEY`. Lấy khóa Admin trong cấu hình API của đúng project bằng tài khoản owner; không dùng publishable/anon key cho công cụ này. Không gửi key hoặc mật khẩu vào chat, không đặt trong `VITE_*`, không commit `.env`. Sau khi xong có thể bỏ các giá trị Admin/password khỏi file; không cần để chúng trong ứng dụng chạy thường ngày.

Điền mật khẩu ban đầu bạn chọn vào `AUTH_DEMO_PASSWORD`. Nếu giữ mật khẩu demo đã thống nhất cho môn học, chỉ dùng cho các tài khoản thử do bạn quản lý. Công cụ không lưu mật khẩu vào bảng nghiệp vụ, console hoặc báo cáo; Supabase Auth băm và xác thực mật khẩu.

## Xem trước và áp dụng

Chạy từ gốc repository:

```powershell
npm run auth:preview --workspace=backend
```

Xem danh sách đầy đủ trong `scratch/auth-migration-result.json` (Git bỏ qua). Chỉ khi đã kiểm tra danh sách và xác nhận đây là email demo do bạn quản lý:

```powershell
npm run auth:apply --workspace=backend
```

Lệnh apply chủ động bật `--demo-emails-confirmed`: tạo mới với email được chủ project xác nhận để đăng nhập ngay. Đây là thao tác admin cho tập tài khoản demo, không phải quy trình xác minh email của khách đăng ký mới. Không dùng tự xác nhận hàng loạt cho email khách thật chưa xác minh.

Muốn thử riêng tài khoản đang vướng trước khi làm cả nhóm (thay email ví dụ bằng email khách đã chọn):

```powershell
npm run auth:preview --workspace=backend -- --email email-khach@example.com
npm run auth:apply --workspace=backend -- --email email-khach@example.com
```

Công cụ không gửi email/invite; email hóa đơn của luồng thử mua hàng là thao tác khác đã được người dùng cho phép riêng.

Nếu mới chỉ cần xem bản snapshot chỉ đọc đã chuẩn bị, không cần khóa Admin:

```powershell
node backend/scripts/migrate-demo-customers.cjs --snapshot scratch/auth-customer-snapshot.json
```

Snapshot chỉ để xem trước, không được dùng apply. Apply luôn đọc lại Cloud, phân trang hết Auth rồi kiểm tra lại trước từng tài khoản.

## Khi gián đoạn

Admin API không có giao dịch bao trùm toàn bộ batch. Nếu lỗi giữa chừng, những tài khoản đã tạo vẫn tồn tại; báo cáo ghi `complete:false` và trạng thái đã thực hiện. Chạy lại sẽ bỏ qua Auth đã có, không reset mật khẩu và không xóa tài khoản để rollback. Lỗi không xác định cần kiểm tra danh sách Auth trước khi thử lại.

## Kiểm chứng

Sau apply, đăng nhập khách trong tab `127.0.0.1:5174` bằng email/mật khẩu vừa cấu hình. Kiểm tra vẫn thấy đúng đơn cũ và quyền khách, manager không đọc được mật khẩu. Khi tài khoản khách hoạt động mới tiếp tục kiểm thử đặt đơn → quản lý → tra cứu cập nhật tự động.

Tài liệu API: https://supabase.com/docs/reference/javascript/auth-admin-createuser và https://supabase.com/docs/reference/javascript/auth-admin-listusers . Không thao tác trực tiếp `auth.users` bằng SQL hoặc khôi phục nhánh mật khẩu seed phía frontend.
