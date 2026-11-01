import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function ghnGatewayDevPlugin(): Plugin {
  return {
    name: 'ghn-server-gateway',
    configureServer(server) {
      const env = loadEnv(server.config.mode, path.resolve(import.meta.dirname, '..'), '');
      for (const [key, value] of Object.entries(env)) {
        if ((key.startsWith('GHN_') || key === 'SUPABASE_URL' || key === 'SUPABASE_ANON_KEY' || key === 'SUPABASE_SERVICE_ROLE_KEY') && process.env[key] === undefined) process.env[key] = value;
      }
      const { startGhnSyncWorker } = require('../api/lib/ghn-sync.cjs');
      let warned = false;
      const stopSync = startGhnSyncWorker({
        env: process.env,
        onError: () => { if (!warned) { warned = true; console.warn('GHN: cần kiểm tra cấu hình và chạy SQL đồng bộ phía server.'); } },
      });
      server.httpServer?.once('close', stopSync);
      server.middlewares.use('/api/ghn', async (req, res) => {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 16384) { res.statusCode = 413; res.end(); return; }
        }
        try {
          delete require.cache[require.resolve('../api/ghn.js')];
          delete require.cache[require.resolve('../api/lib/ghn-dispatch.cjs')];
          delete require.cache[require.resolve('../api/lib/ghn-address.cjs')];
          const handler = require('../api/ghn.js');
          const response = {
            setHeader: (name: string, value: string) => res.setHeader(name, value),
            status: (status: number) => { res.statusCode = status; return response; },
            json: (value: unknown) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); },
          };
          await handler({ method: req.method, headers: req.headers, body: JSON.parse(body || '{}') }, response);
        } catch { res.statusCode = 400; res.end(JSON.stringify({ success: false, errorMessage: 'Yêu cầu không hợp lệ.' })); }
      });
    },
  };
}

function sendInvoiceDevPlugin(): Plugin {
  return {
    name: 'send-invoice-dev-server',
    configureServer(server) {
      const env = loadEnv(server.config.mode, path.resolve(import.meta.dirname, '..'), '');
      for (const key of ['EMAIL_USER', 'EMAIL_PASS', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
        if (process.env[key] === undefined && env[key]) process.env[key] = env[key];
      }
      server.middlewares.use('/api/send-invoice', async (req, res) => {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 65536) { res.statusCode = 413; res.end(); return; }
        }
        try {
          delete require.cache[require.resolve('../api/send-invoice.js')];
          const handler = require('../api/send-invoice.js');
          const response = {
            setHeader: (name: string, value: string) => res.setHeader(name, value),
            status: (status: number) => { res.statusCode = status; return response; },
            end: () => res.end(),
            json: (value: unknown) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); },
          };
          await handler({ method: req.method, headers: req.headers, body: JSON.parse(body || '{}') }, response);
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'Yêu cầu không hợp lệ.' }));
        }
      });
    },
  };
}

function vnpayDevPlugin(): Plugin {
  return {
    name: 'vnpay-dev-server',
    configureServer(server) {
      const env = loadEnv(server.config.mode, path.resolve(import.meta.dirname, '..'), '');
      for (const key of ['VNPAY_HASH_SECRET', 'VNPAY_TMN_CODE', 'VNPAY_PAY_URL', 'APP_ORIGIN', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
        if (process.env[key] === undefined && env[key]) process.env[key] = env[key];
      }
      if (!process.env.APP_ORIGIN) process.env.APP_ORIGIN = `http://localhost:${server.config.server.port || 5173}`;
      server.middlewares.use('/api/vnpay', async (req, res) => {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 16384) { res.statusCode = 413; res.end(); return; }
        }
        try {
          delete require.cache[require.resolve('../api/vnpay.js')];
          const handler = require('../api/vnpay.js');
          const response = {
            setHeader: (name: string, value: string) => res.setHeader(name, value),
            status: (status: number) => { res.statusCode = status; return response; },
            json: (value: unknown) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); },
          };
          const parsedBody = body && req.method !== 'GET' ? JSON.parse(body) : {};
          await handler({ method: req.method, url: req.url, headers: req.headers, body: parsedBody }, response);
        } catch (err: any) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, errorMessage: err?.message || 'Yêu cầu không hợp lệ.' }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sendInvoiceDevPlugin(), ghnGatewayDevPlugin(), vnpayDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@modules': path.resolve(import.meta.dirname, './src/modules'),
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        }
      }
    }
  }
});
