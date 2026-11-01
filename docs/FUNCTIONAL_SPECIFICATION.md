# 📋 TÀI LIỆU ĐẶC TẢ CHI TIẾT CHỨC NĂNG (FUNCTIONAL SPECIFICATION DOCUMENT - FSD)
## DỰ ÁN CAPSTONE PROJECT: HỆ THỐNG THỜI TRANG BIG SIZE TRỰC TUYẾN (CURVE & CONFIDENCE)
- **Môn học**: ISP392 / Capstone Project IS2004
- **Giảng viên hướng dẫn**: Thầy Trần Thanh Nguyên
- **Nhóm thực hiện**: Nguyễn Thị Kiều Duyên, Trương Khánh Ngân, Nguyễn Cao Quốc Khánh, Nguyễn Nho Toàn
- **Quy mô hệ thống**: 7 Phân hệ (Modules) | 16 Phân hệ con (Sub-modules) | 50 Chức năng (Functions)
- **Phiên bản tài liệu**: 2.0 (Chuẩn hóa Kiến trúc Hệ thống thực tế & Master Data First)

---

## MỤC LỤC TỔNG QUAN 7 PHÂN HỆ
1. [Module 1: Xác Thực & Quản Lý Người Dùng](#module-1-xác-thực--quản-lý-người-dùng)
2. [Module 2: Quản Trị Sản Phẩm & Hệ Thống (Master Data)](#module-2-quản-trị-sản-phẩm--hệ-thống-master-data)
3. [Module 3: Tìm Kiếm Sản Phẩm & Tư Vấn Size Chuẩn Phom](#module-3-tìm-kiếm-sản-phẩm--tư-vấn-size-chuẩn-phom)
4. [Module 4: Giỏ Hàng & Quản Lý Đơn Hàng](#module-4-giỏ-hàng--quản-lý-đơn-hàng)
5. [Module 5: Quản Lý Tồn Kho & Kiểm Kê Định Kỳ](#module-5-quản-lý-tồn-kho--kiểm-kê-định-kỳ)
6. [Module 6: Tích Hợp Thanh Toán & Vận Chuyển 3PL](#module-6-tích-hợp-thanh-toán--vận-chuyển-3pl)
7. [Module 7: Hậu Mãi Đổi Size 7 Ngày & Hủy Đơn Hàng](#module-7-hậu-mãi-đổi-size-7-ngày--hủy-đơn-hàng)

---

## QUY ƯỚC CHUNG VỀ BUSINESS RULES (QUY TẮC NGHIỆP VỤ) CỐT LÕI
- **BR-SKU**: Mỗi biến thể sản phẩm là duy nhất theo cặp `(Màu sắc, Kích cỡ)` trên cùng một sản phẩm cha.
- **BR-SIZE-RANGE**: Bảng size Big Size bắt buộc phải tuân theo dải size từ `XL` đến `5XL`. Mọi dải đo (Ngực, Eo, Mông, Cân nặng, Chiều cao) phải có `Min <= Max`.
- **BR-STOCK-HOLD**: Khi khách hàng tiến hành thanh toán Online, hệ thống giữ chỗ số lượng `so_luong_giu += 1` trong thời hạn tối đa 15 phút. Quá 15 phút không hoàn tất, hệ thống tự động giải phóng (Release).
- **BR-EXCHANGE-7D**: Khách hàng chỉ được gửi yêu cầu đổi size miễn phí trong vòng 7 ngày kể từ khi đơn hàng đạt trạng thái `delivered` (Đã giao hàng thành công).
- **BR-ROLE-ACCESS**: Hệ thống phân định nghiêm ngặt 3 vai trò:
  - `ADMIN`: Quản trị hệ thống, tài khoản nhân sự, phân quyền, audit log, cấu hình.
  - `MANAGER`: Vận hành sản phẩm, danh mục, bảng size, kho hàng, kiểm kê, duyệt đổi trả và đơn hàng.
  - `CUSTOMER`: Khách hàng mua sắm, quản lý số đo cá nhân, đặt hàng, theo dõi giao vận, tạo yêu cầu đổi size.

---

## MODULE 1: XÁC THỰC & QUẢN LÝ NGƯỜI DÙNG

### 1.1. Sub-module: Xác Thực Tài Khoản
#### Chức năng 1.1.1: Đăng ký tài khoản (FR-A01)
- **Actor**: Khách vãng lai (Guest).
- **Điều kiện tiên quyết**: Khách chưa đăng nhập vào hệ thống.
- **Dữ liệu đầu vào (Input)**:
  - `ho_ten`: Chuỗi ký tự, độ dài 2 - 100 ký tự (Bắt buộc).
  - `email`: Chuỗi ký tự, định dạng chuẩn RFC 5322 (Bắt buộc, Duy nhất).
  - `so_dien_thoai`: Chuỗi số 10 chữ số, đầu số Việt Nam (03, 05, 07, 08, 09) (Bắt buộc).
  - `mat_khau`: Tối thiểu 8 ký tự, gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 số (Bắt buộc).
  - `xac_nhan_mat_khau`: Khớp chính xác với `mat_khau`.
- **Quy tắc kiểm tra (Validation Rules)**:
  - Chặn đăng ký nếu email đã tồn tại trong bảng `TaiKhoan` (Báo lỗi: *"Email đã được sử dụng"*).
  - Chặn số điện thoại sai định dạng viễn thông Việt Nam.
  - Chặn mật khẩu yếu không đủ độ phức tạp.
- **Dữ liệu đầu ra (Output)**:
  - Tạo 1 bản ghi trong bảng `TaiKhoan` với `role = 'CUSTOMER'`, mật khẩu được hash bằng bcrypt.
  - Tạo 1 bản ghi tương ứng trong bảng `KhachHang` với `ma_tk` liên kết.
  - Trả về thông báo thành công và chuyển hướng đến màn hình Đăng nhập.
- **Kịch bản kiểm thử (Test Cases)**:
  - *TC-A01-POS*: Nhập đầy đủ thông tin hợp lệ -> Đăng ký thành công, tạo dữ liệu trong DB.
  - *TC-A01-NEG1*: Nhập email trùng với tài khoản đã có -> Hiển thị cảnh báo lỗi, không tạo mới.
  - *TC-A01-NEG2*: Nhập mật khẩu < 8 ký tự -> Nút đăng ký bị vô hiệu hóa kèm thông báo vi phạm chính sách bảo mật.

#### Chức năng 1.1.2: Đăng nhập & Đăng xuất (FR-A02)
- **Actor**: Guest, Customer, Manager, Administrator.
- **Dữ liệu đầu vào (Input)**:
  - `email` hoặc `so_dien_thoai`: Bắt buộc.
  - `mat_khau`: Bắt buộc.
  - `ghi_nho_dang_nhap`: Boolean (Lưu phiên làm việc 30 ngày qua Refresh Token).
- **Quy tắc nghiệp vụ & Validation**:
  - So khớp mật khẩu đã hash bcrypt.
  - Nếu tài khoản có `trang_thai = 'blocked'` -> Từ chối đăng nhập với lý do *"Tài khoản đã bị tạm khóa bởi Quản trị viên"*.
  - Điều hướng thông minh theo Role sau khi đăng nhập thành công:
    - `ADMIN` -> `/admin/dashboard`
    - `MANAGER` -> `/manager/products`
    - `CUSTOMER` -> Trang trước đó hoặc Trang chủ `/`
- **Dữ liệu đầu ra (Output)**:
  - Cấp cặp Token JWT: `accessToken` (thời hạn 15 phút) và `refreshToken` (thời hạn 7 ngày / 30 ngày).
  - Trả về thông tin cá nhân và quyền hạn (`role`) vào Context ứng dụng.

#### Chức năng 1.1.3: Khôi phục mật khẩu (FR-A03)
- **Actor**: Khách hàng, Quản lý, Quản trị viên quên mật khẩu.
- **Input**: `email` đăng ký.
- **Validation**: Kiểm tra email có tồn tại trong hệ thống.
- **Output**: Tạo token khôi phục ngẫu nhiên (thời hạn 15 phút), gửi email kèm link reset mật khẩu an toàn.

---

### 1.2. Sub-module: Quản Lý Hồ Sơ & Phân Quyền
#### Chức năng 1.2.1: Quản lý thông tin cá nhân (FR-A04)
- **Actor**: Customer.
- **Input**: `ho_ten`, `so_dien_thoai`, `ngay_sinh`, `gioi_tinh`, `avatar`.
- **Validation**: Số điện thoại hợp lệ; ngày sinh không vượt quá ngày hiện tại.
- **Output**: Cập nhật thông tin trong bảng `TaiKhoan` và hiển thị trực quan tại trang Profile cá nhân.

#### Chức năng 1.2.2: Quản lý sổ địa chỉ giao hàng (FR-A05)
- **Actor**: Customer.
- **Input**: `ho_ten_nguoi_nhan`, `so_dien_thoai`, `tinh_thanh`, `quan_huyen`, `phuong_xa`, `dia_chi_chi_tiet`, `loai_dia_chi` (Nhà riêng/Văn phòng), `mac_dinh` (Boolean).
- **Business Rule**: Mỗi khách hàng chỉ có duy nhất 1 địa chỉ được đánh dấu `mac_dinh = true`. Khi đặt địa chỉ mới làm mặc định, địa chỉ cũ tự động chuyển về `false`.
- **Output**: Danh sách địa chỉ giao hàng được lưu trữ phục vụ cho bước Checkout nhanh.

#### Chức năng 1.2.3: Quản lý tài khoản & Phân quyền (FR-A06)
- **Actor**: Administrator.
- **Input**: `user_id`, `role` (`ADMIN`, `MANAGER`, `CUSTOMER`), `trang_thai` (`active`, `blocked`).
- **Business Rule (Bảo mật tối cao)**:
  - Administrator không được phép tự hạ quyền hoặc tự khóa tài khoản của chính mình.
  - Phải có ít nhất 1 tài khoản `ADMIN` ở trạng thái `active` trong toàn hệ thống.
  - Mọi thao tác đổi quyền hoặc khóa tài khoản phải ghi nhận vào bảng `AuditLog`.

---

## MODULE 2: QUẢN TRỊ SẢN PHẨM & HỆ THỐNG (MASTER DATA)

### 2.1. Sub-module: Quản Lý Danh Mục, Sản Phẩm & Biến Thể
#### Chức năng 2.1.1: Quản lý Danh mục sản phẩm (FR-M01.1)
- **Actor**: Manager.
- **Input**: `ten_danh_muc` (Duy nhất), `mo_ta`, `thu_tu_hien_thi`, `trang_thai` (`hien_thi`, `an`).
- **Validation**: Tên danh mục không được để trống, không được trùng lặp.
- **Business Rule**: Không được xóa danh mục nếu đang có sản phẩm trực thuộc. Muốn ẩn danh mục phải chuyển trạng thái `trang_thai = 'an'`.

#### Chức năng 2.1.2: Quản lý Thông tin sản phẩm tổng thể (FR-M01.2)
- **Actor**: Manager.
- **Input**:
  - `ma_sp`: Mã định danh (Ví dụ: `SP-POLO-01`, Duy nhất).
  - `ten_sp`: Tên sản phẩm thời trang Big Size.
  - `ma_danh_muc`: Khóa ngoại tham chiếu `DanhMuc`.
  - `mo_ta_chat_lieu`: Thông số độ co giãn (Co giãn 4 chiều, Cotton compact 280gsm giấu bụng).
  - `hinh_anh_chinh`, `album_anh`: URLs hình ảnh.
- **Validation**: Mã sản phẩm không trùng; danh mục cha phải tồn tại.

#### Chức năng 2.1.3: Quản lý Biến thể sản phẩm Product Variant (SKU) (FR-M01.3)
- **Actor**: Manager.
- **Input**:
  - `ma_sp`: Sản phẩm cha.
  - `kich_co`: Thuộc tập `['XL', '2XL', '3XL', '4XL', '5XL']`.
  - `mau_sac`: Tên màu (Đen, Xanh Navy, Xám Melange, Trắng Sữa,...).
  - `ma_mau_hex`: Mã màu hiển thị giao diện `#5C1D24`.
  - `sku`: Mã SKU duy nhất tự động tạo hoặc nhập thủ công (Ví dụ: `POLO-01-BLK-2XL`).
  - `don_gia`: Giá bán niêm yết (Số nguyên > 0, đơn vị VNĐ).
  - `so_luong_ton`: Tồn kho ban đầu (Số nguyên >= 0).
- **Validation & Business Rules (BR-SKU)**:
  - Cấm trùng lặp cặp `(kich_co, mau_sac)` trên cùng sản phẩm cha.
  - Giá bán biến thể không được nhỏ hơn 10.000 VNĐ và không vượt quá 50.000.000 VNĐ.

#### Chức năng 2.1.4: Quản lý Bảng Size Chart Big Size chuẩn may đo (FR-M01.4)
- **Actor**: Manager.
- **Input**:
  - `ma_sp`: Sản phẩm cha áp dụng bảng đo.
  - `kich_co`: `XL`, `2XL`, `3XL`, `4XL`, `5XL`.
  - `chieu_cao_min`, `chieu_cao_max`: Chiều cao khuyến nghị (cm).
  - `can_nang_min`, `can_nang_max`: Cân nặng khuyến nghị (kg).
  - `vong_nguc_min`, `vong_nguc_max`: Số đo vòng 1 (cm).
  - `vong_eo_min`, `vong_eo_max`: Số đo vòng bụng/vòng 2 (cm) - *Chỉ số quan trọng nhất cho đồ Big Size*.
  - `vong_mong_min`, `vong_mong_max`: Số đo vòng 3 (cm).
- **Validation Rules**:
  - Bắt buộc `Min <= Max` ở tất cả các dải đo.
  - Các dải cân nặng giữa các size liền kề không được chồng chéo quá 50% để tránh thuật toán gợi ý size bị phân vân.

---

### 2.2. Sub-module: Quản Lý Giá Bán & Khuyến Mãi
#### Chức năng 2.2.1: Quản lý chính sách giá bán (FR-M02.1)
- **Actor**: Manager.
- **Input**: `ma_ctsp`, `gia_goc`, `gia_khuyen_mai`.
- **Business Rule**: `gia_khuyen_mai` bắt buộc phải `< gia_goc`. Tự động tính phần trăm giảm giá hiển thị badge `-25%`.

#### Chức năng 2.2.2: Quản lý Voucher khuyến mãi & Hỗ trợ vận chuyển (FR-M02.2)
- **Actor**: Manager.
- **Input**:
  - `code`: Mã voucher (Viết hoa không dấu, ví dụ: `FREESHIP50K`, `BIGSIZE100K`).
  - `loai_voucher`: Phân loại rõ: `SHIPPING` (Giảm phí ship) hoặc `DISCOUNT` (Giảm giá đơn hàng).
  - `loai_giam`: `PERCENT` (%) hoặc `FIXED_AMOUNT` (Số tiền cố định).
  - `gia_tri_giam`, `giam_toi_da`, `don_toi_thieu`.
  - `so_luong_phat_hanh`, `thoi_gian_bat_dau`, `thoi_gian_ket_thuc`.
- **Business Rule**:
  - Hỗ trợ cơ chế **Dual-Voucher Stacking**: Khách hàng được áp dụng đồng thời tối đa **1 Voucher Giảm giá + 1 Voucher Vận chuyển** trong cùng một đơn hàng.

---

### 2.3. Sub-module: Báo Cáo & Thống Kê KPI (FR-M05)
- **Actor**: Manager, Administrator.
- **Output**:
  - Doanh thu thực tế theo ngày/tuần/tháng (chỉ tính các đơn hàng đã thanh toán và không bị hủy/hoàn tiền).
  - Top 5 sản phẩm Big Size bán chạy nhất.
  - Tỷ lệ đổi trả size theo kích cỡ (nhận diện size nào hay bị khách đổi nhất để điều chỉnh xưởng may).
  - Tổng số lượng tồn kho khả dụng và số lượng đang tạm giữ (Hold).

---

## MODULE 3: TÌM KIẾM SẢN PHẨM & TƯ VẤN SIZE CHUẨN PHOM

### 3.1. Sub-module: Tìm Kiếm & Lọc Đa Tiêu Chí (FR-C01)
- **Actor**: Guest, Customer.
- **Input**:
  - Từ khóa tìm kiếm: Tên sản phẩm, chất liệu co giãn.
  - Bộ lọc: Danh mục, Khoảng giá, Kích cỡ (`XL` đến `5XL`), Màu sắc.
- **Output**: Danh sách sản phẩm thỏa mãn tiêu chí với thời gian phản hồi < 500ms.

---

### 3.2. Sub-module: Quản Lý Body Profile & Tư Vấn Size Tự Động
#### Chức năng 3.2.1: Quản lý hồ sơ số đo cơ thể cá nhân (FR-C02)
- **Actor**: Customer.
- **Input**:
  - `ten_ho_so`: Ví dụ: *"Hồ sơ đi làm (Mặc vừa vặn)"*, *"Hồ sơ mặc thoải mái giấu bụng"*.
  - `chieu_cao` (150 - 210 cm), `can_nang` (70 - 180 kg).
  - `vong_nguc`, `vong_eo`, `vong_mong` (cm).
  - `kieu_dang_yeu_thich`: `om_vua` (Slim fit), `tieu_chuan` (Regular fit), `rong_rai` (Loose fit).
- **Business Rule**: Một khách hàng được lưu tối đa 5 hồ sơ số đo (cho bản thân hoặc người thân). Có thể chọn 1 hồ sơ làm mặc định.

#### Chức năng 3.2.2: Thuật toán đối chiếu Size Chart & Recommended Size (FR-C03)
- **Actor**: Guest, Customer.
- **Cơ chế xử lý (Algorithm Logic)**:
  1. Lấy thông số từ Body Profile hoặc số đo tạm thời nhập tại trang chi tiết sản phẩm.
  2. Truy vấn bảng `BangSize` của sản phẩm hiện tại.
  3. Tính toán trọng số phù hợp: Trong đó **Vòng bụng (Vòng eo) chiếm trọng số 45%**, **Cân nặng chiếm 30%**, **Vòng ngực chiếm 15%**, **Chiều cao chiếm 10%**.
  4. Trả về Size gợi ý tốt nhất kèm độ tin cậy (Ví dụ: *"Đề xuất Size 2XL - Phù hợp 95% vóc dáng bụng bia 92kg"*).

#### Chức năng 3.2.3: Trợ lý AI Stylist đa kênh (FR-C04)
- **Actor**: Guest, Customer.
- **Input**: Câu hỏi tự nhiên của khách hàng (Ví dụ: *"Mình cao 1m72 nặng 88kg bụng bia nên mặc áo polo màu gì và size mấy?"*).
- **Xử lý Hybrid Resilience**:
  - *Lớp 1 (Fast Knowledge Engine < 0.05s)*: Bóc tách thực thể số đo (`1m72`, `88kg`) so khớp bảng size trả lời ngay lập tức.
  - *Lớp 2 (Google Gemini LLM Streaming)*: Xử lý các câu hỏi phức tạp về phối màu, chất liệu và phong cách.
- **Output**: Lời khuyên stylist chân thành kèm nút bấm tắt dẫn trực tiếp đến sản phẩm phù hợp.

---

## MODULE 4: GIỎ HÀNG & QUẢN LÝ ĐƠN HÀNG

### 4.1. Sub-module: Quản Lý Giỏ Hàng (FR-C05)
- **Actor**: Customer.
- **Input**: `ma_ctsp` (SKU cụ thể), `so_luong`.
- **Validation**:
  - `so_luong` thêm vào phải > 0 và `<= (so_luong_ton - so_luong_giu)`.
  - Nếu số lượng yêu cầu vượt quá tồn kho khả dụng -> Thông báo: *"Rất tiếc, size này trong kho chỉ còn [X] sản phẩm khả dụng"*.
- **Output**: Giỏ hàng cập nhật tổng tiền tạm tính, tự động lưu trữ trên LocalStorage hoặc đồng bộ vào bảng `ChiTietGioHang` khi đã đăng nhập.

---

### 4.2. Sub-module: Đặt Hàng & Checkout (FR-C06, FR-C07, FR-C08)
#### Quy trình Đặt hàng:
1. **Thông tin giao nhận (FR-C06)**: Chọn từ Sổ địa chỉ hoặc nhập địa chỉ mới.
2. **Áp dụng Voucher**: Kiểm tra điều kiện đơn tối thiểu và tính tiền giảm giá.
3. **Lựa chọn phương thức thanh toán (FR-C07)**:
   - `COD`: Thanh toán tiền mặt khi shipper giao tới.
   - `ONLINE`: Cổng thanh toán (Chuyển khoản / VNPAY / MoMo).
4. **Tạo Đơn hàng & Cơ chế Giữ chỗ (Hold Stock)**:
   - Tạo bản ghi trong `HoaDon` với trạng thái `trang_thai_don = 'pending'`.
   - Snapshot toàn bộ thông tin sản phẩm vào `ChiTietHoaDon` (đảm bảo sau này shop đổi giá thì đơn cũ không bị lệch tiền).
   - Tăng `so_luong_giu` của các SKU tương ứng.
5. **Theo dõi đơn hàng (FR-C08)**: Tra cứu tiến trình theo mã đơn `CC-XXXX` hoặc số điện thoại.

---

## MODULE 5: QUẢN LÝ TỒN KHO & KIỂM KÊ ĐỊNH KỲ

### 5.1. Sub-module: Giám Sát Tồn Kho & Cảnh Báo Cạn Size (FR-W01, FR-W02, FR-W03)
- **Actor**: Manager.
- **Chỉ số quản lý**:
  - Tồn thực tế trong kho: `so_luong_ton`.
  - Tồn tạm giữ cho đơn online/COD: `so_luong_giu`.
  - Tồn khả dụng bán tiếp: `Available = so_luong_ton - so_luong_giu`.
- **Cảnh báo tồn kho thấp (FR-W03)**:
  - Khi `Available <= 3 cái` cho bất kỳ size nào: Đánh dấu badge vàng **"Sắp cạn size"**.
  - Khi `Available = 0`: Đánh dấu badge đỏ **"Hết hàng"**, tự động ẩn nút Thêm giỏ hàng ngoài Web bán lẻ.

---

### 5.2 & 5.3. Sub-module: Kiểm Kê Định Kỳ & Điều Chỉnh Tồn Kho (FR-W04 đến FR-W09)
- **Actor**: Manager.
- **Nghiệp vụ**:
  - Quản lý định kỳ đếm số lượng thực tế tại kệ hàng.
  - Nhập số lượng thực tế đếm được.
  - Hệ thống tính toán chênh lệch: `chenh_lech = so_thuc_te - so_luong_ton`.
  - Bắt buộc Manager phải chọn lý do điều chỉnh (`ly_do`: *Hàng may mẫu thử, Hàng rách hỏng trong kho, Sai lệch kiểm đếm định kỳ*).
  - Cập nhật số lượng mới và lưu lịch sử bất biến vào bảng `LichSuDieuChinhSoLuong` (đảm bảo tính minh bạch, không ai được xóa lịch sử kiểm kê).

---

## MODULE 6: TÍCH HỢP THANH TOÁN & VẬN CHUYỂN 3PL

### 6.1. Sub-module: Tích Hợp Payment Gateway (FR-PG01, FR-PG02, FR-PG03)
- **Actor**: Customer, Payment Gateway.
- **Xử lý Thành công**:
  - Nhận Webhook xác nhận từ Cổng thanh toán.
  - Chuyển `trang_thai_tt = 'paid'`.
  - Chuyển số lượng từ `so_luong_giu` sang trừ hẳn vào `so_luong_ton` (`so_luong_ton -= qty; so_luong_giu -= qty`).
- **Xử lý Thất bại / Hết hạn 15 phút (FR-PG02)**:
  - Khách hủy giao dịch hoặc quá 15 phút không quét mã QR.
  - Chuyển `trang_thai_don = 'cancelled'`.
  - Hoàn trả tồn kho giữ: `so_luong_giu -= qty`.

---

### 6.2. Sub-module: Tích Hợp Đơn Vị Vận Chuyển 3PL (FR-3PL01, FR-3PL02, FR-3PL03)
- **Actor**: Manager, 3PL Carrier (GHTK / GHN / ViettelPost).
- **Nghiệp vụ**:
  - Quản lý duyệt đơn ➔ Bấm nút **"Bàn giao đơn vị vận chuyển"**.
  - Tạo bản ghi trong bảng `VanDon`, cấp mã tracking (Ví dụ: `GHTK-9821412`).
  - Đồng bộ trạng thái: `picking` (Đang lấy hàng) ➔ `shipping` (Đang giao hàng) ➔ `delivered` (Giao thành công).

---

## MODULE 7: HẬU MÃI ĐỔI SIZE 7 NGÀY & HỦY ĐƠN HÀNG

### 7.1. Sub-module: Quy Trình Đổi Size 1:1 Tận Nơi & Trả Hàng (FR-C09)
*Đây là phân hệ độc quyền tạo nên giá trị cốt lõi của đồ án Thời trang Big Size.*
- **Actor**: Customer, Manager.
- **Điều kiện kích hoạt**: Đơn hàng có `trang_thai_don = 'delivered'` và ngày hiện tại <= ngày nhận hàng + 7 ngày.
- **Luồng nghiệp vụ Đổi size 1:1:**
  1. **Khách hàng gửi yêu cầu**: Chọn sản phẩm đã mua, chọn lý do (*Chật bụng bia, Dài áo, Rộng vai*), chọn size mới muốn đổi (Ví dụ: Từ `2XL` sang `3XL`), tải lên ảnh chụp minh chứng.
  2. **Hệ thống giữ trước size mới**: Tăng `so_luong_giu` của size mới để đảm bảo không bị khách khác mua mất trong lúc đợi đổi.
  3. **Manager xét duyệt**: Xem ảnh minh chứng, duyệt yêu cầu đổi size.
  4. **Shipper giao đổi 1:1**: Đơn vị vận chuyển mang áo size mới đến tận nhà khách, đồng thời nhận lại áo size cũ mang về kho.
  5. **Nhập kho & Hoàn tất**: Khi áo cũ về đến kho, Manager kiểm tra nguyên tem mác -> Bấm hoàn tất đổi size.

---

### 7.2. Sub-module: Quản Lý Hủy Đơn Hàng (FR-C10)
- **Trường hợp 1 (Đơn ở trạng thái Pending)**: Khách hàng được quyền tự bấm **"Hủy đơn hàng ngay"**. Hệ thống lập tức giải phóng tồn kho đã giữ.
- **Trường hợp 2 (Đơn đã Confirmed / Đang đóng gói)**: Khách hàng gửi yêu cầu hủy kèm lý do. Manager xét duyệt trước khi hàng được giao cho shipper.
- **Hoàn tiền đơn hủy đã thanh toán online**: Tạo bản ghi trong bảng `HoanTien` để hoàn tiền về tài khoản nguồn của khách hàng.

---

## KẾT LUẬN & CAM KẾT KIẾN TRÚC
Tài liệu này là cơ sở duy nhất để nhóm triển khai mã nguồn, viết mã kiểm thử và đối chiếu tính đúng đắn khi bảo vệ đồ án trước Hội đồng chấm thi. Toàn bộ 50 chức năng được thiết kế đảm bảo tính tương thích tuyệt đối với Cơ sở dữ liệu 21 bảng PostgreSQL đã thống nhất.
