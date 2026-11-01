const nodemailer = require('nodemailer');

function createMailTransporter() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass?.trim()) {
    throw new Error('Chức năng gửi hóa đơn qua email chưa được cấu hình');
  }
  return {
    user,
    transporter: nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    }),
  };
}

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString('vi-VN') + '₫';
}

function getPaymentMethodLabel(method) {
  switch (method) {
    case 'vnpay':
      return 'Cổng VNPay (Thẻ ATM / Tài khoản ngân hàng / VNPAY-QR)';
    case 'vietqr':
      return 'Chuyển khoản VietQR 24/7';
    case 'momo':
      return 'Ví điện tử MoMo';
    case 'cod':
    default:
      return 'Thanh toán tiền mặt khi nhận hàng';
  }
}

function generateInvoiceHtml(order, recipientName) {
  const customerName = recipientName || order.shippingAddress?.fullName || 'Quý khách';
  const paymentLabel = getPaymentMethodLabel(order.paymentMethod);
  const isPaid = order.paymentStatus === 'paid';
  const paymentBadge = isPaid
    ? '<span style="display:inline-block;padding:4px 10px;background-color:#ecfdf5;color:#047857;border-radius:9999px;font-size:12px;font-weight:700;border:1px solid #a7f3d0;">✓ Đã thanh toán</span>'
    : '<span style="display:inline-block;padding:4px 10px;background-color:#fffbeb;color:#b45309;border-radius:9999px;font-size:12px;font-weight:700;border:1px solid #fde68a;">⏳ Chờ thanh toán khi nhận hàng (COD)</span>';

  const itemsHtml = (order.items || [])
    .map((item, index) => {
      const pName = item.product?.name || item.name || 'Sản phẩm Curve & Confidence';
      const pSize = item.size || '-';
      const pColor = item.colorName || item.color || '-';
      const pQty = item.quantity || 1;
      const pPrice = item.price || 0;
      const pTotal = pPrice * pQty;

      return `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:14px 10px;font-size:13px;color:#1C1917;font-weight:600;">
            ${index + 1}. ${pName}
            <div style="font-size:11px;color:#78716c;margin-top:3px;font-weight:normal;">
              Kích cỡ: <strong style="color:#5C1D24;">${pSize}</strong> | Màu sắc: ${pColor}
            </div>
          </td>
          <td style="padding:14px 10px;text-align:center;font-size:13px;color:#44403c;font-weight:600;">
            ${pQty}
          </td>
          <td style="padding:14px 10px;text-align:right;font-size:13px;color:#44403c;font-family:monospace;">
            ${formatCurrency(pPrice)}
          </td>
          <td style="padding:14px 10px;text-align:right;font-size:13px;color:#5C1D24;font-weight:700;font-family:monospace;">
            ${formatCurrency(pTotal)}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Hóa đơn điện tử #${order.id} - CURVE & CONFIDENCE</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no, address=no, email=no, date=no">
  <style>
    /* Suppress auto-link color/underline for Google Maps & iOS data detectors */
    a[x-apple-data-detectors],
    a[href*="maps.google.com"],
    a[href*="maps.apple.com"],
    .no-map-link,
    .no-map-link a {
      color: #57534e !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
      border: none !important;
      pointer-events: none !important;
      cursor: default !important;
    }
  </style>
</head>
<body id="body" style="margin:0;padding:0;background-color:#F5F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1C1917;line-height:1.5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5F5F0;padding:30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #e7e5e4;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #5C1D24 0%, #3e1217 100%);padding:32px 30px;text-align:center;">
              <h1 style="margin:0;color:#D4AF37;font-size:22px;letter-spacing:2px;font-weight:800;text-transform:uppercase;">
                CURVE & CONFIDENCE
              </h1>
              <p style="margin:6px 0 0;color:#fef3c7;font-size:12px;letter-spacing:1px;text-transform:uppercase;">
                Thời Trang May Đo Big Size Cao Cấp
              </p>
            </td>
          </tr>

          <!-- Welcome & Status -->
          <tr>
            <td style="padding:28px 30px 20px;">
              <div style="text-align:center;margin-bottom:20px;">
                <span style="display:inline-block;padding:5px 14px;background-color:#fdf8ec;color:#92400e;border:1px solid #fde68a;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                  Xác Nhận Hóa Đơn Điện Tử
                </span>
                <h2 style="margin:12px 0 4px;font-size:20px;color:#1c1917;font-weight:800;">
                  Cảm Ơn Bạn Đã Đặt Hàng!
                </h2>
                <p style="margin:0;font-size:13px;color:#78716c;">
                  Kính gửi <strong>${customerName}</strong>, đơn hàng của bạn đã được ghi nhận vào hệ thống của Curve & Confidence.
                </p>
                <div style="margin-top:8px;">${paymentBadge}</div>
              </div>

              <!-- Order Overview Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fbf9f5;border-radius:14px;border:1px solid #e7e5e4;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:6px 10px;font-size:12px;color:#78716c;">Mã đơn hàng:</td>
                  <td style="padding:6px 10px;font-size:13px;color:#5C1D24;font-weight:800;text-align:right;font-family:monospace;">
                    ${order.id}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 10px;font-size:12px;color:#78716c;">Thời gian đặt:</td>
                  <td style="padding:6px 10px;font-size:12px;color:#1c1917;font-weight:600;text-align:right;">
                    ${order.createdAt || new Date().toLocaleString('vi-VN')}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 10px;font-size:12px;color:#78716c;">Phương thức thanh toán:</td>
                  <td style="padding:6px 10px;font-size:12px;color:#1c1917;font-weight:600;text-align:right;">
                    ${paymentLabel}
                  </td>
                </tr>
              </table>

              <!-- Shipping Info -->
              <div style="background-color:#ffffff;border:1px solid #e7e5e4;border-radius:14px;padding:16px;margin-bottom:24px;">
                <h3 style="margin:0 0 10px;font-size:13px;color:#5C1D24;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">
                  📍 Thông Tin Giao Hàng
                </h3>
                <p style="margin:0 0 4px;font-size:13px;color:#1c1917;font-weight:600;">
                  ${order.shippingAddress?.fullName || customerName} – ${order.shippingAddress?.phone || ''}
                </p>
                <p class="no-map-link" style="margin:0;font-size:12px;color:#57534e;line-height:1.5;">
                  <span style="color:#57534e !important;text-decoration:none !important;border:none !important;display:inline-block;">
                    ${order.shippingAddress?.addressDetail || ''}${order.shippingAddress?.ward ? ', ' + order.shippingAddress.ward : ''}${order.shippingAddress?.district ? ', ' + order.shippingAddress.district : ''}${order.shippingAddress?.province ? ', ' + order.shippingAddress.province : ''}
                  </span>
                </p>
              </div>

              <!-- Product Details Table -->
              <h3 style="margin:0 0 12px;font-size:13px;color:#5C1D24;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">
                🛍️ Chi Tiết Sản Phẩm May Đo
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:20px;border-top:2px solid #5C1D24;">
                <thead>
                  <tr style="background-color:#fbf9f5;border-bottom:1px solid #e7e5e4;">
                    <th style="padding:10px;text-align:left;font-size:11px;color:#78716c;text-transform:uppercase;">Sản phẩm</th>
                    <th style="padding:10px;text-align:center;font-size:11px;color:#78716c;text-transform:uppercase;width:40px;">SL</th>
                    <th style="padding:10px;text-align:right;font-size:11px;color:#78716c;text-transform:uppercase;width:90px;">Đơn giá</th>
                    <th style="padding:10px;text-align:right;font-size:11px;color:#78716c;text-transform:uppercase;width:95px;">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Pricing Summary -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:4px 0;font-size:12px;color:#78716c;">Tạm tính tiền hàng:</td>
                  <td style="padding:4px 0;font-size:13px;color:#1c1917;text-align:right;font-family:monospace;">
                    ${formatCurrency(order.subtotal || order.total)}
                  </td>
                </tr>
                ${order.discountAmount ? `
                <tr>
                  <td style="padding:4px 0;font-size:12px;color:#047857;">Giảm giá voucher:</td>
                  <td style="padding:4px 0;font-size:13px;color:#047857;text-align:right;font-family:monospace;">
                    -${formatCurrency(order.discountAmount)}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding:4px 0;font-size:12px;color:#78716c;">Phí vận chuyển:</td>
                  <td style="padding:4px 0;font-size:13px;color:#1c1917;text-align:right;font-family:monospace;">
                    ${order.shippingFee ? formatCurrency(order.shippingFee) : 'Miễn phí'}
                  </td>
                </tr>
                <tr style="border-top:2px solid #5C1D24;">
                  <td style="padding:12px 0 4px;font-size:14px;color:#1c1917;font-weight:800;text-transform:uppercase;">
                    Tổng Cộng Thanh Toán:
                  </td>
                  <td style="padding:12px 0 4px;font-size:18px;color:#5C1D24;font-weight:900;text-align:right;font-family:monospace;">
                    ${formatCurrency(order.total)}
                  </td>
                </tr>
              </table>

              <!-- Brand Guarantees -->
              <div style="background-color:#fbf9f5;border-left:4px solid #D4AF37;padding:14px 16px;border-radius:8px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#5C1D24;">
                  ✨ Đặc quyền thương hiệu Curve & Confidence:
                </p>
                <ul style="margin:0;padding-left:18px;font-size:11px;color:#57534e;line-height:1.6;">
                  <li>Hỗ trợ đổi trả / đổi size tận nơi trong vòng 7 ngày nếu không vừa vặn.</li>
                  <li>Đội ngũ tư vấn may đo sẵn sàng hỗ trợ tinh chỉnh phom dáng hoàn hảo.</li>
                </ul>
              </div>

              <!-- Contact Footer -->
              <div style="text-align:center;padding-top:16px;border-top:1px solid #e7e5e4;">
                <p style="margin:0 0 6px;font-size:12px;color:#78716c;">
                  Nếu bạn cần hỗ trợ về đơn hàng, vui lòng liên hệ ngay với chúng tôi:
                </p>
                <p style="margin:0;font-size:12px;color:#1c1917;">
                  📞 Hotline: <strong style="color:#5C1D24;">1900 6868</strong> | ✉ Email: <strong style="color:#5C1D24;">shopbigsize47@gmail.com</strong>
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="background-color:#1c1917;padding:18px 30px;text-align:center;color:#a8a29e;font-size:11px;">
              © ${new Date().getFullYear()} CURVE & CONFIDENCE. All rights reserved.<br>
              Chuyên thời trang may đo cao cấp Big Size từ 60kg - 130kg.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

async function sendInvoiceMail({ order, recipientEmail, recipientName }) {
  if (!order || !recipientEmail) {
    throw new Error('Thiếu thông tin đơn hàng hoặc địa chỉ email người nhận');
  }

  const { user, transporter } = createMailTransporter();
  const html = generateInvoiceHtml(order, recipientName);
  const info = await transporter.sendMail({
    from: { name: 'CURVE & CONFIDENCE', address: user },
    to: recipientEmail,
    subject: `[Hóa Đơn #${order.id}] Xác nhận đơn hàng tại CURVE & CONFIDENCE`,
    html,
  });

  return { success: true, messageId: info.messageId };
}

// Vercel Serverless Function Handler
const recentInvoiceSends = new Map();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Chỉ hỗ trợ phương thức POST' });
  }

  const bearer = req.headers.authorization;
  if (typeof bearer !== 'string' || !/^Bearer \S+$/.test(bearer)) {
    return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để gửi hóa đơn điện tử.' });
  }

  const { order, recipientEmail, recipientName } = req.body || {};
  const rawOrderId = order?.id || req.body?.orderId;
  if (!rawOrderId || !/^BS-HD0?[1-9]\d*$/.test(String(rawOrderId))) {
    return res.status(400).json({ success: false, error: 'Mã đơn hàng không hợp lệ.' });
  }
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(recipientEmail).trim())) {
    return res.status(400).json({ success: false, error: 'Địa chỉ email người nhận không hợp lệ.' });
  }

  // Rate limit: Tối đa 1 lần gửi mỗi 30 giây cho cùng 1 mã đơn hàng
  const now = Date.now();
  const lastSent = recentInvoiceSends.get(String(rawOrderId));
  if (lastSent && now - lastSent < 30000) {
    return res.status(429).json({ success: false, error: 'Hóa đơn đã được gửi gần đây. Vui lòng đợi 30 giây trước khi gửi lại.' });
  }

  // Verify caller identity and order ownership with Supabase
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return res.status(503).json({ success: false, error: 'Dịch vụ xác thực máy chủ chưa sẵn sàng.' });
  }

  let verifiedOrder;
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: bearer },
      signal: AbortSignal.timeout(6000),
    });

    if (!userRes.ok) {
      return res.status(401).json({ success: false, error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    }

    // Check order access via Supabase RLS using the caller's bearer token
    const numericId = Number(String(rawOrderId).replace(/^BS-HD0?/, ''));
    const orderRes = await fetch(
      `${supabaseUrl}/rest/v1/hoadon?ma_hd=eq.${numericId}&select=ma_hd,ngay_dat,tong_tien_hang,giam_gia,phi_van_chuyen,thanh_tien,trang_thai_don,trang_thai_tt,dia_chi_giao,ten_nguoi_nhan,phuong_thuc_tt,chitiethoadon(*,chitietsanpham(sku,mau_sac,bangsize(kich_co),sanpham(ten_sp)))`,
      {
        headers: { apikey: anonKey, Authorization: bearer },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!orderRes.ok) return res.status(502).json({ success: false, error: 'Chưa tải được hóa đơn từ máy chủ. Vui lòng thử lại.' });
    const rows = await orderRes.json();
    if (!Array.isArray(rows) || rows.length !== 1) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền truy cập hoặc gửi hóa đơn cho đơn hàng này.' });
    }

    const dbRow = rows[0];
    if (dbRow.trang_thai_don === 'Cancelled') {
      return res.status(409).json({
        success: false,
        error: 'Đơn hàng đã bị hủy, không thể gửi email xác nhận đặt hàng thành công.',
      });
    }
    if (dbRow.phuong_thuc_tt !== 'COD' && dbRow.trang_thai_tt !== 'da_thanh_toan') {
      return res.status(409).json({
        success: false,
        error: 'Đơn hàng thanh toán trực tuyến (VNPay) chưa được xác nhận thanh toán thành công, chưa thể gửi hóa đơn xác nhận.',
      });
    }

    const items = (dbRow.chitiethoadon || []).map((ct) => ({
      product: { name: ct.ten_sp_mua || ct.chitietsanpham?.sanpham?.ten_sp || 'Sản phẩm' },
      name: ct.ten_sp_mua || ct.chitietsanpham?.sanpham?.ten_sp || 'Sản phẩm',
      size: ct.kich_co_mua || ct.chitietsanpham?.bangsize?.kich_co || '-',
      colorName: ct.chitietsanpham?.mau_sac || '-',
      quantity: ct.so_luong,
      price: ct.don_gia,
    }));

    verifiedOrder = {
      id: rawOrderId,
      total: Number(dbRow.thanh_tien),
      subtotal: Number(dbRow.tong_tien_hang),
      shippingFee: Number(dbRow.phi_van_chuyen || 0),
      discountAmount: Number(dbRow.giam_gia || 0),
      createdAt: dbRow.ngay_dat,
      paymentMethod: ({ COD: 'cod', Online: 'vnpay' })[dbRow.phuong_thuc_tt] || (dbRow.phuong_thuc_tt === 'COD' ? 'cod' : 'vnpay'),
      paymentStatus: dbRow.trang_thai_tt === 'da_thanh_toan' ? 'paid' : 'pending',
      shippingAddress: {
        fullName: dbRow.ten_nguoi_nhan || recipientName || 'Quý khách',
        email: recipientEmail,
      },
      items,
    };
  } catch (authErr) {
    console.warn('⚠️ Lỗi xác thực người gọi gửi hóa đơn:', authErr);
    return res.status(502).json({ success: false, error: 'Không thể xác thực phiên làm việc máy chủ.' });
  }

  try {
    const result = await sendInvoiceMail({
      order: verifiedOrder,
      recipientEmail: recipientEmail.trim(),
      recipientName: recipientName || verifiedOrder.shippingAddress?.fullName,
    });
    recentInvoiceSends.set(String(rawOrderId), Date.now());
    return res.status(200).json(result);
  } catch (error) {
    console.error('Không gửi được email hóa đơn.');
    return res.status(500).json({ success: false, error: 'Chưa gửi được hóa đơn. Vui lòng thử lại sau.' });
  }
};

module.exports.generateInvoiceHtml = generateInvoiceHtml;
module.exports.sendInvoiceMail = sendInvoiceMail;
