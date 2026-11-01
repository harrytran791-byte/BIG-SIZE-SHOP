import { Request, Response } from 'express';
import { pool } from '../../config/db';

export const checkout = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const {
      customer_name,
      customer_phone,
      shipping_address,
      items,
      payment_method,
      voucher_code,
      notes
    } = req.body;

    // 1. Kiểm tra xác thực người dùng từ JWT
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để tiến hành đặt hàng.'
      });
      return;
    }

    // 2. Kiểm tra và làm sạch dữ liệu đầu vào (Input Validation & Sanitization)
    const normalizedCustomerName = typeof customer_name === 'string' ? customer_name.trim().replace(/\s+/g, ' ') : '';
    const vnNameRegex = /^[\p{L}]+(?:\s[\p{L}]+)*$/u;
    if (
      !normalizedCustomerName ||
      normalizedCustomerName.length < 2 ||
      normalizedCustomerName.length > 100 ||
      !vnNameRegex.test(normalizedCustomerName)
    ) {
      res.status(400).json({
        success: false,
        message: 'Họ tên người nhận không hợp lệ (từ 2 đến 100 ký tự, chỉ gồm chữ cái tiếng Việt và khoảng trắng).'
      });
      return;
    }

    const cleanPhone = (customer_phone || '').toString().trim();
    const vnMobileRegex = /^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])\d{7}$/;
    if (!cleanPhone || !vnMobileRegex.test(cleanPhone)) {
      res.status(400).json({
        success: false,
        message: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số.'
      });
      return;
    }

    if (!shipping_address || typeof shipping_address !== 'string' || shipping_address.trim().length < 5 || shipping_address.trim().length > 500) {
      res.status(400).json({ success: false, message: 'Địa chỉ giao hàng không hợp lệ (từ 5 đến 500 ký tự).' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      res.status(400).json({ success: false, message: 'Giỏ hàng đang trống hoặc số lượng mặt hàng không hợp lệ.' });
      return;
    }

    const validPaymentMethods = ['COD', 'Online', 'Chuyen_khoan'];
    const chosenPaymentMethod = validPaymentMethods.includes(payment_method) ? payment_method : 'COD';
    const isOnlinePayment = chosenPaymentMethod !== 'COD';

    // 3. Khởi tạo Transaction nguyên tử
    await client.query('BEGIN');

    // Xác định hoặc tạo hồ sơ Khách Hàng (KhachHang) tương ứng với tài khoản (TaiKhoan)
    let customerId: number;
    const khRes = await client.query(
      'SELECT ma_kh FROM khachhang WHERE ma_tk = $1 AND trangthai = $2',
      [userId, 'hoat_dong']
    );

    if (khRes.rows.length > 0) {
      customerId = khRes.rows[0].ma_kh;
    } else {
      const newKhRes = await client.query(
        `INSERT INTO khachhang (ma_tk, trangthai)
         VALUES ($1, 'hoat_dong')
         ON CONFLICT (ma_tk) DO UPDATE SET trangthai = 'hoat_dong'
         RETURNING ma_kh`,
        [userId]
      );
      customerId = newKhRes.rows[0].ma_kh;
    }

    // 4. Khóa dòng (FOR UPDATE) biến thể sản phẩm theo thứ tự cố định để chống Race Condition / Deadlock
    // Đồng thời TRUY VẤN LẠI ĐƠN GIÁ THỰC từ CSDL để chống thao túng giá (Price Tampering)
    const variantIdsOrSkus: { variantId?: number; sku?: string; quantity: number }[] = [];
    for (const it of items) {
      const q = parseInt(it.quantity, 10);
      if (!Number.isSafeInteger(q) || q <= 0 || q > 999) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, message: 'Số lượng sản phẩm đặt mua không hợp lệ.' });
        return;
      }
      const vId = it.variant_id || it.ma_ctsp ? parseInt(it.variant_id || it.ma_ctsp, 10) : undefined;
      const sku = it.sku ? String(it.sku).trim() : undefined;
      if (!vId && !sku) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, message: 'Thông tin biến thể sản phẩm (Mã hoặc SKU) không hợp lệ.' });
        return;
      }
      variantIdsOrSkus.push({ variantId: vId, sku, quantity: q });
    }

    interface VerifiedItem {
      ma_ctsp: number;
      ma_sp: number;
      sku: string;
      ten_sp: string;
      kich_co: string;
      mau_sac: string;
      don_gia: number;
      quantity: number;
      subtotal: number;
    }

    const verifiedItems: VerifiedItem[] = [];
    let totalGoodsAmount = 0;

    for (const it of variantIdsOrSkus) {
      let queryStr = `
        SELECT c.ma_ctsp, c.ma_sp, c.sku, c.don_gia, c.so_luong_ton, c.so_luong_giu, c.trang_thai,
               s.ten_sp, b.kich_co, c.mau_sac
        FROM chitietsanpham c
        JOIN sanpham s ON c.ma_sp = s.ma_sp
        JOIN bangsize b ON c.ma_bang_size = b.ma_bang_size
      `;
      const queryParams: any[] = [];
      if (it.variantId) {
        queryParams.push(it.variantId);
        queryStr += ` WHERE c.ma_ctsp = $1 FOR UPDATE OF c`;
      } else {
        queryParams.push(it.sku);
        queryStr += ` WHERE c.sku = $1 FOR UPDATE OF c`;
      }

      const varRes = await client.query(queryStr, queryParams);
      if (varRes.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({
          success: false,
          message: `Biến thể sản phẩm không tồn tại hoặc đã ngừng kinh doanh.`
        });
        return;
      }

      const row = varRes.rows[0];
      if (row.trang_thai !== 'dang_kinh_doanh') {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          message: `Sản phẩm "${row.ten_sp}" hiện đang tạm ngừng kinh doanh.`
        });
        return;
      }

      // 5. TRIỆT TIÊU NGUY CƠ ÂM KHO (Overselling / Negative Stock Protection)
      const availableStock = Number(row.so_luong_ton) - Number(row.so_luong_giu);
      if (availableStock < it.quantity) {
        await client.query('ROLLBACK');
        res.status(409).json({
          success: false,
          message: `Sản phẩm "${row.ten_sp}" (Size ${row.kich_co} - Màu ${row.mau_sac}) không đủ tồn kho (Còn lại: ${Math.max(0, availableStock)}, yêu cầu: ${it.quantity}).`
        });
        return;
      }

      // CHỐNG THAO TÚNG GIÁ: Luôn lấy don_gia từ CSDL
      const realPrice = Number(row.don_gia);
      const subtotal = realPrice * it.quantity;
      totalGoodsAmount += subtotal;

      verifiedItems.push({
        ma_ctsp: row.ma_ctsp,
        ma_sp: row.ma_sp,
        sku: row.sku,
        ten_sp: row.ten_sp,
        kich_co: row.kich_co,
        mau_sac: row.mau_sac,
        don_gia: realPrice,
        quantity: it.quantity,
        subtotal
      });
    }

    // 6. Xử lý Voucher an toàn phía Server (nếu có)
    let discountAmount = 0;
    let voucherId: number | null = null;
    const cleanVoucherCode = voucher_code ? String(voucher_code).trim().toUpperCase() : null;

    if (cleanVoucherCode) {
      const vRes = await client.query(
        `SELECT ma_voucher, code, loai_giam, gia_tri_giam, giam_toi_da, don_toi_thieu, trang_thai
         FROM voucher
         WHERE UPPER(code) = $1 AND trang_thai = 'dang_hoat_dong'
           AND (ngay_bat_dau IS NULL OR ngay_bat_dau <= NOW())
           AND (ngay_ket_thuc IS NULL OR ngay_ket_thuc >= NOW())
         FOR UPDATE`,
        [cleanVoucherCode]
      );

      if (vRes.rows.length > 0) {
        const v = vRes.rows[0];
        const minOrder = Number(v.don_toi_thieu || 0);
        if (totalGoodsAmount >= minOrder) {
          voucherId = v.ma_voucher;
          if (v.loai_giam === 'phan_tram') {
            discountAmount = Math.round((totalGoodsAmount * Number(v.gia_tri_giam)) / 100);
          } else {
            discountAmount = Number(v.gia_tri_giam);
          }
          if (v.giam_toi_da != null) {
            discountAmount = Math.min(discountAmount, Number(v.giam_toi_da));
          }
          discountAmount = Math.min(totalGoodsAmount, Math.max(0, discountAmount));
        }
      }
    }

    // 7. Tính phí vận chuyển chuẩn (Miễn phí từ 500.000₫)
    const shippingFee = totalGoodsAmount >= 500000 ? 0 : 30000;
    const finalAmount = Math.max(0, totalGoodsAmount + shippingFee - discountAmount);

    // 8. Tạo đơn hàng vào bảng gốc `hoadon`
    //    Luôn khởi tạo trang_thai_tt = 'chua_thanh_toan', và áp dụng thời hạn giữ hàng 15 phút cho đơn Online
    const orderRes = await client.query(
      `INSERT INTO hoadon (
        ma_kh, ten_nguoi_nhan, sdt_nguoi_nhan, dia_chi_giao,
        tong_tien_hang, giam_gia, phi_van_chuyen, thanh_tien,
        phuong_thuc_tt, trang_thai_tt, trang_thai_don, trang_thai_giu,
        thoi_han_hold, ma_voucher
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        'chua_thanh_toan', 'Pending', 'Reserved',
        CASE WHEN $9 <> 'COD' THEN NOW() + INTERVAL '15 minutes' ELSE NULL END,
        $10
      )
      RETURNING ma_hd, ngay_dat, thoi_han_hold`,
      [
        customerId,
        customer_name.trim(),
        cleanPhone,
        shipping_address.trim(),
        totalGoodsAmount,
        discountAmount,
        shippingFee,
        finalAmount,
        chosenPaymentMethod,
        voucherId
      ]
    );

    const createdOrder = orderRes.rows[0];
    const newOrderId = createdOrder.ma_hd;
    const orderCode = `BS-HD0${newOrderId}`;
    const trackingCode = `GHN${Date.now().toString().slice(-8)}`;

    // 9. Cập nhật giữ tồn kho nguyên tử & Tạo chi tiết đơn hàng vào bảng gốc `chitiethoadon`
    for (const item of verifiedItems) {
      const stockUpdateRes = await client.query(
        `UPDATE chitietsanpham
         SET so_luong_giu = so_luong_giu + $1
         WHERE ma_ctsp = $2 AND (so_luong_ton - so_luong_giu) >= $1`,
        [item.quantity, item.ma_ctsp]
      );

      if (stockUpdateRes.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(409).json({
          success: false,
          message: `Sản phẩm "${item.ten_sp}" vừa có biến động tồn kho. Vui lòng tải lại trang và thử lại.`
        });
        return;
      }

      await client.query(
        `INSERT INTO chitiethoadon (
          ma_hd, ma_ctsp, so_luong, don_gia, thanh_tien,
          sku_mua, ten_sp_mua, kich_co_mua, mau_sac_mua
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          newOrderId,
          item.ma_ctsp,
          item.quantity,
          item.don_gia,
          item.subtotal,
          item.sku,
          item.ten_sp,
          item.kich_co,
          item.mau_sac
        ]
      );
    }

    // 10. Chỉ tạo bản ghi vận đơn ban đầu cho đơn COD (Đơn Online chờ xác nhận thanh toán mới được xử lý vận chuyển)
    if (!isOnlinePayment) {
      await client.query(
        `INSERT INTO vandon (ma_hd, don_vi_van_chuyen, ma_tracking, ngay_ban_giao)
         VALUES ($1, 'GHN', $2, NULL)
         ON CONFLICT (ma_hd) DO NOTHING`,
        [newOrderId, trackingCode]
      );
    }

    // Hoàn tất Transaction
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: isOnlinePayment
        ? 'Đã khởi tạo đơn hàng và tạm giữ tồn kho. Vui lòng hoàn tất thanh toán qua VNPay.'
        : 'Đặt hàng thành công!',
      data: {
        id: newOrderId,
        order_code: orderCode,
        customer_name: customer_name.trim(),
        customer_phone: cleanPhone,
        shipping_address: shipping_address.trim(),
        total_amount: finalAmount,
        subtotal: totalGoodsAmount,
        shipping_fee: shippingFee,
        discount_amount: discountAmount,
        payment_method: chosenPaymentMethod,
        payment_status: 'chua_thanh_toan',
        order_status: 'Pending',
        stock_hold_status: 'Reserved',
        hold_expires_at: createdOrder.thoi_han_hold,
        tracking_code: isOnlinePayment ? '' : trackingCode,
        carrier: 'GHN',
        created_at: createdOrder.ngay_dat,
        items: verifiedItems.map(i => ({
          product_name: i.ten_sp,
          size: i.kich_co,
          color: i.mau_sac,
          quantity: i.quantity,
          price: i.don_gia,
          total_price: i.subtotal,
          sku: i.sku
        }))
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      message: error.message || 'Không thể xử lý đơn hàng. Vui lòng thử lại.'
    });
  } finally {
    client.release();
  }
};

export const trackOrder = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { code } = req.params;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, message: 'Mã tra cứu đơn hàng không hợp lệ.' });
      return;
    }

    const cleanCode = code.trim();
    const cleanNum = cleanCode.replace(/[^0-9]/g, '');

    const result = await client.query(
      `SELECT h.ma_hd AS id,
              ('BS-HD0' || h.ma_hd::text) AS order_code,
              h.ten_nguoi_nhan AS customer_name,
              h.sdt_nguoi_nhan AS customer_phone,
              h.dia_chi_giao AS shipping_address,
              h.tong_tien_hang AS subtotal,
              h.giam_gia AS discount_amount,
              h.phi_van_chuyen AS shipping_fee,
              h.thanh_tien AS total_amount,
              h.phuong_thuc_tt AS payment_method,
              h.trang_thai_tt AS payment_status,
              h.trang_thai_don AS order_status,
              h.trang_thai_giu AS stock_hold_status,
              h.thoi_han_hold AS hold_expires_at,
              COALESCE(v.ma_tracking, '') AS tracking_code,
              COALESCE(v.don_vi_van_chuyen, 'GHN') AS carrier,
              h.ngay_dat AS created_at,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', ct.ma_cthd,
                    'product_name', ct.ten_sp_mua,
                    'size', ct.kich_co_mua,
                    'color', ct.mau_sac_mua,
                    'quantity', ct.so_luong,
                    'price', ct.don_gia,
                    'total_price', ct.thanh_tien,
                    'sku', ct.sku_mua
                  )
                ) FILTER (WHERE ct.ma_cthd IS NOT NULL),
                '[]'::json
              ) AS items
       FROM hoadon h
       LEFT JOIN chitiethoadon ct ON h.ma_hd = ct.ma_hd
       LEFT JOIN vandon v ON h.ma_hd = v.ma_hd
       WHERE h.ma_hd::text = $1
          OR ('BS-HD0' || h.ma_hd::text) = $2
          OR ('HD' || LPAD(h.ma_hd::text, 6, '0')) = $2
          OR v.ma_tracking = $2
       GROUP BY h.ma_hd, v.ma_tracking, v.don_vi_van_chuyen`,
      [cleanNum || '0', cleanCode]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đơn hàng với mã này.' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi tra cứu đơn hàng.' });
  } finally {
    client.release();
  }
};
