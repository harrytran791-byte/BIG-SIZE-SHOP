const { timingSafeEqual } = require('node:crypto');
const { createGhnSync } = require('./lib/ghn-sync.cjs');
const sync = createGhnSync();
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ success: false });
  const expected = process.env.GHN_SYNC_SECRET;
  const actual = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  if (!expected || expected.length < 32 || Buffer.byteLength(actual) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) return res.status(401).json({ success: false });
  try { const result = await sync.runOnce(); return res.status(result.configured === false ? 503 : 200).json({ success: result.configured !== false, ...result }); }
  catch { return res.status(503).json({ success: false, errorMessage: 'Shipping synchronization unavailable' }); }
};
