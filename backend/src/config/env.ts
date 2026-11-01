import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV !== 'test') {
  console.error('❌ LỖI BẢO MẬT NGHIÊM TRỌNG: Thiếu biến môi trường JWT_SECRET. Máy chủ từ chối khởi động để phòng ngừa tấn công giả mạo token.');
  process.exit(1);
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'thoitrang_bigsize_db',
    connectionString: process.env.DATABASE_URL,
  },
  jwt: {
    secret: (jwtSecret || (process.env.NODE_ENV === 'test' ? 'test_jwt_secret_for_audit_verification_32chars' : '')) as string,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
};
