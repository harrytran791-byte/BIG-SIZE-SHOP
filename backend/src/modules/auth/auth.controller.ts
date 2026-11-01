import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/db';
import { config } from '../../config/env';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ tên, email và mật khẩu' });
      return;
    }

    // Kiểm tra email tồn tại
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(400).json({ success: false, message: 'Email này đã được đăng ký trong hệ thống' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, phone, address)
       VALUES ($1, $2, $3, 'USER', $4, $5)
       RETURNING id, name, email, role, phone, address, created_at`,
      [name, email, passwordHash, phone, address]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      data: { user, token }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và mật khẩu' });
      return;
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });
      return;
    }

    const user = result.rows[0];

    if (!user.is_active) {
      res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ Admin' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
        },
        token
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Chưa xác thực' });
      return;
    }

    const result = await query(
      'SELECT id, name, email, role, phone, address, is_active, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
