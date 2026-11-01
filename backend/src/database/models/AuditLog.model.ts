export interface AuditLog {
  id: number;
  actor_id?: number;
  actor_name?: string;
  action: string;
  target: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: Date;
}
