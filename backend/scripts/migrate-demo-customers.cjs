// Local operator tool only; never mount this module as a web endpoint.
const fs = require('node:fs');
const path = require('node:path');
const PROJECT_URL = 'https://vucrgwryaerhphparchc.supabase.co';
const normalize = email => String(email || '').trim().toLowerCase();

function buildMigrationPlan(accounts, authUsers, onlyEmail) {
  const existing = new Set(authUsers.map(u => normalize(u.email)).filter(Boolean));
  const seen = new Set();
  for (const account of accounts) {
    const email = normalize(account.email);
    if (email && seen.has(email)) throw new Error('Trùng email sau chuẩn hóa. Cần đối soát trước khi chuyển tài khoản.');
    if (email) seen.add(email);
  }
  return accounts.filter(a => !onlyEmail || normalize(a.email) === normalize(onlyEmail)).map(a => {
    const email = normalize(a.email);
    const profiles = Array.isArray(a.khachhang) ? a.khachhang : a.khachhang ? [a.khachhang] : [];
    let status = 'create';
    if (a.role !== 'khach_hang') status = 'skip_internal_account';
    else if (existing.has(email)) status = 'skip_existing_auth';
    else if (a.account_enabled !== true || profiles.some(p => p.trangthai !== 'hoat_dong')) status = 'skip_disabled';
    else if (!profiles.length) status = 'review_missing_customer_profile';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) status = 'review_invalid_email';
    else if (a.email !== email) status = 'review_email_normalization';
    return { ma_tk: a.ma_tk, email, role: a.role, status };
  });
}

async function listAuthUsers(client) {
  const all = [];
  for (let page = 1; page <= 10000; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !Array.isArray(data?.users)) throw new Error('Không đọc được danh sách Auth; chưa tạo tài khoản nào trong bước này.');
    all.push(...data.users);
    if (data.users.length < 200) return all;
  }
  throw new Error('Danh sách Auth vượt giới hạn công cụ; cần kiểm tra phân trang.');
}
async function readAccounts(client) {
  const all = [];
  for (let offset = 0; offset < 1000000; offset += 200) {
    const { data, error } = await client.from('taikhoan')
      .select('ma_tk,email,role,account_enabled,khachhang(trangthai)').order('ma_tk').range(offset, offset + 199);
    if (error || !Array.isArray(data)) throw new Error('Không đọc được hồ sơ nghiệp vụ.');
    all.push(...data);
    if (data.length < 200) return all;
  }
  throw new Error('Danh sách tài khoản vượt giới hạn công cụ.');
}

async function migrateCustomers(client, { apply = false, password, demoEmailsConfirmed = false, onlyEmail } = {}) {
  if (apply && (!demoEmailsConfirmed || typeof password !== 'string' || password.length < 6)) {
    throw new Error('Apply cần xác nhận email demo do bạn quản lý và mật khẩu trong AUTH_DEMO_PASSWORD (ít nhất 6 ký tự).');
  }
  // Complete both reads before any write. Never use an incomplete Auth page as evidence of absence.
  const accounts = await readAccounts(client);
  const users = await listAuthUsers(client);
  const plan = buildMigrationPlan(accounts, users, onlyEmail);
  if (onlyEmail && !plan.length) throw new Error('Email không có trong tài khoản nghiệp vụ hiện hữu.');
  if (!apply) return { mode: 'preview', plan };
  const results = [];
  for (const row of plan) {
    if (row.status !== 'create') { results.push(row); continue; }
    // Re-read before each creation: a different operator may have added this identity meanwhile.
    let latest;
    try { latest = await listAuthUsers(client); }
    catch {
      results.push({ ...row, status: 'stopped_recheck_failed' });
      return { mode: 'apply', complete: false, results };
    }
    if (latest.some(u => normalize(u.email) === row.email)) {
      results.push({ ...row, status: 'skip_existing_auth' }); continue;
    }
    let response;
    try {
      response = await client.auth.admin.createUser({
        email: row.email, password, email_confirm: true,
        user_metadata: { migration_source: 'bigsize_demo_legacy' },
      });
    } catch { response = { error: true }; }
    if (response.error || !response.data?.user?.id || normalize(response.data.user.email) !== row.email) {
      // Stop on an uncertain result. A rerun discovers a successfully-created identity rather than resetting it.
      results.push({ ...row, status: 'failed_or_uncertain' });
      return { mode: 'apply', complete: false, results };
    }
    results.push({ ...row, status: 'created' });
  }
  return { mode: 'apply', complete: true, results };
}

async function main(argv = process.argv.slice(2)) {
  const help = 'Preview: node backend/scripts/migrate-demo-customers.cjs\nApply: thêm --apply --demo-emails-confirmed\nGiới hạn một email: --email <email>\nOffline preview từ snapshot chỉ đọc: --snapshot <file>\nCấu hình server trong backend/.env; không truyền password/key bằng command line.';
  if (argv.includes('--help')) { console.log(help); return; }
  const options = { apply: false, demoEmailsConfirmed: false };
  let snapshot;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--apply') options.apply = true;
    else if (argv[i] === '--demo-emails-confirmed') options.demoEmailsConfirmed = true;
    else if (argv[i] === '--email' && argv[i + 1]) options.onlyEmail = argv[++i];
    else if (argv[i] === '--snapshot' && argv[i + 1]) snapshot = argv[++i];
    else throw new Error('Tham số không hợp lệ. Dùng --help; không đưa key/mật khẩu vào dòng lệnh.');
  }
  let result;
  if (snapshot) {
    if (options.apply) throw new Error('Snapshot chỉ dùng xem trước. Apply luôn đọc lại Cloud hiện tại.');
    const state = JSON.parse(fs.readFileSync(path.resolve(snapshot), 'utf8'));
    result = { mode: 'offline-preview', plan: buildMigrationPlan(state.accounts, state.authUsers, options.onlyEmail) };
  } else {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url !== PROJECT_URL) throw new Error('Chỉ cho phép đúng project BigSize. Kiểm tra SUPABASE_URL trong backend/.env.');
    if (!key) throw new Error('Thiếu khóa Admin phía server trong backend/.env. Không gửi khóa vào chat.');
    const { createClient } = require('@supabase/supabase-js');
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    result = await migrateCustomers(client, { ...options, password: process.env.AUTH_DEMO_PASSWORD });
  }
  const output = path.resolve(__dirname, '../../scratch/auth-migration-result.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2), { mode: 0o600 });
  const rows = result.plan || result.results;
  console.log(JSON.stringify({ mode: result.mode, counts: rows.reduce((c, r) => ({ ...c, [r.status]: (c[r.status] || 0) + 1 }), {}), report: output }, null, 2));
  if (result.complete === false) process.exitCode = 2;
}
if (require.main === module) main().catch(() => {
  // Do not print raw SDK errors: they may contain tokens, user metadata or submitted credentials.
  console.error('Chưa thực hiện xong. Kiểm tra cấu hình Admin, mật khẩu cục bộ, phạm vi email và quyền. Dùng --help và đọc hướng dẫn; không gửi secret vào chat.');
  process.exitCode = 1;
});
module.exports = { buildMigrationPlan, listAuthUsers, migrateCustomers };
