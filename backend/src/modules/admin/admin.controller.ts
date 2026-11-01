import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, pool } from '../../config/db';

// Helper ánh xạ vai trò giữa hệ thống và CSDL PostgreSQL
const toDbRole = (role: string): string => {
  const r = (role || '').toUpperCase().trim();
  if (r === 'ADMIN' || r === 'CHU_HE_THONG') return 'chu_he_thong';
  if (r === 'MANAGER' || r === 'QUAN_LY') return 'quan_ly';
  return 'khach_hang';
};

const toSystemRole = (dbRole: string): string => {
  if (dbRole === 'chu_he_thong') return 'ADMIN';
  if (dbRole === 'quan_ly' || dbRole === 'nhan_vien') return 'MANAGER';
  return 'USER';
};

// Helper an toàn ghi nhận nhật ký kiểm toán (Audit Trail)
const recordAuditEvent = async (
  client: any,
  actorId: number | undefined,
  actorName: string | undefined,
  action: string,
  targetId: number,
  beforeState: any,
  afterState: any
): Promise<void> => {
  try {
    await client.query(
      `INSERT INTO cc_admin_account_events (actor_account, actor_name, action, target_account, before_state, after_state)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        actorId || 0,
        actorName || 'Administrator',
        action,
        targetId,
        JSON.stringify(beforeState || {}),
        JSON.stringify(afterState || {})
      ]
    );
  } catch (err: any) {
    // Nếu bảng cc_admin_account_events chưa tạo hoặc đang ở môi trường test/dev, log an toàn
    console.warn('⚠️ Ghi audit log vào cc_admin_account_events:', err.message);
  }
};

// 1. Quản lý danh sách Người dùng (Phân trang, không lộ mật khẩu)
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
    const offset = (page - 1) * limit;

    const countRes = await query('SELECT COUNT(*) as total FROM taikhoan');
    const totalUsers = parseInt(countRes.rows[0]?.total || '0', 10);

    const result = await query(
      `SELECT t.ma_tk AS id,
              t.ho_ten AS name,
              t.email,
              t.so_dien_thoai AS phone,
              t.role AS db_role,
              t.account_enabled AS is_active,
              t.ngay_tao AS created_at
       FROM taikhoan t
       ORDER BY t.ma_tk ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const users = result.rows.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: toSystemRole(u.db_role),
      is_active: u.is_active !== false,
      created_at: u.created_at
    }));

    res.json({
      success: true,
      data: users,
      pagination: {
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Thêm mới tài khoản người dùng bởi Admin (Băm bcrypt mật khẩu an toàn)
export const createAdminUser = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 150) {
      res.status(400).json({ success: false, message: 'Họ tên không hợp lệ (từ 2 đến 150 ký tự).' });
      return;
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ success: false, message: 'Địa chỉ email không hợp lệ.' });
      return;
    }

    const rawPassword = password ? String(password).trim() : 'CurveAdmin@2026';
    if (rawPassword.length < 8) {
      res.status(400).json({ success: false, message: 'Mật khẩu phải có tối thiểu 8 ký tự.' });
      return;
    }

    const dbRole = toDbRole(role);

    await client.query('BEGIN');

    // Kiểm tra trùng lặp email
    const existing = await client.query('SELECT ma_tk FROM taikhoan WHERE lower(email) = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Email này đã tồn tại trong hệ thống.' });
      return;
    }

    // Băm mật khẩu bằng bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const result = await client.query(
      `INSERT INTO taikhoan (ho_ten, email, so_dien_thoai, password, role, account_enabled)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING ma_tk AS id, ho_ten AS name, email, role AS db_role, so_dien_thoai AS phone, account_enabled AS is_active, ngay_tao AS created_at`,
      [name.trim(), cleanEmail, phone ? String(phone).trim() : null, passwordHash, dbRole]
    );

    const newUser = result.rows[0];

    // Khởi tạo hồ sơ khách hàng hoặc nhân viên tương ứng
    if (dbRole === 'khach_hang') {
      await client.query(
        'INSERT INTO khachhang (ma_tk, trangthai) VALUES ($1, $2) ON CONFLICT (ma_tk) DO NOTHING',
        [newUser.id, 'hoat_dong']
      );
    } else {
      await client.query(
        'INSERT INTO nhanvien (ma_tk, trang_thai_lam_viec) VALUES ($1, $2) ON CONFLICT (ma_tk) DO NOTHING',
        [newUser.id, 'dang_lam_viec']
      );
    }

    // Ghi audit log
    await recordAuditEvent(
      client,
      req.user?.id,
      req.user?.name,
      'create',
      newUser.id,
      null,
      { name: newUser.name, email: newUser.email, role: newUser.db_role }
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản người dùng thành công!',
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: toSystemRole(newUser.db_role),
        is_active: true,
        created_at: newUser.created_at
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// 3. Cập nhật vai trò / Phân quyền (Chặn tự hạ quyền & Bảo vệ Admin gốc)
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const targetId = parseInt(String(userId).replace(/[^0-9]/g, ''), 10);
    if (!Number.isSafeInteger(targetId) || targetId <= 0) {
      res.status(400).json({ success: false, message: 'Mã tài khoản không hợp lệ.' });
      return;
    }

    // CHỐNG TỰ HẠ QUYỀN (Self-Lockout Protection)
    if (targetId === req.user?.id) {
      res.status(400).json({
        success: false,
        message: 'Bạn không thể tự thay đổi vai trò của chính mình để tránh mất quyền quản trị.'
      });
      return;
    }

    const dbRole = toDbRole(role);

    await client.query('BEGIN');

    // Kiểm tra tài khoản đích
    const userRes = await client.query(
      'SELECT ma_tk, ho_ten, email, role, account_enabled FROM taikhoan WHERE ma_tk = $1 FOR UPDATE',
      [targetId]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
      return;
    }

    const targetUser = userRes.rows[0];

    // BẢO VỆ TÀI KHOẢN ADMIN HỆ THỐNG GỐC
    const protectedEmails = ['admin@bigsize.vn', 'nhotoan.admin@bigsize.vn'];
    if (protectedEmails.includes(targetUser.email.toLowerCase()) || (targetUser.role === 'chu_he_thong' && targetUser.ma_tk === 1)) {
      await client.query('ROLLBACK');
      res.status(403).json({
        success: false,
        message: 'Tài khoản Quản trị viên hệ thống gốc được bảo vệ nghiêm ngặt, không thể thay đổi vai trò.'
      });
      return;
    }

    const beforeState = { name: targetUser.ho_ten, role: targetUser.role };

    // Cập nhật bảng gốc taikhoan
    const updateRes = await client.query(
      'UPDATE taikhoan SET role = $1 WHERE ma_tk = $2 RETURNING ma_tk AS id, ho_ten AS name, email, role AS db_role',
      [dbRole, targetId]
    );

    const updatedUser = updateRes.rows[0];
    const afterState = { name: updatedUser.name, role: updatedUser.db_role };

    // Đồng bộ vào bảng phân hệ tương ứng
    if (dbRole === 'khach_hang') {
      await client.query('INSERT INTO khachhang (ma_tk, trangthai) VALUES ($1, $2) ON CONFLICT (ma_tk) DO NOTHING', [targetId, 'hoat_dong']);
    } else {
      await client.query('INSERT INTO nhanvien (ma_tk, trang_thai_lam_viec) VALUES ($1, $2) ON CONFLICT (ma_tk) DO NOTHING', [targetId, 'dang_lam_viec']);
    }

    // Ghi audit log
    await recordAuditEvent(client, req.user?.id, req.user?.name, 'role', targetId, beforeState, afterState);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Cập nhật vai trò thành công!',
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: toSystemRole(updatedUser.db_role)
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// 4. Khóa / Mở khóa tài khoản (Chặn tự khóa chính mình & Bảo vệ Admin gốc)
export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { userId } = req.params;
    const { is_active } = req.body;

    const targetId = parseInt(String(userId).replace(/[^0-9]/g, ''), 10);
    if (!Number.isSafeInteger(targetId) || targetId <= 0) {
      res.status(400).json({ success: false, message: 'Mã tài khoản không hợp lệ.' });
      return;
    }

    // CHỐNG TỰ KHÓA TÀI KHOẢN (Self-Lockout Protection)
    if (targetId === req.user?.id) {
      res.status(400).json({
        success: false,
        message: 'Bạn không thể tự khóa tài khoản của chính mình!'
      });
      return;
    }

    const enabled = is_active !== false;

    await client.query('BEGIN');

    const userRes = await client.query(
      'SELECT ma_tk, ho_ten, email, role, account_enabled FROM taikhoan WHERE ma_tk = $1 FOR UPDATE',
      [targetId]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
      return;
    }

    const targetUser = userRes.rows[0];

    // BẢO VỆ TÀI KHOẢN ADMIN HỆ THỐNG GỐC
    const protectedEmails = ['admin@bigsize.vn', 'nhotoan.admin@bigsize.vn'];
    if (!enabled && (protectedEmails.includes(targetUser.email.toLowerCase()) || targetUser.role === 'chu_he_thong')) {
      await client.query('ROLLBACK');
      res.status(403).json({
        success: false,
        message: 'Tài khoản Quản trị viên hệ thống gốc được bảo vệ, không thể khóa!'
      });
      return;
    }

    const beforeState = { enabled: targetUser.account_enabled };

    // Cập nhật bảng gốc taikhoan
    const updateRes = await client.query(
      'UPDATE taikhoan SET account_enabled = $1 WHERE ma_tk = $2 RETURNING ma_tk AS id, ho_ten AS name, email, account_enabled AS is_active',
      [enabled, targetId]
    );

    // Cập nhật trạng thái trong khachhang nếu có
    await client.query(
      "UPDATE khachhang SET trangthai = CASE WHEN $1 THEN 'hoat_dong' ELSE 'bi_khoa' END WHERE ma_tk = $2",
      [enabled, targetId]
    );

    const updatedUser = updateRes.rows[0];
    const afterState = { enabled: updatedUser.is_active };

    // Ghi audit log
    await recordAuditEvent(client, req.user?.id, req.user?.name, 'set_enabled', targetId, beforeState, afterState);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${enabled ? 'Mở khóa' : 'Khóa'} tài khoản người dùng thành công!`,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        is_active: updatedUser.is_active
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// 5. Xóa tài khoản (Kiểm tra ràng buộc nghiệp vụ, bảo vệ tài khoản)
export const deleteAdminUser = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { userId } = req.params;

    const targetId = parseInt(String(userId).replace(/[^0-9]/g, ''), 10);
    if (!Number.isSafeInteger(targetId) || targetId <= 0) {
      res.status(400).json({ success: false, message: 'Mã tài khoản không hợp lệ.' });
      return;
    }

    // CHỐNG TỰ XÓA
    if (targetId === req.user?.id) {
      res.status(400).json({ success: false, message: 'Bạn không thể tự xóa tài khoản của chính mình!' });
      return;
    }

    await client.query('BEGIN');

    const userRes = await client.query(
      'SELECT ma_tk, ho_ten, email, role FROM taikhoan WHERE ma_tk = $1 FOR UPDATE',
      [targetId]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản cần xóa.' });
      return;
    }

    const targetUser = userRes.rows[0];

    // BẢO VỆ ADMIN GỐC
    const protectedEmails = ['admin@bigsize.vn', 'nhotoan.admin@bigsize.vn'];
    if (protectedEmails.includes(targetUser.email.toLowerCase()) || targetUser.role === 'chu_he_thong') {
      await client.query('ROLLBACK');
      res.status(403).json({ success: false, message: 'Không thể xóa tài khoản Quản trị viên hệ thống gốc!' });
      return;
    }

    // KIỂM TRA RÀNG BUỘC NGHIỆP VỤ (Có đơn hàng hoặc kiểm kê không)
    const orderCheck = await client.query(
      'SELECT h.ma_hd FROM hoadon h JOIN khachhang k ON h.ma_kh = k.ma_kh WHERE k.ma_tk = $1 LIMIT 1',
      [targetId]
    );

    if (orderCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Tài khoản này đã có lịch sử đơn hàng nghiệp vụ. Vui lòng sử dụng tính năng Khóa tài khoản thay vì xóa vĩnh viễn.'
      });
      return;
    }

    const beforeState = { name: targetUser.ho_ten, email: targetUser.email, role: targetUser.role };

    // Xóa hồ sơ phụ trợ
    await client.query('DELETE FROM khachhang WHERE ma_tk = $1', [targetId]);
    await client.query('DELETE FROM nhanvien WHERE ma_tk = $1', [targetId]);
    await client.query('DELETE FROM taikhoan WHERE ma_tk = $1', [targetId]);

    // Ghi audit log
    await recordAuditEvent(client, req.user?.id, req.user?.name, 'delete', targetId, beforeState, null);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Đã xóa tài khoản "${targetUser.ho_ten}" thành công.`
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// 6. Lấy danh sách Audit Logs truy vết an ninh (Từ bảng thật cc_admin_account_events)
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '100'), 10)));
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT id, recorded_at, actor_account, actor_name, action, target_account, before_state, after_state
       FROM cc_admin_account_events
       ORDER BY recorded_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const logs = result.rows.map(row => {
      const d = new Date(row.recorded_at);
      return {
        id: `account-event-${row.id}`,
        timestamp: row.recorded_at,
        timeFormatted: d.toLocaleTimeString('vi-VN', { hour12: false }),
        dateFormatted: d.toLocaleDateString('vi-VN'),
        performedBy: {
          id: `usr_${row.actor_account}`,
          name: row.actor_name,
          role: 'Admin'
        },
        action: row.action,
        category: 'Quản lý tài khoản',
        target: {
          code: `Tài khoản #${row.target_account}`,
          description: row.after_state?.name || row.before_state?.name || 'Hồ sơ tài khoản'
        },
        result: 'success'
      };
    });

    res.json({ success: true, data: logs });
  } catch (error: any) {
    // Nếu bảng chưa có trong database, trả về danh sách rỗng an toàn thay vì sập API
    res.json({ success: true, data: [] });
  }
};

// 7. Lấy & Cập nhật Cài đặt hệ thống (An toàn, không lộ secret key)
const memorySystemSettings: Record<string, any> = {
  allowRegistration: true,
  requireEmailVerification: true,
  defaultRole: 'customer',
  requireAdminApprovalInternal: true,
  mfaRequired: true,
  minPasswordLength: 12,
  maxFailedLogins: 5,
  lockoutDurationMinutes: 15,
  idleTimeoutMinutes: 30,
  maxConcurrentSessions: 3,
  revokeSessionsOnPasswordChange: true,
  securityAlertsEmail: true,
  roleChangeNotification: true,
  dailyDigestTime: '09:00',
  adminNotificationEmail: 'security@curveconfidence.vn'
};

export const getSystemSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: memorySystemSettings
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSystemSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!key || !(key in memorySystemSettings)) {
      res.status(400).json({ success: false, message: 'Tham số cấu hình không hợp lệ.' });
      return;
    }

    memorySystemSettings[key] = value;

    res.json({
      success: true,
      message: `Cập nhật cấu hình "${key}" thành công!`,
      data: { key, value }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
