import { Request, Response } from 'express';
import { query } from '../../config/db';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { size, category, search } = req.query;

    let sql = `
      SELECT p.*,
             COALESCE(json_agg(pv.*) FILTER (WHERE pv.id IS NOT NULL), '[]') as variants
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE p.is_active = true
    `;
    const params: any[] = [];

    if (size) {
      params.push(size);
      sql += ` AND pv.size = $${params.length} AND pv.stock_quantity > 0`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND p.name ILIKE $${params.length}`;
    }

    sql += ` GROUP BY p.id ORDER BY p.id ASC`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const result = await query(
      `SELECT p.*,
              COALESCE(json_agg(pv.*) FILTER (WHERE pv.id IS NOT NULL), '[]') as variants
       FROM products p
       LEFT JOIN product_variants pv ON p.id = pv.product_id
       WHERE p.slug = $1 AND p.is_active = true
       GROUP BY p.id`,
      [slug]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
