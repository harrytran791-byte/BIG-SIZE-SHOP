import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { checkDbConnection } from './config/db';
import rootRouter from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    project: 'Curve & Confidence - Thời Trang Big Size Backend API',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    project: 'Curve & Confidence - Thời Trang Big Size Backend API',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// Mount API v1
app.use('/api/v1', rootRouter);

// Global Error Handler
app.use(errorHandler);

// Start Server
const server = app.listen(config.port, async () => {
  console.log(`=======================================================`);
  console.log(`👗 Curve & Confidence Backend Server đang chạy!`);
  console.log(`🚀 Port: http://localhost:${config.port}`);
  console.log(`🔗 API Base: http://localhost:${config.port}/api/v1`);
  console.log(`❤️ Health Check: http://localhost:${config.port}/health`);
  console.log(`=======================================================`);

  // Kiểm tra kết nối CSDL PostgreSQL
  await checkDbConnection();
});

export default app;
