import { Order } from '@/types';
import { supabase } from '@/shared/services/supabaseClient';

const INVOICED_STORAGE_KEY = 'curve_invoiced_orders';

export const emailService = {
  /**
   * Kiểm tra xem đơn hàng đã được gửi hóa đơn điện tử hay chưa (tránh gửi lặp)
   */
  isOrderInvoiced(orderId: string): boolean {
    try {
      const saved = localStorage.getItem(INVOICED_STORAGE_KEY);
      const list: string[] = saved ? JSON.parse(saved) : [];
      return list.includes(orderId);
    } catch {
      return false;
    }
  },

  /**
   * Đánh dấu đơn hàng đã được gửi hóa đơn
   */
  markOrderAsInvoiced(orderId: string): void {
    try {
      const saved = localStorage.getItem(INVOICED_STORAGE_KEY);
      const list: string[] = saved ? JSON.parse(saved) : [];
      if (!list.includes(orderId)) {
        list.push(orderId);
        localStorage.setItem(INVOICED_STORAGE_KEY, JSON.stringify(list));
      }
    } catch {}
  },

  /**
   * Gửi hóa đơn điện tử qua API /api/send-invoice
   */
  async sendOrderInvoice(
    order: Order,
    recipientEmail?: string,
    recipientName?: string,
    forceResend?: boolean
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const emailToSend = (recipientEmail || order.invoiceEmail || order.shippingAddress?.email || '').trim();
    if (!emailToSend || !emailToSend.includes('@')) {
      return { success: false, error: 'Địa chỉ email người nhận không hợp lệ' };
    }

    if (!forceResend && this.isOrderInvoiced(order.id)) {
      return { success: true, messageId: 'already_invoiced', error: 'Hóa đơn cho đơn hàng này đã được gửi trước đó.' };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order,
          recipientEmail: emailToSend.trim(),
          recipientName: recipientName || order.shippingAddress.fullName,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        this.markOrderAsInvoiced(order.id);
        return { success: true, messageId: data.messageId };
      }

      return { success: false, error: data.error || 'Máy chủ không thể gửi email' };
    } catch (err: any) {
      console.warn('⚠️ Lỗi khi gọi API gửi hóa đơn:', err);
      return { success: false, error: err?.message || 'Lỗi mạng khi kết nối máy chủ gửi mail' };
    }
  },
};
