const GHN_BASE = 'https://dev-online-gateway.ghn.vn/shiip/public-api';
function createGhnSync({ env = process.env, fetchImpl = fetch } = {}) {
  let running = false;
  async function runOnce() {
    if (running) return { skipped: true };
    if (env.GHN_ENABLED !== 'true' || !env.GHN_TOKEN || !env.GHN_SHOP_ID || !env.GHN_SYNC_SECRET || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return { configured: false };
    running = true;
    const request = (url, options) => fetchImpl(url, { ...options, signal: AbortSignal.timeout(8000) });
    async function rpc(name, args) {
      const res = await request(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
        method: 'POST', headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_secret: env.GHN_SYNC_SECRET, ...args }),
      });
      if (!res.ok) throw Error('GHN sync database is not ready');
      const data = await res.json();
      if (data?.success !== true) throw Error('GHN sync transaction rejected');
      return data;
    }
    try {
      const queue = await rpc('cc_ghn_sync_queue', {});
      if (!Array.isArray(queue.orders) || queue.orders.length > 100) throw Error('Invalid sync queue');
      const exchanges = queue.exchanges ?? [];
      if (!Array.isArray(exchanges) || exchanges.length > 100) throw Error('Invalid exchange sync queue');
      let synced = 0, failed = 0;
      for (const order of [...queue.orders, ...exchanges.map(exchange => ({ ...exchange, exchange: true }))]) {
        try {
          if (!Number.isSafeInteger(order.order_id) || !/^GHN-[A-Za-z0-9-]{1,96}$/.test(order.tracking || '')) throw Error('Invalid saved tracking');
          const code = order.tracking.slice(4);
          const response = await request(`${GHN_BASE}/v2/shipping-order/detail?${new URLSearchParams({ order_code: code })}`, {
            method: 'GET', headers: { 'Content-Type': 'application/json', Token: env.GHN_TOKEN, ShopId: env.GHN_SHOP_ID },
          });
          const result = await response.json(), d = result.data;
          if (!response.ok || result.code !== 200 || !d || d.order_code !== code || typeof d.status !== 'string') throw Error('Unverified provider response');
          const timestamp = d.updated_date || d.created_date;
          if (!timestamp || !Number.isFinite(Date.parse(timestamp))) throw Error('Missing provider timestamp');
          const observation = { p_order_id: order.order_id, p_tracking: order.tracking,
            p_status: d.status, p_updated_at: new Date(timestamp).toISOString() };
          if (order.exchange) {
            if (!Number.isSafeInteger(order.return_id) || order.return_id < 1) throw Error('Invalid saved exchange');
            await rpc('cc_ghn_apply_exchange_observation', { ...observation, p_return_id: order.return_id });
          } else {
            await rpc('cc_ghn_apply_observation', { ...observation,
              p_cod_collected: d.is_cod_collected === true, p_cod_amount: Number.isFinite(Number(d.cod_amount)) ? Number(d.cod_amount) : null });
          }
          synced++;
        } catch { failed++; }
      }
      return { configured: true, synced, failed };
    } finally { running = false; }
  }
  return { runOnce };
}
function startGhnSyncWorker({ onResult = () => {}, onError = () => {}, setIntervalImpl = setInterval, clearIntervalImpl = clearInterval, ...options } = {}) {
  const sync = createGhnSync(options);
  let stopped = false;
  const tick = async () => { if (stopped) return; try { onResult(await sync.runOnce()); } catch { onError('GHN sync unavailable: check configuration and owner migration'); } };
  void tick();
  const timer = setIntervalImpl(() => { void tick(); }, 30000);
  timer.unref?.();
  return () => { stopped = true; clearIntervalImpl(timer); };
}
module.exports = { createGhnSync, startGhnSyncWorker };
