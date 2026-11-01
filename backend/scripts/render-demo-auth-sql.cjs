// Render private, ignored SQL. Never put a demo password or business emails in a committed file.
const fs = require('node:fs');
const path = require('node:path');
function renderDemoAuthSql(targets, password) {
  if (!Array.isArray(targets) || targets.length !== 10 || new Set(targets.map(t => t.ma_tk)).size !== 10) throw Error('Expected ten reviewed targets');
  if (targets.some(t => !Number.isSafeInteger(t.ma_tk) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.email) || !['khach_hang','quan_ly','nhan_vien','chu_he_thong'].includes(t.role))) throw Error('Invalid target');
  if (typeof password !== 'string' || password.length < 6 || password.length > 72) throw Error('Invalid demo password length');
  const literal = value => value.replace(/'/g, "''");
  const json = JSON.stringify(targets.map(({ ma_tk, email, role }) => ({ ma_tk, email, role })));
  const template = fs.readFileSync(path.resolve(__dirname, '../src/database/demo_auth_seed.template.sql'), 'utf8');
  // Keep the sentinel in the preflight comparison, replacing only the declaration.
  return template.replace("'__DEMO_ACCOUNTS_JSON__'", `'${literal(json)}'`)
    .replace("demo_password text := '__DEMO_PASSWORD__'", `demo_password text := '${literal(password)}'`)
    .replace('-- TEMPLATE ONLY. Do not run this file: generate the private, project-specific SQL first.', '-- PRIVATE DEMO SQL: run entire file once as Owner on BigSize. Contains the requested demo password; do not commit or share publicly.');
}
module.exports = { renderDemoAuthSql };
