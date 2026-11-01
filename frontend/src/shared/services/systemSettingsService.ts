import { supabase } from './supabaseClient';

export interface SystemSettingsState {
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  defaultRole: 'customer';
  requireAdminApprovalInternal: boolean;
  mfaRequired: boolean;
  minPasswordLength: number;
  maxFailedLogins: number;
  lockoutDurationMinutes: number;
  idleTimeoutMinutes: number;
  maxConcurrentSessions: number;
  revokeSessionsOnPasswordChange: boolean;
  securityAlertsEmail: boolean;
  roleChangeNotification: boolean;
  dailyDigestTime: string;
  adminNotificationEmail?: string;
}

export const defaultSystemSettings: SystemSettingsState = {
  allowRegistration: true,
  requireEmailVerification: true,
  defaultRole: 'customer',
  requireAdminApprovalInternal: true,
  mfaRequired: true,
  minPasswordLength: 8,
  maxFailedLogins: 5,
  lockoutDurationMinutes: 15,
  idleTimeoutMinutes: 30,
  maxConcurrentSessions: 3,
  revokeSessionsOnPasswordChange: true,
  securityAlertsEmail: true,
  roleChangeNotification: true,
  dailyDigestTime: '09:00',
  adminNotificationEmail: 'security@curveconfidence.vn',
};

let cachedSettings: SystemSettingsState = { ...defaultSystemSettings };

export const getSystemSettings = (): SystemSettingsState => {
  return cachedSettings;
};

export const fetchSystemSettingsFromSupabase = async (): Promise<SystemSettingsState> => {
  try {
    const { data, error } = await supabase.rpc('cc_manage_system_settings', { p_action: 'get' });
    if (!error && data && typeof data === 'object') {
      cachedSettings = { ...defaultSystemSettings, ...data };
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('curve_system_settings_updated', { detail: cachedSettings }));
      }
      return cachedSettings;
    }
  } catch (err) {
    console.warn('⚠️ Lỗi tải cấu hình hệ thống từ Supabase Cloud:', err);
  }
  return cachedSettings;
};

export const saveSystemSettings = async (settings: SystemSettingsState): Promise<SystemSettingsState> => {
  try {
    const { data, error } = await supabase.rpc('cc_manage_system_settings', {
      p_action: 'set',
      p_settings: settings
    });
    if (error) throw error;
    cachedSettings = { ...defaultSystemSettings, ...(data || settings) };
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('curve_system_settings_updated', { detail: cachedSettings }));
    }
    return cachedSettings;
  } catch (err) {
    console.error('Lỗi lưu cấu hình hệ thống vào Supabase Cloud:', err);
    throw err;
  }
};

export const resetSystemSettings = async (): Promise<SystemSettingsState> => {
  return saveSystemSettings(defaultSystemSettings);
};

// Tự động tải từ Supabase Cloud và lắng nghe Realtime khi tải trang
if (typeof window !== 'undefined' && !(window as any).__curveSystemSettingsSubscribed) {
  (window as any).__curveSystemSettingsSubscribed = true;
  void fetchSystemSettingsFromSupabase();
  try {
    const existing = supabase.getChannels().find((c) => c.topic.includes('system_settings'));
    if (existing) {
      void supabase.removeChannel(existing);
    }
    supabase
      .channel('realtime:system_settings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cc_admin_account_events' },
        (payload: any) => {
          if (payload?.new?.action === 'system_settings' && payload?.new?.after_state) {
            cachedSettings = { ...defaultSystemSettings, ...payload.new.after_state };
            window.dispatchEvent(new CustomEvent('curve_system_settings_updated', { detail: cachedSettings }));
          }
        }
      )
      .subscribe();
  } catch {}
}
