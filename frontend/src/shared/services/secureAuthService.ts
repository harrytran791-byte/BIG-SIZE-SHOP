import { normalizeRole } from '../utils/roleUtils';
export async function authenticatedAccount(client: any) {
  const { data: verified, error } = await client.auth.getUser();
  if (error || !verified?.user) return null;
  const { data, error: profileError } = await client.rpc('cc_current_profile');
  if (profileError || !data?.ma_tk) return null;
  let addresses = [];
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(`curve_addresses_usr_${data.ma_tk}`) : null;
    if (saved) addresses = JSON.parse(saved);
  } catch {}

  const meta = verified.user.user_metadata || {};
  return { id: `usr_${data.ma_tk}`, name: data.ho_ten, email: data.email, phone: data.so_dien_thoai || '',
    gender: meta.gender, birthday: meta.birthday,
    role: normalizeRole(data.role), status: 'active' as const, addresses: Array.isArray(addresses) ? addresses : [],
    createdAt: data.ngay_tao?.split('T')[0] || '', authProvider: 'local' as const, hasCustomPassword: true };
}
export async function signInAccount(client: any, identifier: string, password?: string) {
  if (!identifier.trim() || !password) return null;
  const credentials = identifier.includes('@') ? { email: identifier.trim(), password } : { phone: identifier.trim(), password };
  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error || !data?.session) return null;
  const account = await authenticatedAccount(client);
  if (!account) await client.auth.signOut();
  return account;
}
