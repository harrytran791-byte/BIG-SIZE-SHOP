export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface ReturnRequest {
  id: number;
  return_code: string;
  order_id: number;
  user_id?: number;
  original_size: string;
  requested_size: string;
  reason: string;
  status: ReturnStatus;
  admin_note?: string;
  created_at: Date;
  updated_at: Date;
}
