// Produces a private owner SQL and stores only the narrow server capability locally.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..'), envPath = path.join(root, '.env');
let source = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const parsed = require('dotenv').parse(source);
const secret = parsed.GHN_SYNC_SECRET || crypto.randomBytes(32).toString('hex');
if (!/^[a-f0-9]{64}$/.test(secret)) throw Error('Expected a dedicated 64-character GHN sync capability');
if (!parsed.GHN_SYNC_SECRET) {
  source = source.replace(/^GHN_SYNC_SECRET=.*(?:\r?\n|$)/gm, '');
  fs.writeFileSync(envPath, source + '\nGHN_SYNC_SECRET=' + secret + '\n');
}
const hash = crypto.createHash('sha256').update(secret).digest('hex');
const template = fs.readFileSync(path.join(root, 'backend/src/database/phase3_ghn_server_sync.template.sql'), 'utf8');
fs.mkdirSync(path.join(root, 'scratch'), { recursive: true });
fs.writeFileSync(path.join(root, 'scratch/phase3_ghn_server_sync.sql'), template.replaceAll('__SYNC_SECRET_SHA256__', hash));
console.log('Prepared scratch/phase3_ghn_server_sync.sql. Owner must apply it before synchronization can run. No Cloud writes performed.');
