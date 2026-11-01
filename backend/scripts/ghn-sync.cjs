const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
const { startGhnSyncWorker } = require('../../api/lib/ghn-sync.cjs');
if (process.env.GHN_ENABLED !== 'true' || !process.env.GHN_SYNC_SECRET) throw Error('Configure the server GHN settings and apply the owner SQL first');
const stop = startGhnSyncWorker({ onError: message => console.error(message) });
// Keep this standalone server worker alive without a browser tab.
const keepAlive = setInterval(() => {}, 3600000);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { stop(); clearInterval(keepAlive); });
