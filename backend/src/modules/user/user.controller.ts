import { Request, Response } from 'express';
import { query, pool } from '../../config/db';

// 1. Lấy và cập nhật hồ sơ số đo 3 vòng (Body Profile)
export const getBodyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const result = await query('SELECT * FROM body_profiles WHERE user_id = $1', [userId]);

    res.json({
      success: true,
      data: result.rows.length > 0 ? result.rows[0] : null
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveBodyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { height_cm, weight_kg, bust_cm, waist_cm, hip_cm, shape_type, fit_preference } = req.body;

    const result = await query(
      `INSERT INTO body_profiles (user_id, height_cm, weight_kg, bust_cm, waist_cm, hip_cm, shape_type, fit_preference, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET height_cm = EXCLUDED.height_cm,
           weight_kg = EXCLUDED.weight_kg,
           bust_cm = EXCLUDED.bust_cm,
           waist_cm = EXCLUDED.waist_cm,
           hip_cm = EXCLUDED.hip_cm,
           shape_type = EXCLUDED.shape_type,
           fit_preference = EXCLUDED.fit_preference,
           updated_at = NOW()
       RETURNING *`,
      [userId, height_cm, weight_kg, bust_cm, waist_cm, hip_cm, shape_type, fit_preference || 'comfortable']
    );

    res.json({
      success: true,
      message: 'Lưu thông số số đo 3 vòng thành công',
      data: result.rows[0]
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Lấy danh sách đơn hàng của chính User
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const result = await query(
      `SELECT o.*,
              COALESCE(json_agg(oi.*) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Gửi yêu cầu đổi size miễn phí 7 ngày (Chống IDOR, kiểm soát 7 ngày & tính tiền chênh lệch)
export const submitReturnRequest = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để thực hiện đổi trả.' });
      return;
    }

    const {
      order_id,
      order_item_id,
      original_size,
      requested_size,
      reason,
      reason_detail,
      quantity = 1,
      items
    } = req.body;

    // 1. Chuẩn hóa & parse order_id (hỗ trợ cả "BS-HD012", "HD12", hoặc số 12)
    const rawOrderId = String(order_id || '').trim();
    const numericOrderId = parseInt(rawOrderId.replace(/[^0-9]/g, ''), 10);
    if (!Number.isSafeInteger(numericOrderId) || numericOrderId <= 0) {
      res.status(400).json({ success: false, message: 'Mã đơn hàng không hợp lệ.' });
      return;
    }

    // 2. Kiểm tra hồ sơ Khách Hàng tương ứng với User (TaiKhoan)
    const khRes = await client.query(
      'SELECT ma_kh FROM khachhang WHERE ma_tk = $1 AND trangthai = $2',
      [userId, 'hoat_dong']
    );
    if (khRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ khách hàng hợp lệ.' });
      return;
    }
    const customerId = khRes.rows[0].ma_kh;

    // 3. Khởi tạo Transaction & kiểm tra quyền sở hữu đơn hàng (Chống IDOR / BOLA)
    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT h.ma_hd, h.ma_kh, h.trang_thai_don, h.ngay_dat,
              v.ngay_giao_thanh_cong
       FROM hoadon h
       LEFT JOIN vandon v ON h.ma_hd = v.ma_hd
       WHERE h.ma_hd = $1
       FOR UPDATE OF h`,
      [numericOrderId]
    );

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đơn hàng.' });
      return;
    }

    const orderRow = orderRes.rows[0];

    // CHỐNG IDOR: Chỉ chủ sở hữu đơn hàng mới có quyền tạo yêu cầu đổi trả
    if (orderRow.ma_kh !== customerId) {
      await client.query('ROLLBACK');
      res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện đổi trả cho đơn hàng này.' });
      return;
    }

    // RÀNG BUỘC: Đơn hàng phải ở trạng thái Giao_thanh_cong
    if (orderRow.trang_thai_don !== 'Giao_thanh_cong') {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Chỉ đơn hàng đã giao thành công mới đủ điều kiện yêu cầu đổi trả.'
      });
      return;
    }

    // RÀNG BUỘC 7 NGÀY: Kiểm tra thời hạn 7 ngày kể từ khi giao thành công
    if (orderRow.ngay_giao_thanh_cong) {
      const deliveredTime = new Date(orderRow.ngay_giao_thanh_cong).getTime();
      const diffMs = Date.now() - deliveredTime;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (diffMs > sevenDaysMs) {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          message: 'Đã quá thời hạn đổi size 7 ngày miễn phí kể từ ngày nhận hàng.'
        });
        return;
      }
    }

    // 4. Xây dựng danh sách món cần đổi
    const returnItemsList: {
      orderItemId?: number;
      originalSize?: string;
      requestedSize: string;
      qty: number;
    }[] = [];

    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        returnItemsList.push({
          orderItemId: it.order_item_id || it.orderItemId,
          originalSize: it.original_size || it.originalSize,
          requestedSize: it.requested_size || it.requestedSize,
          qty: parseInt(it.quantity || it.qty || '1', 10),
        });
      }
    } else if (requested_size) {
      returnItemsList.push({
        orderItemId: order_item_id ? parseInt(order_item_id, 10) : undefined,
        originalSize: original_size,
        requestedSize: requested_size,
        qty: parseInt(quantity || '1', 10),
      });
    } else {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Vui lòng chọn size mong muốn đổi sang.' });
      return;
    }

    // 5. Kiểm tra chi tiết đơn hàng, tìm biến thể size mới và TÍNH TIỀN CHÊNH LỆCH (Price Difference)
    let totalDifference = 0;
    interface ExchangeItemDetail {
      ma_cthd: number;
      ma_ctsp_cu: number;
      ma_ctsp_moi: number;
      ten_sp: string;
      kich_co_cu: string;
      kich_co_moi: string;
      mau_sac: string;
      so_luong: number;
      don_gia_cu: number;
      don_gia_moi: number;
      chenh_lech: number;
    }
    const exchangeDetails: ExchangeItemDetail[] = [];

    for (const item of returnItemsList) {
      // Tìm dòng sản phẩm trong chitiethoadon
      let cthdQuery = `
        SELECT d.ma_cthd, d.ma_ctsp, d.so_luong, d.don_gia, d.kich_co_mua, d.mau_sac_mua, d.ten_sp_mua,
               c.ma_sp
        FROM chitiethoadon d
        JOIN chitietsanpham c ON d.ma_ctsp = c.ma_ctsp
        WHERE d.ma_hd = $1
      `;
      const cthdParams: any[] = [numericOrderId];
      if (item.orderItemId) {
        cthdParams.push(item.orderItemId);
        cthdQuery += ` AND d.ma_cthd = $2`;
      } else if (item.originalSize) {
        cthdParams.push(item.originalSize);
        cthdQuery += ` AND d.kich_co_mua = $2`;
      }
      cthdQuery += ` LIMIT 1`;

      const cthdRes = await client.query(cthdQuery, cthdParams);
      if (cthdRes.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm tương ứng trong hóa đơn gốc.' });
        return;
      }

      const cthdRow = cthdRes.rows[0];
      const oldPrice = Number(cthdRow.don_gia);
      const qty = item.qty || 1;

      // Tìm biến thể mới theo size mong muốn (cùng sản phẩm, cùng màu)
      const nextVarRes = await client.query(
        `SELECT next.ma_ctsp, next.don_gia, next.so_luong_ton, next.so_luong_giu, next.sku, b.kich_co
         FROM chitietsanpham next
         JOIN bangsize b ON next.ma_bang_size = b.ma_bang_size
         WHERE next.ma_sp = $1 AND next.mau_sac = $2 AND b.kich_co = $3 AND next.trang_thai = 'dang_kinh_doanh'
         FOR UPDATE OF next`,
        [cthdRow.ma_sp, cthdRow.mau_sac_mua, item.requestedSize]
      );

      if (nextVarRes.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({
          success: false,
          message: `Sản phẩm "${cthdRow.ten_sp_mua}" hiện không có biến thể Size ${item.requestedSize}.`
        });
        return;
      }

      const nextVar = nextVarRes.rows[0];
      const availableExchangeStock = Number(nextVar.so_luong_ton) - Number(nextVar.so_luong_giu);
      if (availableExchangeStock < qty) {
        await client.query('ROLLBACK');
        res.status(409).json({
          success: false,
          message: `Size ${item.requestedSize} hiện đã hết hàng (Còn: ${Math.max(0, availableExchangeStock)}). Vui lòng chọn size khác.`
        });
        return;
      }

      const newPrice = Number(nextVar.don_gia);
      const diff = (newPrice - oldPrice) * qty;
      totalDifference += diff;

      exchangeDetails.push({
        ma_cthd: cthdRow.ma_cthd,
        ma_ctsp_cu: cthdRow.ma_ctsp,
        ma_ctsp_moi: nextVar.ma_ctsp,
        ten_sp: cthdRow.ten_sp_mua,
        kich_co_cu: cthdRow.kich_co_mua,
        kich_co_moi: item.requestedSize,
        mau_sac: cthdRow.mau_sac_mua,
        so_luong: qty,
        don_gia_cu: oldPrice,
        don_gia_moi: newPrice,
        chenh_lech: diff
      });
    }

    // 6. Ghi bản ghi vào bảng gốc `yeucaudoitra`
    const ycdtRes = await client.query(
      `INSERT INTO yeucaudoitra (
        ma_hd, loai_yeu_cau, trang_thai, ghi_chu_xu_ly, reason_code
      ) VALUES ($1, 'doi_size', 'cho_xu_ly', $2, $3)
      RETURNING ma_ycdt, ngay_yeu_cau`,
      [
        numericOrderId,
        reason_detail || reason || 'Khách yêu cầu đổi size 7 ngày',
        reason || 'too_tight'
      ]
    );

    const createdYcdt = ycdtRes.rows[0];
    const returnRequestId = createdYcdt.ma_ycdt;

    // 7. Ghi chi tiết vào bảng gốc `chitietyeucaudoitra` & Giữ kho (so_luong_giu) cho size mới
    for (const d of exchangeDetails) {
      await client.query(
        `INSERT INTO chitietyeucaudoitra (
          ma_ycdt, ma_cthd, ma_ctsp_moi, so_luong, tinh_trang_thuc_te, du_dieu_kien_ban_lai, trang_thai_giu_size_moi
        ) VALUES ($1, $2, $3, $4, $5, false, 'Reserved')`,
        [
          returnRequestId,
          d.ma_cthd,
          d.ma_ctsp_moi,
          d.so_luong,
          `Đổi từ ${d.kich_co_cu} sang ${d.kich_co_moi} (Chênh lệch: ${d.chenh_lech.toLocaleString('vi-VN')}₫)`
        ]
      );

      // Tạm giữ số lượng size mới trong kho để tránh bị người khác đặt mất
      await client.query(
        `UPDATE chitietsanpham
         SET so_luong_giu = so_luong_giu + $1
         WHERE ma_ctsp = $2 AND (so_luong_ton - so_luong_giu) >= $1`,
        [d.so_luong, d.ma_ctsp_moi]
      );
    }

    await client.query('COMMIT');

    // Tạo thông báo chênh lệch rõ ràng
    let diffMessage = 'Đổi ngang giá (Chênh lệch 0₫).';
    if (totalDifference > 0) {
      diffMessage = `Khách hàng bù thêm: +${totalDifference.toLocaleString('vi-VN')}₫ khi nhận hàng đổi.`;
    } else if (totalDifference < 0) {
      diffMessage = `Cửa hàng hoàn lại cho khách: ${Math.abs(totalDifference).toLocaleString('vi-VN')}₫.`;
    }

    res.status(201).json({
      success: true,
      message: `Gửi yêu cầu đổi size thành công! ${diffMessage} Chuyên viên sẽ liên hệ và đổi tận nhà trong vòng 24-48h.`,
      data: {
        return_id: returnRequestId,
        return_code: `RET-00${returnRequestId}`,
        order_id: numericOrderId,
        order_code: `BS-HD0${numericOrderId}`,
        type: 'doi_size',
        price_difference: totalDifference,
        price_difference_text: totalDifference === 0 ? '0₫' : `${totalDifference.toLocaleString('vi-VN')}₫`,
        details: exchangeDetails.map(d => ({
          product_name: d.ten_sp,
          color: d.mau_sac,
          original_size: d.kich_co_cu,
          requested_size: d.kich_co_moi,
          quantity: d.so_luong,
          old_price: d.don_gia_cu,
          new_price: d.don_gia_moi,
          difference: d.chenh_lech
        })),
        created_at: createdYcdt.ngay_yeu_cau
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message || 'Lỗi gửi yêu cầu đổi size.' });
  } finally {
    client.release();
  }
};
