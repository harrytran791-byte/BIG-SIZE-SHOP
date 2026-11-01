import { Request, Response } from 'express';
import { query, pool } from '../../config/db';

// 1. Thống kê tổng quan cửa hàng (Manager / Admin)
export const getStoreStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const revenueRes = await query(
      `SELECT COALESCE(SUM(thanh_tien), 0) as total_revenue, COUNT(ma_hd) as total_orders
       FROM hoadon
       WHERE trang_thai_don = 'Giao_thanh_cong'
         AND NOT EXISTS (SELECT 1 FROM hoantien WHERE ma_hd = hoadon.ma_hd)`
    );
    const lowStockRes = await query(
      "SELECT COUNT(ma_ctsp) as low_stock_count FROM chitietsanpham WHERE (so_luong_ton - so_luong_giu) <= 5 AND trang_thai = 'dang_kinh_doanh'"
    );
    const pendingReturnsRes = await query(
      "SELECT COUNT(ma_ycdt) as pending_returns FROM yeucaudoitra WHERE trang_thai = 'cho_xu_ly'"
    );

    res.json({
      success: true,
      data: {
        totalRevenue: Number(revenueRes.rows[0]?.total_revenue || 0),
        totalOrders: Number(revenueRes.rows[0]?.total_orders || 0),
        lowStockVariants: Number(lowStockRes.rows[0]?.low_stock_count || 0),
        pendingReturnRequests: Number(pendingReturnsRes.rows[0]?.pending_returns || 0),
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Thêm mới sản phẩm Big Size kèm các biến thể XL - 5XL
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, category_id, price, description, fabric_details, images, variants } = req.body;

    const prodRes = await client.query(
      `INSERT INTO sanpham (ten_sp, ma_danh_muc, mo_ta, hinh_anh, trang_thai)
       VALUES ($1, $2, $3, $4, 'dang_kinh_doanh')
       RETURNING *`,
      [name, category_id || null, description, Array.isArray(images) ? images[0] : (images || null)]
    );

    const product = prodRes.rows[0];

    // Chèn biến thể nếu có
    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        // Tìm hoặc chèn bảng size
        let sizeId: number;
        const sizeRes = await client.query(
          'SELECT ma_bang_size FROM bangsize WHERE ma_sp = $1 AND kich_co = $2',
          [product.ma_sp, v.size]
        );
        if (sizeRes.rows.length > 0) {
          sizeId = sizeRes.rows[0].ma_bang_size;
        } else {
          const newSizeRes = await client.query(
            'INSERT INTO bangsize (ma_sp, kich_co) VALUES ($1, $2) RETURNING ma_bang_size',
            [product.ma_sp, v.size]
          );
          sizeId = newSizeRes.rows[0].ma_bang_size;
        }

        const sku = v.sku || `SKU-${product.ma_sp}-${v.size}-${Date.now().toString().slice(-4)}`;
        await client.query(
          `INSERT INTO chitietsanpham (ma_sp, sku, ma_bang_size, mau_sac, don_gia, so_luong_ton, so_luong_giu, trang_thai)
           VALUES ($1, $2, $3, $4, $5, $6, 0, 'dang_kinh_doanh')
           ON CONFLICT (sku) DO UPDATE
           SET so_luong_ton = EXCLUDED.so_luong_ton, don_gia = EXCLUDED.don_gia`,
          [product.ma_sp, sku, sizeId, v.color || 'Đen Tuyển', Number(v.price || price || 350000), Number(v.stock_quantity || 0)]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Thêm sản phẩm Big Size thành công', data: product });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// 3. Quản lý Tồn kho theo từng kích cỡ XL, 2XL, 3XL, 4XL, 5XL
export const updateVariantStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { variantId } = req.params;
    const { stock_quantity } = req.body;

    const newQty = parseInt(stock_quantity, 10);
    if (!Number.isSafeInteger(newQty) || newQty < 0) {
      res.status(400).json({ success: false, message: 'Số lượng tồn kho phải là số nguyên không âm (>= 0).' });
      return;
    }

    // Kiểm tra số lượng đang giữ để chống âm kho khả dụng
    const currentRes = await query('SELECT so_luong_giu FROM chitietsanpham WHERE ma_ctsp = $1', [variantId]);
    if (currentRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy biến thể sản phẩm.' });
      return;
    }
    const currentReserved = Number(currentRes.rows[0].so_luong_giu || 0);
    if (newQty < currentReserved) {
      res.status(400).json({
        success: false,
        message: `Không thể giảm tồn kho xuống ${newQty} vì hệ thống đang tạm giữ ${currentReserved} sản phẩm cho đơn hàng của khách.`
      });
      return;
    }

    const result = await query(
      'UPDATE chitietsanpham SET so_luong_ton = $1 WHERE ma_ctsp = $2 RETURNING *',
      [newQty, variantId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy biến thể sản phẩm.' });
      return;
    }

    res.json({ success: true, message: 'Cập nhật số lượng tồn kho thành công', data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Lấy danh sách cảnh báo cạn size (Dưới 5 cái)
export const getLowStockAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT c.ma_ctsp, c.ma_sp, c.sku, c.don_gia, c.so_luong_ton, c.so_luong_giu,
              (c.so_luong_ton - c.so_luong_giu) as available_quantity,
              s.ten_sp as product_name, b.kich_co as size, c.mau_sac as color
       FROM chitietsanpham c
       JOIN sanpham s ON c.ma_sp = s.ma_sp
       JOIN bangsize b ON c.ma_bang_size = b.ma_bang_size
       WHERE (c.so_luong_ton - c.so_luong_giu) <= 5 AND c.trang_thai = 'dang_kinh_doanh'
       ORDER BY (c.so_luong_ton - c.so_luong_giu) ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Cập nhật trạng thái đơn hàng & Điều phối tồn kho nguyên tử
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { orderId } = req.params;
    const { order_status, tracking_code, carrier } = req.body;

    const rawId = String(orderId || '').trim();
    const numericOrderId = parseInt(rawId.replace(/[^0-9]/g, ''), 10);
    if (!Number.isSafeInteger(numericOrderId) || numericOrderId <= 0) {
      res.status(400).json({ success: false, message: 'Mã đơn hàng không hợp lệ.' });
      return;
    }

    await client.query('BEGIN');

    const orderRes = await client.query(
      'SELECT ma_hd, phuong_thuc_tt, trang_thai_tt, trang_thai_don, trang_thai_giu FROM hoadon WHERE ma_hd = $1 FOR UPDATE',
      [numericOrderId]
    );

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đơn hàng.' });
      return;
    }

    const currentOrder = orderRes.rows[0];
    const currentStatus = currentOrder.trang_thai_don;

    // Chuẩn hóa trạng thái mục tiêu
    const targetStatusMap: Record<string, string> = {
      'confirmed': 'Confirmed',
      'Confirmed': 'Confirmed',
      'preparing': 'Da_lay_hang',
      'Da_lay_hang': 'Da_lay_hang',
      'shipping': 'Dang_giao',
      'Dang_giao': 'Dang_giao',
      'delivered': 'Giao_thanh_cong',
      'Giao_thanh_cong': 'Giao_thanh_cong',
      'cancelled': 'Cancelled',
      'Cancelled': 'Cancelled'
    };

    const targetStatus = targetStatusMap[order_status] || order_status;

    // CHẶN TUYỆT ĐỐI MANAGER XÁC NHẬN, ĐÓNG GÓI HOẶC BÀN GIAO VẬN CHUYỂN ĐƠN VNPAY CHƯA THANH TOÁN THÀNH CÔNG
    if (
      targetStatus !== 'Cancelled' &&
      currentOrder.phuong_thuc_tt !== 'COD' &&
      currentOrder.trang_thai_tt !== 'da_thanh_toan'
    ) {
      await client.query('ROLLBACK');
      res.status(409).json({
        success: false,
        message: 'Đơn hàng thanh toán trực tuyến (VNPay) chưa được xác nhận thanh toán thành công. Quản lý không được xác nhận, đóng gói hoặc bàn giao vận chuyển.'
      });
      return;
    }

    // 1. Nếu chuyển sang bàn giao vận chuyển (Dang_giao): Thực hiện TRỪ TỒN KHO THỰC TẾ
    if (targetStatus === 'Dang_giao' && currentStatus !== 'Dang_giao' && currentStatus !== 'Giao_thanh_cong') {
      const itemsRes = await client.query(
        'SELECT ma_ctsp, SUM(so_luong)::integer as qty FROM chitiethoadon WHERE ma_hd = $1 GROUP BY ma_ctsp',
        [numericOrderId]
      );

      for (const item of itemsRes.rows) {
        await client.query(
          `UPDATE chitietsanpham
           SET so_luong_ton = so_luong_ton - $1,
               so_luong_giu = GREATEST(0, so_luong_giu - $1)
           WHERE ma_ctsp = $2`,
          [item.qty, item.ma_ctsp]
        );
      }

      await client.query(
        "UPDATE hoadon SET trang_thai_giu = 'Deducted' WHERE ma_hd = $1",
        [numericOrderId]
      );
    }

    // 2. Nếu đơn hàng bị HỦY (Cancelled): GIẢI PHÓNG HÀNG ĐANG GIỮ HOẶC HOÀN TỒN KHO NẾU ĐÃ XUẤT KHO
    if (targetStatus === 'Cancelled' && currentStatus !== 'Cancelled') {
      const itemsRes = await client.query(
        'SELECT ma_ctsp, SUM(so_luong)::integer as qty FROM chitiethoadon WHERE ma_hd = $1 GROUP BY ma_ctsp',
        [numericOrderId]
      );

      if (currentOrder.trang_thai_giu === 'Reserved' || currentOrder.trang_thai_giu === 'Hold') {
        // Đơn chưa xuất kho: Giải phóng hàng đang giữ
        for (const item of itemsRes.rows) {
          await client.query(
            `UPDATE chitietsanpham
             SET so_luong_giu = GREATEST(0, so_luong_giu - $1)
             WHERE ma_ctsp = $2`,
            [item.qty, item.ma_ctsp]
          );
        }
      } else if (currentOrder.trang_thai_giu === 'Deducted' || currentStatus === 'Dang_giao') {
        // Đơn đã xuất kho (kho thực tế đã trừ) mà bị hủy/giao thất bại hoàn về: Hoàn lại tồn kho thực tế
        for (const item of itemsRes.rows) {
          await client.query(
            `UPDATE chitietsanpham
             SET so_luong_ton = so_luong_ton + $1
             WHERE ma_ctsp = $2`,
            [item.qty, item.ma_ctsp]
          );
        }
      }

      await client.query(
        "UPDATE hoadon SET trang_thai_giu = 'Released', thoi_han_hold = NULL WHERE ma_hd = $1",
        [numericOrderId]
      );
    }

    // Cập nhật trạng thái đơn hàng trong hoadon
    const result = await client.query(
      `UPDATE hoadon
       SET trang_thai_don = COALESCE($1, trang_thai_don)
       WHERE ma_hd = $2
       RETURNING *`,
      [targetStatus, numericOrderId]
    );

    // Cập nhật thông tin vận đơn nếu có (chỉ khi đơn không bị hủy)
    if ((tracking_code || carrier) && targetStatus !== 'Cancelled') {
      await client.query(
        `INSERT INTO vandon (ma_hd, don_vi_van_chuyen, ma_tracking, ngay_ban_giao)
         VALUES ($1, COALESCE($2, 'GHN'), $3, CASE WHEN $1 IS NOT NULL THEN NOW() ELSE NULL END)
         ON CONFLICT (ma_hd) DO UPDATE
         SET don_vi_van_chuyen = COALESCE(EXCLUDED.don_vi_van_chuyen, vandon.don_vi_van_chuyen),
             ma_tracking = COALESCE(EXCLUDED.ma_tracking, vandon.ma_tracking),
             ngay_ban_giao = COALESCE(vandon.ngay_ban_giao, NOW())`,
        [numericOrderId, carrier, tracking_code]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Cập nhật trạng thái đơn hàng thành công', data: result.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// 6. Xử lý yêu cầu ĐỔI SIZE 7 NGÀY & Điều phối hoàn/xuất kho
export const handleReturnRequest = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { requestId } = req.params;
    const { status, admin_note, resellable, tracking_code, carrier } = req.body;

    const rawId = String(requestId || '').trim();
    const numericRequestId = parseInt(rawId.replace(/[^0-9]/g, ''), 10);
    if (!Number.isSafeInteger(numericRequestId) || numericRequestId <= 0) {
      res.status(400).json({ success: false, message: 'Mã yêu cầu đổi trả không hợp lệ.' });
      return;
    }

    await client.query('BEGIN');

    const ycdtRes = await client.query(
      'SELECT ma_ycdt, ma_hd, loai_yeu_cau, trang_thai FROM yeucaudoitra WHERE ma_ycdt = $1 FOR UPDATE',
      [numericRequestId]
    );

    if (ycdtRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu đổi trả.' });
      return;
    }

    const y = ycdtRes.rows[0];

    // Ánh xạ trạng thái
    const statusMap: Record<string, string> = {
      'APPROVED': 'duyet_so_bo',
      'approved': 'duyet_so_bo',
      'duyet_so_bo': 'duyet_so_bo',
      'REJECTED': 'tu_choi',
      'rejected': 'tu_choi',
      'tu_choi': 'tu_choi',
      'received_goods': 'da_nhan_hang',
      'da_nhan_hang': 'da_nhan_hang',
      'exchange_sent': 'dang_giao_hang_doi',
      'dang_giao_hang_doi': 'dang_giao_hang_doi',
      'completed': 'completed',
      'COMPLETED': 'completed'
    };

    const targetStatus = statusMap[status] || status;

    // 1. NẾU TỪ CHỐI (tu_choi): Giải phóng lượng tồn kho đang giữ cho size mới
    if (targetStatus === 'tu_choi') {
      const detailsRes = await client.query(
        "SELECT ma_ctsp_moi, so_luong FROM chitietyeucaudoitra WHERE ma_ycdt = $1 AND trang_thai_giu_size_moi = 'Reserved'",
        [numericRequestId]
      );

      for (const d of detailsRes.rows) {
        if (d.ma_ctsp_moi) {
          await client.query(
            `UPDATE chitietsanpham
             SET so_luong_giu = GREATEST(0, so_luong_giu - $1)
             WHERE ma_ctsp = $2`,
            [d.so_luong, d.ma_ctsp_moi]
          );
        }
      }

      await client.query(
        "UPDATE chitietyeucaudoitra SET trang_thai_giu_size_moi = 'Released' WHERE ma_ycdt = $1",
        [numericRequestId]
      );
    }

    // 2. NẾU KIỂM ĐỊNH HÀNG TRẢ VỀ (resellable === true): HOÀN TỒN KHO MÓN CŨ (CHỐNG CỘNG TRÙNG IDEMPOTENT)
    if (resellable === true) {
      const oldItemsRes = await client.query(
        `SELECT ol.ma_ctsp, rd.so_luong, rd.du_dieu_kien_ban_lai
         FROM chitietyeucaudoitra rd
         JOIN chitiethoadon ol ON rd.ma_cthd = ol.ma_cthd
         WHERE rd.ma_ycdt = $1`,
        [numericRequestId]
      );

      for (const it of oldItemsRes.rows) {
        // Chỉ cộng hoàn tồn kho nếu trước đó chưa từng xác nhận bán lại (chống cộng dồn)
        if (it.du_dieu_kien_ban_lai !== true) {
          await client.query(
            'UPDATE chitietsanpham SET so_luong_ton = so_luong_ton + $1 WHERE ma_ctsp = $2',
            [it.so_luong, it.ma_ctsp]
          );
        }
      }

      await client.query(
        "UPDATE chitietyeucaudoitra SET ket_qua_kiem_tra = 'dat', du_dieu_kien_ban_lai = true WHERE ma_ycdt = $1",
        [numericRequestId]
      );
    }

    // 3. NẾU GỬI HÀNG ĐỔI (exchange_sent / dang_giao_hang_doi): TRỪ KHO MÓN MỚI
    if (targetStatus === 'dang_giao_hang_doi') {
      const exchangeItemsRes = await client.query(
        "SELECT ma_ctsp_moi, so_luong FROM chitietyeucaudoitra WHERE ma_ycdt = $1 AND trang_thai_giu_size_moi = 'Reserved'",
        [numericRequestId]
      );

      for (const d of exchangeItemsRes.rows) {
        if (d.ma_ctsp_moi) {
          await client.query(
            `UPDATE chitietsanpham
             SET so_luong_ton = so_luong_ton - $1,
                 so_luong_giu = GREATEST(0, so_luong_giu - $1)
             WHERE ma_ctsp = $2`,
            [d.so_luong, d.ma_ctsp_moi]
          );
        }
      }

      await client.query(
        "UPDATE chitietyeucaudoitra SET trang_thai_giu_size_moi = 'Deducted' WHERE ma_ycdt = $1",
        [numericRequestId]
      );
    }

    const result = await client.query(
      `UPDATE yeucaudoitra
       SET trang_thai = $1,
           ghi_chu_xu_ly = COALESCE($2, ghi_chu_xu_ly),
           exchange_tracking_code = COALESCE($3, exchange_tracking_code),
           ngay_duyet_so_bo = CASE WHEN $1 = 'duyet_so_bo' THEN NOW() ELSE ngay_duyet_so_bo END,
           ngay_nhan_hang = CASE WHEN $1 = 'da_nhan_hang' THEN NOW() ELSE ngay_nhan_hang END,
           ngay_gui_hang_doi = CASE WHEN $1 = 'dang_giao_hang_doi' THEN NOW() ELSE ngay_gui_hang_doi END,
           ngay_hoan_tat = CASE WHEN $1 = 'completed' THEN NOW() ELSE ngay_hoan_tat END
       WHERE ma_ycdt = $4
       RETURNING *`,
      [targetStatus, admin_note, tracking_code, numericRequestId]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: `Đã cập nhật trạng thái đổi size sang: ${targetStatus}`, data: result.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};
