import { Pool, QueryResult } from 'pg';
import { config } from './env';

export const pool = new Pool(
  config.db.connectionString
    ? {
        connectionString: config.db.connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: config.db.connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000,
      }
);

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err.message);
});

export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.nodeEnv === 'development') {
      console.log('⚡ Executed query:', { text: text.substring(0, 80), duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
  } catch (error: any) {
    console.error('❌ PostgreSQL Query Error:', error.message);
    throw error;
  }
};

export const checkDbConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, current_database() as db_name');
    client.release();
    console.log(`✅ Kết nối PostgreSQL thành công! Database: "${result.rows[0].db_name}"`);
    return true;
  } catch (err: any) {
    console.warn(`⚠️ Chưa kết nối được PostgreSQL (${err.message}). Vui lòng kiểm tra lại pgAdmin và file backend/.env`);
    return false;
  }
};
