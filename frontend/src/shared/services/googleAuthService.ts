/**
 * Google Authentication Service (Độc lập - Không làm xáo trộn code khác)
 * Hỗ trợ:
 * 1. Đăng nhập Google thật qua Supabase OAuth (Khuyên dùng cho đồ án)
 * 2. Đăng nhập Google qua Google Identity Services (Client-side One Tap / Popup)
 * 3. Safe Fallback: Tự động chuyển sang chế độ tài khoản mô phỏng khi chưa điền API Key hoặc khi offline
 */

import { supabase } from './supabaseClient';
import { UserAccount } from '@/types';
import { normalizeRole } from '../utils/roleUtils';

// 1. Cấu hình Google Client ID từ biến môi trường (hoặc fallback mặc định của dự án)
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '261796253641-dourh0joue04sf2oafe4nb203aggir0b.apps.googleusercontent.com';

/**
 * Kiểm tra xem Google OAuth thật đã được cấu hình hay chưa
 */
export const isGoogleConfigured = (): boolean => {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.trim().length > 10);
};

export interface GoogleUserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

/**
 * Danh sách tài khoản Google mẫu phục vụ chấm bài / kiểm thử khi chưa gắn Google API thật
 */
export const MOCK_GOOGLE_ACCOUNTS: GoogleUserProfile[] = [
  {
    id: 'google_user_01',
    name: 'Trần Đình Minh (Google)',
    email: 'trandinhminh.dev@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'google_user_02',
    name: 'Nguyễn Thị Lan (Google)',
    email: 'lan.nguyen@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'google_user_03',
    name: 'Khách Hàng Mới (Google)',
    email: 'khachmoi.google@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
  },
];

/**
 * Chuyển đổi dữ liệu tài khoản Google thành định dạng UserAccount chuẩn của hệ thống
 */
export const mapGoogleProfileToUserAccount = (profile: GoogleUserProfile): UserAccount => {
  return {
    id: `usr_google_${profile.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
    name: profile.name,
    email: profile.email.toLowerCase(),
    phone: '',
    role: normalizeRole('customer', profile.email, profile.name),
    status: 'active',
    avatar: profile.avatar || '',
    createdAt: new Date().toISOString().split('T')[0],
    addresses: [],
  };
};

/**
 * PHƯƠNG ÁN 1 (KHUYÊN DÙNG): Đăng nhập Google thật thông qua Supabase OAuth
 * Tự động chuyển hướng đến màn hình đăng nhập Google và quay trở về website
 */
export const signInWithSupabaseGoogle = async (
  redirectToUrl = window.location.origin
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectToUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.warn('⚠️ Supabase Google OAuth error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('❌ Google OAuth exception:', err?.message || err);
    return { success: false, error: err?.message || 'Lỗi không xác định khi kết nối Google' };
  }
};

/**
 * Lắng nghe và kiểm tra phiên đăng nhập Google sau khi trình duyệt chuyển hướng về
 */
export const checkGoogleAuthRedirectSession = async (): Promise<UserAccount | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) {
      return null;
    }

    const { user } = session;
    const profile: GoogleUserProfile = {
      id: user.id,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Người dùng Google',
      email: user.email || '',
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
    };

    return mapGoogleProfileToUserAccount(profile);
  } catch (err) {
    console.warn('⚠️ Could not extract Google session:', err);
    return null;
  }
};

/**
 * Đăng xuất tài khoản Google khỏi phiên làm việc
 */
export const signOutGoogle = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('⚠️ Error signing out from Google/Supabase:', err);
  }
};

/**
 * PHƯƠNG ÁN 1 (CHUYÊN NGHIỆP NHẤT): Đăng nhập Google One-Tap / Popup chính hãng qua Google Identity Services (GIS)
 * Tuyệt đối không rời trang web, không lộ domain trung gian supabase.co, không bị văng sang port khác
 */
export const signInWithGoogleIdToken = async (
  idToken: string
): Promise<{ success: boolean; error?: string; user?: any }> => {
  try {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      console.warn('⚠️ Supabase signInWithIdToken error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (err: any) {
    console.error('❌ Exception in signInWithGoogleIdToken:', err?.message || err);
    return { success: false, error: err?.message || 'Lỗi kết nối khi xác thực ID Token Google' };
  }
};

/**
 * Giải mã thông tin người dùng từ Google ID Token JWT (không cần thư viện ngoài)
 */
export const parseGoogleJwt = (
  token: string
): { name?: string; email?: string; picture?: string; sub?: string } => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
};

/**
 * Xuất đối tượng GoogleAuthService duy nhất để dễ dàng import ở bất kỳ đâu
 */
export const googleAuthService = {
  clientId: GOOGLE_CLIENT_ID,
  isConfigured: isGoogleConfigured,
  mockAccounts: MOCK_GOOGLE_ACCOUNTS,
  signInWithOAuth: signInWithSupabaseGoogle,
  signInWithIdToken: signInWithGoogleIdToken,
  parseJwt: parseGoogleJwt,
  checkSession: checkGoogleAuthRedirectSession,
  mapProfileToUser: mapGoogleProfileToUserAccount,
  signOut: signOutGoogle,
};
